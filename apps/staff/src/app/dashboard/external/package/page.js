'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getPackageNavItems } from '@/data/observations';
import { useLanguage } from '@/context/LanguageContext';

export default function ExternalPackagePage() {
  const { t } = useLanguage();
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
          <h1>{t('package_title')}</h1>
          <p>{t('package_desc')}</p>
        </div>
        <Link href={`${basePath}/form-booking`} className="btn btn-primary" style={{ background: '#7c3aed', textDecoration: 'none' }}>
          {t('package_form_booking')}
        </Link>
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">{t('package_service_title')}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('package_service_count').replace('{count}', serviceItems.length)}</span>
        </div>

        <div className="package-service-list">
          {serviceItems.map((item) => (
            <Link key={item.slug} href={`${basePath}/observations/${item.slug}`} className="package-service-row">
              <span className="package-service-icon">{item.icon}</span>
              <span className="package-service-main">
                <strong>{item.title}</strong>
                {item.inclusions && <small>{t('package_including')}: {item.inclusions}</small>}
              </span>
              <span className="package-service-meta">{item.price || t('package_upon_request')}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
