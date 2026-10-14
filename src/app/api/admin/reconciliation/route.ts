import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { runPaymentReconciliation } from '@/lib/reconciliation';

export async function POST() {
  try {
    const admin = await getAuthUser();
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'AUDITOR')) {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const report = await runPaymentReconciliation(admin.id);

    return NextResponse.json({
      success: true,
      message: 'Reconciliation run completed successfully',
      report,
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to run reconciliation process' },
      { status: 500 }
    );
  }
}
