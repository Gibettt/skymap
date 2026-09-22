import { requireStaffContext } from "@/lib/staff-access";

import { SettingsPanel } from "./_components/settings-panel";

export default async function SettingsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role);

  return (
    <SettingsPanel
      account={{
        name: context.user.name,
        email: context.user.email,
        role: context.role,
        resortName: context.user.resort_name ?? null,
        resortCode: context.user.resort_code ?? null,
        resortLocation: context.user.resort_location ?? null,
        accessRoleName: context.user.access_role_name ?? null,
        accessRoleLevel: context.user.access_role_level ?? null,
      }}
      readOnly={context.readOnly}
      canManageSkySettings={context.role === "internal" && context.permissions.includes("staff.sky_guide")}
      canManagePublicProfile={
        context.role === "internal" && context.permissions.includes("staff.resort_profile")
      }
    />
  );
}
