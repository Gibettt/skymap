import { getPackageResortOptions, getPackageTypes, getPackages } from "../_lib/admin-data";
import { Packages } from "./_components/packages";

export default async function PackagesPage() {
  const [packages, resorts, packageTypes] = await Promise.all([
    getPackages(),
    getPackageResortOptions(),
    getPackageTypes(),
  ]);
  const resortOptions = resorts.map((resort) => ({ id: resort.id, name: resort.name }));

  return <Packages packages={packages} resorts={resortOptions} initialPackageTypes={packageTypes} />;
}
