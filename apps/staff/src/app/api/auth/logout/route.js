import { assertSameOrigin, createLogoutHandler, currentUser, jsonError } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

const logout = createLogoutHandler();

export async function POST(request) {
  try {
    await assertSameOrigin(request, { requireOrigin: true });
  } catch (error) {
    return jsonError(error);
  }

  try {
    const user = await currentUser();
    if (user) {
      await query('UPDATE users SET last_seen_at = NULL WHERE id = $1', [user.id]);
    }
  } catch {
    // Cookie tetap harus dibersihkan bila database presence tidak tersedia.
  }
  return logout(request);
}
