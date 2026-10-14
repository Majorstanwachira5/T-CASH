/**
 * Validates critical environment variables at application startup
 * NEVER prints secret values to console or error logs.
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const requiredVars = [
    { key: 'DATABASE_URL', isSecret: true },
    { key: 'JWT_SECRET', isSecret: true },
    { key: 'NEXT_PUBLIC_APP_URL', isSecret: false },
  ];

  for (const item of requiredVars) {
    const val = process.env[item.key];
    if (!val || val.trim().length === 0) {
      errors.push(`Missing required environment variable: ${item.key}`);
    } else if (item.key === 'JWT_SECRET' && val.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters for cryptographic strength');
    }
  }

  // Check Supabase config
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Run initial validation check
if (process.env.NODE_ENV !== 'test') {
  const check = validateEnvironment();
  if (!check.isValid) {
    console.warn('⚠️ Environment Validation Warnings:', check.errors.join('; '));
  }
}
