import type { StaffRole } from "@/lib/staff-access";

import type { StaffOverviewData } from "../_lib/overview-data";
import { ExternalStaffOverview } from "./external-staff-overview";
import { InternalStaffOverview } from "./internal-staff-overview";

type Props = {
  role: StaffRole;
  permissions: string[];
  data: StaffOverviewData;
  userName: string;
  resortName: string | null;
};

export function StaffOverview({ role, permissions, data, userName, resortName }: Props) {
  if (role === "external") {
    return <ExternalStaffOverview data={data} userName={userName} resortName={resortName} />;
  }

  return <InternalStaffOverview data={data} permissions={permissions} userName={userName} resortName={resortName} />;
}
