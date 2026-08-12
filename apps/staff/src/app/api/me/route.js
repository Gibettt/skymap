import { currentUser, jsonError } from '@ephemeris/auth';

export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
