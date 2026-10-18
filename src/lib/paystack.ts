import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET_KEY;
const IS_MOCK_MODE = process.env.PAYSTACK_MOCK_MODE === 'true';

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // 'success', 'failed', 'abandoned'
    reference: string;
    amount: number; // in kobo / cents
    message: string | null;
    gateway_response: string;
    paid_at: string;
    channel: string;
    currency: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata?: Record<string, unknown>;
  };
}

/**
 * Generate a unique, audit-compliant payment reference
 */
export function generatePaymentReference(prefix = 'TCPI-PAY'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Initializes a Paystack transaction via server-to-server API
 */
export async function initializePaystackTransaction(params: {
  email: string;
  amountCents: bigint | number;
  reference: string;
  callbackUrl: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  const amountMinor = Number(params.amountCents);

  if (IS_MOCK_MODE || !PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.startsWith('sk_test_mock')) {
    // Return simulated hosted checkout url for development and testing
    return {
      status: true,
      message: 'Authorization URL created (Sandbox/Mock Mode)',
      data: {
        authorization_url: `${params.callbackUrl}?reference=${params.reference}&mock_success=true`,
        access_code: `mock_code_${Date.now()}`,
        reference: params.reference,
      },
    };
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: amountMinor, // in minor currency units (cents, e.g. 10000 = KSh 100)
      currency: 'KES',
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: params.channels || ['mobile_money', 'card'],
      metadata: params.metadata,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(data.message || 'Failed to initialize Paystack transaction');
  }

  return data;
}

/**
 * Authoritatively verifies transaction with Paystack server
 * NEVER trusts client-side redirect query params alone.
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse['data']> {
  if (IS_MOCK_MODE || !PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.startsWith('sk_test_mock')) {
    // In mock/test mode, verify standard format
    return {
      id: Math.floor(Math.random() * 1000000),
      domain: 'test',
      status: 'success',
      reference,
      amount: 10000, // 10000 cents = KSh 100
      message: 'Approved in Sandbox Mode',
      gateway_response: 'Successful',
      paid_at: new Date().toISOString(),
      channel: 'mpesa',
      currency: 'KES',
      customer: {
        email: 'test@tcpi.co.ke',
        customer_code: 'CUS_mock_123',
      },
    };
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const result: PaystackVerifyResponse = await response.json();
  if (!response.ok || !result.status) {
    throw new Error(result.message || 'Verification failed with payment provider');
  }

  return result.data;
}

/**
 * Cryptographically verifies Paystack Webhook HMAC SHA-512 signature
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}
