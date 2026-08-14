import { jsonError, requireUser } from '@ephemeris/auth';

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
