import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^(?:\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678)')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  ageConsent: z.boolean().refine((val) => val === true, {
    message: 'You must confirm that you are 18 years or older and accept official game rules',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const gamePlaySchema = z.object({
  paymentMethod: z.enum(['WALLET', 'PAYSTACK', 'REPEAT_CREDIT']),
  paymentReference: z.string().optional(),
  idempotencyKey: z.string().min(8, 'Idempotency key required'),
});

export const updateGameConfigSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(3),
  entryPriceKsh: z.number().min(1),
  repeatCreditKsh: z.number().min(0.5),
  prizeAmountKsh: z.number().min(100),
  totalPositions: z.number().int().min(10).max(10),
  numberMin: z.number().int().min(1),
  numberMax: z.number().int().max(999),
  isUniqueRequired: z.boolean(),
  targetNumbers: z.array(z.number().int()).length(10, 'Must have exactly 10 target numbers'),
  isPublished: z.boolean(),
  isActive: z.boolean(),
});

export const paymentInitSchema = z.object({
  amountKsh: z.number().min(10),
  purpose: z.enum(['GAME_ENTRY', 'WALLET_DEPOSIT', 'REPEAT_CREDIT']),
  idempotencyKey: z.string().min(8),
});

export const KENYAN_REGIONS = [
  'Nairobi',
  'Coast',
  'Central',
  'Rift Valley',
  'Western',
  'Eastern',
  'Nyanza',
  'North Eastern',
] as const;

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, 'Comment must be at least 3 characters')
    .max(500, 'Comment cannot exceed 500 characters'),
  authorAlias: z
    .string()
    .trim()
    .min(2, 'Alias must be at least 2 characters')
    .max(30, 'Alias cannot exceed 30 characters')
    .optional(),
  category: z.enum([
    'PLAYER_EXPERIENCE',
    'CONFIRMED_WIN',
    'LOSS_REPORTED',
    'SUGGESTION',
    'QUESTION',
  ]),
  region: z.enum(KENYAN_REGIONS).optional().or(z.literal('')),
});

export const reportCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  reason: z
    .string()
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(200, 'Reason cannot exceed 200 characters'),
});
