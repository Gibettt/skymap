'use client';

import { useState, useCallback } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { ALERTS } from '@/data/alerts';
import { BOOKINGS } from '@/data/bookings';

export default function AdminLayout({ children }) {
  const [newBookingTrigger, setNewBookingTrigger] = useState(0);

  const alertCount = ALERTS.filter(a => a.isOpen).length;
  const bookingCount = BOOKINGS.length;

  const handleNewBooking = useCallback(() => {
    setNewBookingTrigger(n => n + 1);
  }, []);

  return (
    <div className="app-layout">
      <AdminSidebar alertCount={alertCount} bookingCount={bookingCount} />
      <div className="main-content">
        <AdminHeader onNewBooking={handleNewBooking} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
