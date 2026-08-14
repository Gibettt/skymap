'use client';

import React, { useState, useCallback, useEffect } from 'react';
import StaffSidebar from '@/components/StaffSidebar';
import StaffHeader from '@/components/StaffHeader';
import { BOOKINGS } from '@/data/bookings';

export default function ExternalStaffLayout({ children }) {
  const observerName = 'Budi Santoso';
  const bookingCount = BOOKINGS.filter(b => b.observer === observerName).length;
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

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="app-layout external-compact-layout">
      <StaffSidebar role="External" bookingCount={bookingCount} isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <StaffHeader role="External" bookingCount={bookingCount} onMenuToggle={toggleSidebar} />
        <main className="page-content fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
