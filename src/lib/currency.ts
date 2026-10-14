/**
 * Kenya Shillings Currency Utilities
 * Financial amounts are stored strictly as integer minor currency units (cents).
 * 1 KES = 100 cents. Floating-point arithmetic is never used for balance calculation.
 */

export function centsToKsh(cents: bigint | number | string): number {
  const num = typeof cents === 'bigint' ? Number(cents) : Number(cents || 0);
  return num / 100;
}

export function kshToCents(ksh: number): bigint {
  return BigInt(Math.round(ksh * 100));
}

export function formatKsh(cents: bigint | number | string): string {
  const ksh = centsToKsh(cents);
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(ksh)
    .replace('KES', 'KSh');
}

export function formatKshPlain(cents: bigint | number | string): string {
  const ksh = centsToKsh(cents);
  return `KSh ${ksh.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
