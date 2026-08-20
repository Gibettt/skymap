import { insertNotification } from './notification.js';

export async function handlePayoutRequested(payload, { client, query }) {
  const db = client || { query };
  const { payoutId, requesterId, requesterName, requesterRole, amountUsd, resortName } = payload;

  try {
    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
    );

    const title = `Payout staff ${requesterRole === 'internal' ? 'Internal' : 'External'}`;
    const formattedAmount = Number(amountUsd || 0).toFixed(2);
    const message = `${requesterName || 'Staff'} meminta pencairan $${formattedAmount}`;
    const meta = resortName || (requesterRole === 'internal' ? 'Internal observatorium' : 'Resort');

    for (const admin of admins) {
      await insertNotification(db, {
        recipientUserId: admin.id,
        type: 'payout',
        sourceTable: 'payout_requests',
        sourceId: payoutId,
        title,
        message,
        meta,
        link: '/dashboard/admin/keuangan?tab=pencairan',
      });
    }
  } catch (err) {
    console.error('[events:payout:requested] Error processing payout.requested event:', err);
  }
}

export async function handlePayoutReviewed(payload, { client, query }) {
  const db = client || { query };
  const { payoutId, requesterId, status, amountUsd, requesterRole } = payload;

  if (!requesterId) return;

  try {
    const formattedAmount = Number(amountUsd || 0).toFixed(2);
    const statusLabel = status === 'completed' ? 'Telah Dicairkan' : (status === 'processed' ? 'Sedang Diproses' : 'Ditolak');
    const title = `Permintaan Payout ${statusLabel}`;
    const message = `Pencairan komisi sebesar $${formattedAmount} ${statusLabel.toLowerCase()}`;
    const targetLink = requesterRole === 'external' ? '/dashboard/external/payout' : '/dashboard/internal/payout';

    await insertNotification(db, {
      recipientUserId: requesterId,
      type: 'payout',
      sourceTable: 'payout_requests',
      sourceId: payoutId,
      title,
      message,
      meta: `Status: ${status}`,
      link: targetLink,
    });
  } catch (err) {
    console.error('[events:payout:reviewed] Error processing payout review event:', err);
  }
}
