import { getUserPermissions, jsonError, requireUser } from "@ephemeris/auth";

export async function GET() {
  try {
    const user = await requireUser(["internal", "external"]);
    const permissions = await getUserPermissions(user);
    return Response.json({ user, permissions });
  } catch (error) {
    return jsonError(error);
  }
}
