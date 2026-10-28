import { getCalendarOptions } from "../_lib/admin-data";
import { SkyGuide } from "./_components/sky-guide";

export default async function SkyGuidePage() {
  const options = await getCalendarOptions();
  return <SkyGuide resorts={options.resorts.map((resort) => ({ id: resort.id, name: resort.name }))} />;
}
