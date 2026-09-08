import { getPackageResortOptions, getPackages } from "../_lib/admin-data";
import { Packages } from "./_components/packages";

export default async function PackagesPage() {
  const [packages, resorts] = await Promise.all([getPackages(), getPackageResortOptions()]);
  const resortOptions = resorts.map((resort) => ({ id: resort.id, name: resort.name }));

  return <Packages packages={packages} resorts={resortOptions} />;
}
