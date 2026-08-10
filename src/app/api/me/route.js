import { currentUser, jsonError } from '@/lib/auth';

export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
