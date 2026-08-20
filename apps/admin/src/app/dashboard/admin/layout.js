'use client';

import { useState, useCallback, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import { ALERTS } from '@/data/alerts';
import { useBookingsQuery } from '@/lib/apiQueries';

export default function AdminLayout({ children }) {
  const { data: bookings = [] } = useBookingsQuery();
  const [newBookingTrigger, setNewBookingTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Close sidebar by default on mobile screens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const alertCount = ALERTS.filter(a => a.isOpen).length;
  const bookingCount = bookings.length;

  const handleNewBooking = useCallback(() => {
    setNewBookingTrigger(n => n + 1);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="app-layout">
      <AdminSidebar alertCount={alertCount} bookingCount={bookingCount} isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <AdminHeader onNewBooking={handleNewBooking} onMenuToggle={toggleSidebar} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
