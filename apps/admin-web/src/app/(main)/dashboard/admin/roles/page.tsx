import { getAccessRolesData } from "@/lib/access-roles";

import { Roles } from "../../roles/_components/roles";

export default async function RolesPage() {
  const data = await getAccessRolesData();
  return <Roles roles={data.roles} permissions={data.permissions} members={data.members} readOnly={data.readOnly} />;
}
