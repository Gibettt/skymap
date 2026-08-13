'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getPackageNavItems } from '@/data/observations';

export default function ExternalPackagePage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith('/dashboard/internal') ? '/dashboard/internal' : '/dashboard/external';
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/packages')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (alive) setPackages(data?.packages || []);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const serviceItems = useMemo(() => getPackageNavItems(packages), [packages]);

  return (
    <div className="fade-in-up">
      <div className="form-booking-toolbar">
        <div>
          <h1>Package</h1>
          <p>Pilih service/package yang ingin dilihat atau digunakan untuk booking.</p>
        </div>
        <Link href={`${basePath}/form-booking`} className="btn btn-primary" style={{ background: '#7c3aed', textDecoration: 'none' }}>
          Form Booking
        </Link>
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Service Package</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{serviceItems.length} service</span>
        </div>

        <div className="package-service-list">
          {serviceItems.map((item) => (
            <Link key={item.slug} href={`${basePath}/observations/${item.slug}`} className="package-service-row">
              <span className="package-service-icon">{item.icon}</span>
              <span className="package-service-main">
                <strong>{item.title}</strong>
              </span>
              <span className="package-service-meta">{item.price || 'Upon request'}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
