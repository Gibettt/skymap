'use client';

import React, { useState, useCallback, useEffect } from 'react';
import StaffSidebar from '@/components/StaffSidebar';
import StaffHeader from '@/components/StaffHeader';

export default function ExternalStaffLayout({ children }) {
  const [bookingCount, setBookingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/bookings')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Failed to load booking count.')))
      .then((data) => {
        if (alive) setBookingCount(Array.isArray(data.bookings) ? data.bookings.length : 0);
      })
      .catch(() => {
        if (alive) setBookingCount(0);
      });
    return () => {
      alive = false;
    };
  }, []);

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
