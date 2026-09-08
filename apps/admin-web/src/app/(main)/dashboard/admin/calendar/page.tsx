import { Calendar } from "./_components/calendar";
import { getCalendarOptions } from "../_lib/admin-data";

export default async function CalendarPage() {
  const options = await getCalendarOptions();

  return <Calendar options={options} />;
}
