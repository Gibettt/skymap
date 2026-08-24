export const OPEN_BOOKING_STATUSES = Object.freeze(['pending', 'active', 'rescheduled']);

const STAFF_ROLES = new Set(['internal', 'external']);

export function resortCoverageStatus({ resortStatus, activeInternalCount, activeExternalCount }) {
  if (resortStatus !== 'active') return 'inactive';

  const hasInternal = Number(activeInternalCount) > 0;
  const hasExternal = Number(activeExternalCount) > 0;
  if (hasInternal && hasExternal) return 'ready';
  if (!hasInternal && !hasExternal) return 'needs_both';
  return hasInternal ? 'needs_external' : 'needs_internal';
}

export function coverageRoleRemoved(before, after) {
  if (!before?.resort_id || before.status !== 'active' || !STAFF_ROLES.has(before.role)) return null;

  const keepsCoverage = after?.status === 'active'
    && after.role === before.role
    && after.resortId === before.resort_id;

  return keepsCoverage ? null : before.role;
}
