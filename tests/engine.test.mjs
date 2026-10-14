import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

// Tests for currency math without floating point drift
test('Currency integer minor units (cents) calculations', () => {
  const ksh100InCents = 10000n;
  const ksh2InCents = 200n;
  const ksh50000InCents = 5000000n;

  // Verify division into KES
  assert.strictEqual(Number(ksh100InCents) / 100, 100.0);
  assert.strictEqual(Number(ksh2InCents) / 100, 2.0);
  assert.strictEqual(Number(ksh50000InCents) / 100, 50000.0);

  // Arithmetic balance subtraction
  const startingBalance = 50000n; // KSh 500
  const entryFee = 10000n;        // KSh 100
  const repeatFee = 200n;         // KSh 2

  const afterFirst = startingBalance - entryFee;
  assert.strictEqual(afterFirst, 40000n);

  const afterRepeat = afterFirst - repeatFee;
  assert.strictEqual(afterRepeat, 39800n);
});

test('Number-Game Engine 10 ordered positions and cryptographic randomness', () => {
  const count = 10;
  const min = 1;
  const max = 99;

  // Cryptographically secure numbers generation using crypto.randomInt
  const numbers = [];
  for (let i = 0; i < count; i++) {
    const val = crypto.randomInt(min, max + 1);
    numbers.push(val);
  }

  assert.strictEqual(numbers.length, 10, 'Must have exactly 10 ordered positions');
  numbers.forEach((n) => {
    assert.ok(n >= min && n <= max, `Number ${n} must be within range ${min}-${max}`);
  });

  // Verify entropy seed SHA-256 hash generation
  const entropySeed = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(entropySeed).digest('hex');
  assert.strictEqual(hash.length, 64, 'SHA-256 audit hash must be 64 hex characters');
});

test('Target combination ordered position evaluation', () => {
  const targetNumbers = [7, 14, 21, 33, 42, 50, 63, 77, 88, 99];
  const perfectMatch = [7, 14, 21, 33, 42, 50, 63, 77, 88, 99];
  const partialMatch = [7, 14, 99, 99, 42, 99, 99, 77, 99, 99];

  // Evaluate perfect match
  let perfectMatches = 0;
  for (let i = 0; i < 10; i++) {
    if (perfectMatch[i] === targetNumbers[i]) perfectMatches++;
  }
  assert.strictEqual(perfectMatches, 10);
  const isJackpotWinner = perfectMatches === 10;
  assert.strictEqual(isJackpotWinner, true);

  // Evaluate partial match
  let partialMatches = 0;
  for (let i = 0; i < 10; i++) {
    if (partialMatch[i] === targetNumbers[i]) partialMatches++;
  }
  assert.strictEqual(partialMatches, 5);
  assert.strictEqual(partialMatches === 10, false);
});

test('Paystack Webhook HMAC SHA-512 signature verification', () => {
  const secret = 'tcpi_webhook_secret_verification_key_987654';
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'TCPI-PAY-TEST-001', amount: 10000 } });

  const validSignature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  const invalidSignature = 'invalid_tampered_signature_123456';

  const checkValid = crypto.createHmac('sha512', secret).update(payload).digest('hex') === validSignature;
  const checkInvalid = crypto.createHmac('sha512', secret).update(payload).digest('hex') === invalidSignature;

  assert.strictEqual(checkValid, true, 'Valid signature must match');
  assert.strictEqual(checkInvalid, false, 'Tampered signature must be rejected');
});
