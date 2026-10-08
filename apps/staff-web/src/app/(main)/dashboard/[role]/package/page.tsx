import { requireStaffContext } from "@/lib/staff-access";
import { getPackageResortOptions, getPackageTypes, getPackages } from "../../admin/_lib/admin-data";
import { StaffPackages } from "./_components/staff-packages";

export default async function PackagesPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.bookings");

  const [packages, resorts, packageTypes] = await Promise.all([
    getPackages(),
    getPackageResortOptions(),
    getPackageTypes(),
  ]);
  const resortOptions = resorts.map((resort) => ({ id: resort.id, name: resort.name }));

  return (
    <StaffPackages
      role={context.role}
      user={context.user}
      packages={packages}
      resorts={resortOptions}
      packageTypes={packageTypes}
    />
  );
}
