/**
 * Central booking-scope rules shared by API routes.
 * SQL fragments are constants; only values are parameterized by callers.
 */
export function bookingScopeForUser(user, alias = 'b') {
  if (user?.role === 'admin') {
    return { whereClause: '1=1', values: [] };
  }

  if (user?.role === 'internal') {
    if (!user.resort_id) throw new Error('Internal staff resort is not configured');
    return { whereClause: `${alias}.resort_id = $1`, values: [user.resort_id] };
  }

  if (user?.role === 'external') {
    if (!user.id) throw new Error('External user id is not configured');
    return { whereClause: `${alias}.staff_id = $1`, values: [user.id] };
  }

  throw new Error('Unsupported user role');
}

export function canViewBooking(user, booking) {
  if (user?.role === 'admin') return true;
  if (user?.role === 'internal') {
    return Boolean(user.resort_id && booking?.resort_id === user.resort_id);
  }
  if (user?.role === 'external') {
    return Boolean(user.id && booking?.staff_id === user.id);
  }
  return false;
}

export function canManageBooking(user, booking) {
  if (user?.role === 'admin') return true;
  if (user?.role === 'internal') {
    return Boolean(user.resort_id && booking?.resort_id === user.resort_id);
  }
  return false;
}

export const canRescheduleBooking = canManageBooking;
