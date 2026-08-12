import StaffSidebar from '@/components/StaffSidebar';
import StaffHeader from '@/components/StaffHeader';
import { BOOKINGS } from '@/data/bookings';

export default function InternalLayout({ children }) {
  const bookingCount = BOOKINGS.length;

  return (
    <div className="app-layout external-compact-layout">
      <StaffSidebar role="Internal" bookingCount={bookingCount} />
      <div className="main-content">
        <StaffHeader role="Internal" bookingCount={bookingCount} />
        <main className="page-content fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
