'use client';

import React, { useState } from 'react';
import StaffSidebar from '@/components/StaffSidebar';
import StaffHeader from '@/components/StaffHeader';
import { BOOKINGS } from '@/data/bookings';

export default function ExternalStaffLayout({ children }) {
  const [newBookingTrigger, setNewBookingTrigger] = useState(0);

  const observerName = 'Budi Santoso';
  const bookingCount = BOOKINGS.filter(b => b.observer === observerName).length;

  return (
    <div className="app-layout external-compact-layout">
      <StaffSidebar role="External" bookingCount={bookingCount} />
      <div className="main-content">
        <StaffHeader role="External" bookingCount={bookingCount} />
        <main className="page-content fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
