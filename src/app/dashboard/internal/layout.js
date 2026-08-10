'use client';

import { useState } from 'react';
import StaffSidebar from '@/components/StaffSidebar';
import StaffHeader from '@/components/StaffHeader';
import { BOOKINGS } from '@/data/bookings';

export default function InternalLayout({ children }) {
  const [newBookingTrigger, setNewBookingTrigger] = useState(0);

  const bookingCount = BOOKINGS.filter(b => b.observer === 'Ahmad Fauzi').length;

  return (
    <div className="app-layout">
      <StaffSidebar role="Internal" bookingCount={bookingCount} />
      <div className="main-content">
        <StaffHeader role="Internal" />
        <div className="page-content fade-in-up">
          {children}
        </div>
      </div>
    </div>
  );
}
