'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { StaffBookingView } from '@/components/FamilyBookingForm';
import {
  useCurrentUserQuery,
  useStaffBookingsQuery,
  useUpdateStaffBookingMutation,
  queryKeys,
} from '@/lib/apiQueries';


const ROLE_STYLE = {
  internal: {
    color: '#0891b2',
    title: { id: 'Booking Operasional', en: 'Operational Bookings' },
    subtitle: {
      id: 'Kelola seluruh booking operasional khusus resort Anda.',
      en: 'Manage all operational bookings for your assigned resort.',
    },
  },
  external: {
    color: '#7c3aed',
    title: { id: 'Booking Resort', en: 'Resort Bookings' },
    subtitle: {
      id: 'Input booking customer dan pantau booking yang Anda buat.',
      en: 'Submit guest bookings and track bookings you created.',
    },
  },
};

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function statusLabel(status, lang = 'id') {
  const isEn = lang === 'en';
  const labels = {
    pending: isEn ? 'Pending' : 'Menunggu',
    active: isEn ? 'Active' : 'Aktif',
    completed: isEn ? 'Completed' : 'Selesai',
    rejected: isEn ? 'Rejected' : 'Ditolak',
    rescheduled: isEn ? 'Rescheduled' : 'Dijadwalkan ulang',
    cancelled_by_guest: isEn ? 'Cancelled by guest' : 'Dibatalkan tamu',
    cancelled_weather: isEn ? 'Cancelled by weather' : 'Dibatalkan karena cuaca',
  };
  return labels[status] || status;
}

function statusClass(status) {
  const classes = {
    pending: 'tag-pending',
    active: 'tag-confirmed',
    completed: 'tag-completed',
    rejected: 'tag-cancelled',
    rescheduled: 'tag-confirmed',
    cancelled_by_guest: 'tag-cancelled',
    cancelled_weather: 'tag-cancelled',
  };
  return classes[status] || 'tag-pending';
}

function canOperate(booking) {
  return ['active', 'rescheduled'].includes(booking.status);
}

function canToggleSigned(booking) {
  return ['active', 'rescheduled', 'completed'].includes(booking.status);
}

export default function StaffBookingsClient({ role }) {
  const router = useRouter();
  const { language, t, localizeApiError } = useLanguage();
  const queryClient = useQueryClient();
  const config = ROLE_STYLE[role];
  const pageTitle = config.title[language] || config.title.id;
  const pageSubtitle = config.subtitle[language] || config.subtitle.id;

  const { data: user, isLoading: userLoading } = useCurrentUserQuery();
  const { data: rawBookings = [], isLoading: bookingsLoading, error: queryError } = useStaffBookingsQuery();
  const updateMutation = useUpdateStaffBookingMutation();

  const [toast, setToast] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [manageModal, setManageModal] = useState(null);
  const [manageForm, setManageForm] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const loading = userLoading || bookingsLoading;
  const error = localizeApiError(queryError?.message, '');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user && user.role !== role) {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, role, router]);

  useEffect(() => {
    let channel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('ephemeris_sync_channel');
        channel.onmessage = () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
        };
      }
    } catch {
      // ignore
    }

    return () => {
      if (channel) channel.close();
    };
  }, [queryClient]);

  const bookings = useMemo(() => {
    return [...rawBookings].sort((a, b) => {
      const timeA = new Date(a.created_at || a.event_date).getTime();
      const timeB = new Date(b.created_at || b.event_date).getTime();
      return timeB - timeA;
    });
  }, [rawBookings]);

  const totals = useMemo(() => bookings.reduce((acc, booking) => {
    acc.commission += Number(booking.staff_commission_5_usd || 0);
    acc.pending += booking.status === 'pending' ? 1 : 0;
    acc.accepted += ['active', 'rescheduled'].includes(booking.status) ? 1 : 0;
    acc.rejected += booking.status === 'rejected' || booking.status.startsWith('cancelled_') ? 1 : 0;
    acc.invoice += Number(booking.invoice_total_usd || 0);
    acc.finished += booking.status === 'completed' ? 1 : 0;
    acc.signed += booking.signed_by_guest ? 1 : 0;
    acc.internal += booking.staff_role === 'internal' ? 1 : 0;
    acc.external += booking.staff_role === 'external' ? 1 : 0;
    return acc;
  }, { commission: 0, pending: 0, accepted: 0, rejected: 0, invoice: 0, finished: 0, signed: 0, internal: 0, external: 0 }), [bookings]);

  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    if (role === 'internal') {
      if (filterTab === 'pending') {
        list = list.filter((b) => b.status === 'pending');
      } else if (filterTab === 'internal') {
        list = list.filter((b) => b.staff_role === 'internal');
      } else if (filterTab === 'external') {
        list = list.filter((b) => b.staff_role === 'external');
      }
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter((b) =>
        (b.booking_code && b.booking_code.toLowerCase().includes(q)) ||
        (b.package_name && b.package_name.toLowerCase().includes(q)) ||
        (b.guest_name && b.guest_name.toLowerCase().includes(q)) ||
        (b.room_number && String(b.room_number).toLowerCase().includes(q)) ||
        (b.staff_name && b.staff_name.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || a.event_date).getTime();
      const timeB = new Date(b.created_at || b.event_date).getTime();
      return timeB - timeA;
    });
  }, [bookings, role, filterTab, search]);

  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [filterTab, search]);

  const paginatedBookings = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    return filteredBookings.slice((p - 1) * PER_PAGE, p * PER_PAGE);
  }, [filteredBookings, page, totalPages]);


  const updateBooking = async (booking, patch) => {
    try {
      await updateMutation.mutateAsync({ id: booking.id, ...patch });
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('ephemeris_sync_channel');
          channel.postMessage({ type: 'BOOKING_STATUS_UPDATED', bookingId: booking.id, patch });
          channel.close();
        }
      } catch {
        // ignore
      }
      showToast(language === 'en' ? 'Booking status updated.' : 'Status booking berhasil diperbarui.');
      return true;
    } catch (err) {
      showToast(localizeApiError(err.message, language === 'en' ? 'Update failed.' : 'Update gagal.'));
      return false;
    }
  };

  const openManageModal = (type, booking) => {
    setManageModal({ type, booking });
    setManageForm(type === 'schedule' ? {
      eventDate: String(booking.event_date).slice(0, 10),
      timeStart: String(booking.time_start).slice(0, 5),
      timeEnd: String(booking.time_end).slice(0, 5),
      reason: t('reschedule_default_reason'),
    } : {
      guestName: booking.guest_name || '',
      guestPhone: booking.guest_phone || '',
      guestEmail: booking.guest_email || '',
      roomNumber: booking.room_number || '',
      nationality: booking.nationality || '',
      adultCount: Number(booking.adult_count || 0),
      childCount: Number(booking.child_count || 0),
      notes: booking.notes || '',
    });
  };

  const submitManageAction = async (event) => {
    event?.preventDefault();
    if (!manageModal || actionLoading) return;
    const { type, booking } = manageModal;
    setActionLoading(true);
    try {
      if (type === 'edit') {
        if (!await updateBooking(booking, manageForm)) return;
      } else {
        const response = await fetch(
          type === 'schedule' ? `/api/bookings/${booking.id}/reschedule` : `/api/bookings/${booking.id}`,
          {
            method: type === 'schedule' ? 'POST' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: type === 'schedule' ? JSON.stringify(manageForm) : undefined,
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(localizeApiError(data.error, t('booking_action_failed', 'Aksi booking gagal.')));
          return;
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
        try {
          const channel = new BroadcastChannel('ephemeris_sync_channel');
          channel.postMessage({ type: 'BOOKING_UPDATED', bookingId: booking.id });
          channel.close();
        } catch {}
        showToast(type === 'schedule' ? t('reschedule_success') : t('booking_delete_success', 'Booking berhasil dihapus.'));
      }
      setManageModal(null);
    } catch (error) {
      showToast(localizeApiError(error.message, t('booking_action_failed', 'Aksi booking gagal.')));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal || actionLoading) return;
    setActionLoading(true);
    try {
      await updateBooking(confirmModal.booking, { status: confirmModal.type === 'accept' ? 'active' : 'rejected' });
      setConfirmModal(null);
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <div className="fade-in-up staff-bookings-page">
      <div className="staff-page-heading" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{pageTitle}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{pageSubtitle}</p>
        </div>
        <Link
          href={`/dashboard/${role}/form-booking`}
          className="btn"
          style={{ background: config.color, color: 'white', fontWeight: 700, textDecoration: 'none' }}
        >
          {t('btn_new_booking', '+ Booking Baru')}
        </Link>
      </div>

      <div className="staff-metrics-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MiniCard label={language === 'en' ? 'Total Bookings' : 'Total Booking'} value={bookings.length} />
        <MiniCard label={t('filter_pending_review', 'Pending')} value={totals.pending} />
        <MiniCard label={t('status_accepted', 'Aktif')} value={totals.accepted} />
        <MiniCard label={t('status_finished', 'Selesai')} value={totals.finished} />
      </div>

      <div className="external-booking-note" style={{ marginBottom: 18, borderColor: `${config.color}40`, background: `${config.color}14` }}>
        {role === 'internal'
          ? (language === 'en'
            ? 'All bookings shown here belong to your resort. You can complete, cancel, sign, or reschedule them.'
            : 'Semua booking di sini khusus resort Anda. Anda dapat menyelesaikan, membatalkan, menandatangani, atau menjadwalkan ulang.')
          : (language === 'en'
            ? 'New bookings wait for approval by the internal operations team at your resort.'
            : 'Booking baru menunggu persetujuan staff internal di resort Anda.')}
      </div>

      {error && (
        <div className="card" style={{ padding: 18, marginBottom: 18, color: 'var(--accent)' }}>{error}</div>
      )}

      {/* Search Bar */}
      <div className="staff-list-toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 380, flex: '1 1 280px' }}>
          <input
            type="text"
            className="input"
            placeholder={t('search_booking_placeholder', 'Cari kode booking, nama package, tamu, kamar...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        {search && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSearch('')}
          >
            ✕ {t('clear_search', 'Reset')}
          </button>
        )}
      </div>

      {/* Filter Tabs for Internal Staff */}
      {role === 'internal' && (
        <div className="staff-filter-tabs">
          <button
            type="button"
            className={`staff-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            {t('filter_all', 'Semua Booking')} ({bookings.length})
          </button>
          <button
            type="button"
            className={`staff-filter-tab ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            {t('filter_pending_review', 'Perlu Review')}
            {totals.pending > 0 && <span className="staff-filter-tab-badge">{totals.pending}</span>}
          </button>
          <button
            type="button"
            className={`staff-filter-tab ${filterTab === 'internal' ? 'active' : ''}`}
            onClick={() => setFilterTab('internal')}
          >
            {t('filter_internal', 'Booking Internal')} ({totals.internal})
          </button>
          <button
            type="button"
            className={`staff-filter-tab ${filterTab === 'external' ? 'active' : ''}`}
            onClick={() => setFilterTab('external')}
          >
            {t('filter_external', 'Booking External')} ({totals.external})
          </button>
        </div>
      )}

      <div className="card staff-bookings-card">
        <div className="table-container staff-bookings-table">
          <table>
            <thead>
              <tr>
                <th>{t('common_booking')}</th>
                <th>{t('common_guest')}</th>
                <th>{t('common_package')}</th>
                <th>{t('common_event')}</th>
                <th>{t('common_pax')}</th>
                <th>{t('common_status')}</th>
                <th>{t('common_signed')}</th>
                <th style={{ textAlign: 'right' }}>{t('common_commission')}</th>
                {role === 'internal' && <th className="booking-action-column">{t('common_action')}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={role === 'internal' ? 9 : 8} style={{ textAlign: 'center', padding: 36 }}>{t('common_loading')}</td></tr>}
              {!loading && paginatedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="name-cell">
                    <strong>{booking.booking_code}</strong>
                    {booking.booking_source && <><br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{booking.booking_source}</span></>}
                    {role === 'internal' && (
                      <div style={{ marginTop: 4 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: booking.staff_role === 'external' ? '#7c3aed18' : '#0891b218',
                            color: booking.staff_role === 'external' ? '#7c3aed' : '#0891b2',
                            border: `1px solid ${booking.staff_role === 'external' ? '#7c3aed40' : '#0891b240'}`,
                          }}
                        >
                          {booking.staff_role === 'external' ? `External: ${booking.staff_name || 'Staff'}` : `Internal: ${booking.staff_name || 'Staff'}`}
                        </span>
                      </div>
                    )}
                    {role === 'external' && booking.staff_name && <><br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('booking_by').replace('{name}', booking.staff_name)}</span></>}
                  </td>
                  <td>
                    <strong>{booking.guest_name}</strong><br />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {t('common_room')} {booking.room_number || '-'}{booking.guest_phone ? ` · ${booking.guest_phone}` : ''}
                    </span>
                    {booking.resort_name && (
                      <div style={{ marginTop: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: 'rgba(8, 145, 178, 0.08)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(8, 145, 178, 0.25)', display: 'inline-block' }}>
                          🏝️ {booking.resort_name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>{booking.package_name}</td>
                  <td style={{ fontSize: 12 }}>{String(booking.event_date).slice(0, 10)}<br />{booking.time_start}-{booking.time_end}</td>
                  <td>{booking.adult_count} {language === 'en' ? 'adult' : 'dewasa'} / {booking.child_count} {language === 'en' ? 'child' : 'anak'}</td>
                  <td><span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status, language)}</span></td>
                  <td><span className={`tag ${booking.signed_by_guest ? 'tag-completed' : 'tag-pending'}`}>{booking.signed_by_guest ? t('common_yes') : t('common_no')}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(booking.staff_commission_5_usd)}</td>
                  {role === 'internal' && (
                    <td className="booking-action-cell">
                      {booking.status === 'pending' && (
                        <div className="booking-review-actions" aria-label={`${t('common_action')} ${booking.booking_code}`}>
                          <button
                            type="button"
                            className="booking-review-button is-accept"
                            onClick={() => setConfirmModal({ type: 'accept', booking })}
                          >
                            <span aria-hidden="true">✓</span> {t('btn_accept_booking')}
                          </button>
                          <button
                            type="button"
                            className="booking-review-button is-reject"
                            onClick={() => setConfirmModal({ type: 'reject', booking })}
                          >
                            <span aria-hidden="true">✕</span> {t('btn_reject_booking')}
                          </button>
                        </div>
                      )}
                      <details
                        className="booking-action-menu"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.removeAttribute('open');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.currentTarget.removeAttribute('open');
                            event.currentTarget.querySelector('summary')?.focus();
                          }
                        }}
                      >
                        <summary
                          aria-label={`${t('common_action')} ${booking.booking_code}`}
                          title={t('common_action')}
                        >
                          <span className="booking-action-trigger-icon" aria-hidden="true"><span /><span /><span /><span /></span>
                          <span className="booking-action-trigger-label">{language === 'en' ? 'Manage' : 'Kelola'}</span>
                          <span className="booking-action-trigger-chevron" aria-hidden="true" />
                        </summary>
                        <div
                          className="booking-action-dropdown"
                          role="menu"
                          onClick={(event) => {
                            if (event.target.closest('button')) event.currentTarget.closest('details')?.removeAttribute('open');
                          }}
                        >
                          <button type="button" role="menuitem" className="booking-action-item is-primary" onClick={() => openManageModal('view', booking)}>{t('booking_view', 'Lihat detail')}</button>
                          <button type="button" role="menuitem" className="booking-action-item" onClick={() => openManageModal('edit', booking)}>{t('booking_edit', 'Edit booking')}</button>
                          {canOperate(booking) && <button type="button" role="menuitem" className="booking-action-item" onClick={() => updateBooking(booking, { status: 'completed' })}>{t('booking_complete')}</button>}
                          {!['completed', 'rejected'].includes(booking.status) && !booking.status.startsWith('cancelled_') && <button type="button" role="menuitem" className="booking-action-item" onClick={() => openManageModal('schedule', booking)}>{t('booking_reschedule')}</button>}
                          {canOperate(booking) && <button type="button" role="menuitem" className="booking-action-item is-danger" onClick={() => updateBooking(booking, { status: 'cancelled_by_guest' })}>{t('booking_cancel_guest')}</button>}
                          {canOperate(booking) && <button type="button" role="menuitem" className="booking-action-item is-danger" onClick={() => updateBooking(booking, { status: 'cancelled_weather' })}>{t('booking_cancel_weather')}</button>}
                          {canToggleSigned(booking) && <button type="button" role="menuitem" className="booking-action-item" onClick={() => updateBooking(booking, { signedByGuest: !booking.signed_by_guest })}>{booking.signed_by_guest ? (language === 'en' ? 'Mark as unsigned' : 'Tandai belum ditandatangani') : t('common_signed')}</button>}
                          <button type="button" role="menuitem" className="booking-action-item is-danger" onClick={() => openManageModal('delete', booking)}>{t('booking_delete', 'Hapus booking')}</button>
                        </div>
                      </details>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filteredBookings.length === 0 && (
                <tr><td colSpan={role === 'internal' ? 9 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('booking_no_results')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination" style={{ padding: '16px 20px' }}>
          <span className="pagination-info">
            {t('common_showing')
              .replace('{start}', filteredBookings.length > 0 ? Math.min((page - 1) * PER_PAGE + 1, filteredBookings.length) : 0)
              .replace('{end}', Math.min(page * PER_PAGE, filteredBookings.length))
              .replace('{total}', filteredBookings.length)}
          </span>
          <div className="pagination-controls">
            <button type="button" className="page-btn" title={t('common_first')} aria-label={t('common_first')} disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button type="button" className="page-btn" title={t('common_previous')} aria-label={t('common_previous')} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            <button type="button" className="page-btn active" aria-current="page" aria-label={`${language === 'en' ? 'Page' : 'Halaman'} ${page}`}>{page}</button>
            <button type="button" className="page-btn" title={t('common_next')} aria-label={t('common_next')} disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)}>›</button>
            <button type="button" className="page-btn" title={t('common_last')} aria-label={t('common_last')} disabled={page === totalPages || totalPages === 0} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      </div>

      {manageModal?.type === 'view' && (
        <StaffBookingView
          booking={manageModal.booking}
          isInternal
          onClose={() => setManageModal(null)}
          onEdit={() => openManageModal('edit', manageModal.booking)}
        />
      )}

      {typeof document !== 'undefined' && manageModal && manageModal.type !== 'view' && createPortal((
        <div className="modal-backdrop staff-booking-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !actionLoading) setManageModal(null); }}>
          <div className="modal staff-manage-booking-modal" role="dialog" aria-modal="true" aria-labelledby="staff-manage-booking-title">
            <div className="modal-header">
              <span className="modal-title" id="staff-manage-booking-title">
                {manageModal.type === 'edit' && t('booking_edit', 'Edit booking')}
                {manageModal.type === 'schedule' && t('booking_reschedule', 'Jadwalkan ulang')}
                {manageModal.type === 'delete' && t('booking_delete', 'Hapus booking')}
              </span>
              <button type="button" className="modal-close" aria-label={t('btn_close', 'Tutup')} disabled={actionLoading} onClick={() => setManageModal(null)}>&times;</button>
            </div>
            <form onSubmit={submitManageAction}>
              <div className="modal-body">
                {manageModal.type === 'delete' ? (
                  <p>{language === 'en' ? `Delete ${manageModal.booking.booking_code}? This cannot be undone.` : `Hapus booking ${manageModal.booking.booking_code}? Tindakan ini tidak dapat dibatalkan.`}</p>
                ) : manageModal.type === 'schedule' ? (
                  <div className="booking-edit-grid">
                    <label className="input-group"><span className="input-label">{t('reschedule_date', 'Tanggal')}</span><input className="input" type="date" required value={manageForm.eventDate || ''} onChange={(event) => setManageForm((form) => ({ ...form, eventDate: event.target.value }))} /></label>
                    <label className="input-group"><span className="input-label">{t('reschedule_start', 'Mulai')}</span><input className="input" type="time" required value={manageForm.timeStart || ''} onChange={(event) => setManageForm((form) => ({ ...form, timeStart: event.target.value }))} /></label>
                    <label className="input-group"><span className="input-label">{t('reschedule_end', 'Selesai')}</span><input className="input" type="time" required value={manageForm.timeEnd || ''} onChange={(event) => setManageForm((form) => ({ ...form, timeEnd: event.target.value }))} /></label>
                    <label className="input-group booking-edit-notes"><span className="input-label">{t('reschedule_reason', 'Alasan')}</span><textarea className="input" required value={manageForm.reason || ''} onChange={(event) => setManageForm((form) => ({ ...form, reason: event.target.value }))} /></label>
                  </div>
                ) : (
                  <div className="booking-edit-grid">
                    <label className="input-group"><span className="input-label">{t('common_guest', 'Nama tamu')}</span><input className="input" required value={manageForm.guestName || ''} onChange={(event) => setManageForm((form) => ({ ...form, guestName: event.target.value }))} /></label>
                    <label className="input-group"><span className="input-label">WhatsApp</span><input className="input" required value={manageForm.guestPhone || ''} onChange={(event) => setManageForm((form) => ({ ...form, guestPhone: event.target.value }))} /></label>
                    <label className="input-group"><span className="input-label">Email</span><input className="input" type="email" value={manageForm.guestEmail || ''} onChange={(event) => setManageForm((form) => ({ ...form, guestEmail: event.target.value }))} /></label>
                    <label className="input-group"><span className="input-label">{t('common_room', 'Kamar')}</span><input className="input" required value={manageForm.roomNumber || ''} onChange={(event) => setManageForm((form) => ({ ...form, roomNumber: event.target.value }))} /></label>
                    <label className="input-group booking-edit-nationality"><span className="input-label">{language === 'en' ? 'Nationality' : 'Kebangsaan'}</span><input className="input" required value={manageForm.nationality || ''} onChange={(event) => setManageForm((form) => ({ ...form, nationality: event.target.value }))} /></label>
                    <label className="input-group"><span className="input-label">{language === 'en' ? 'Adults' : 'Dewasa'}</span><input className="input" type="number" min="0" required value={manageForm.adultCount ?? 0} onChange={(event) => setManageForm((form) => ({ ...form, adultCount: Number(event.target.value) }))} /></label>
                    <label className="input-group"><span className="input-label">{language === 'en' ? 'Children' : 'Anak'}</span><input className="input" type="number" min="0" required value={manageForm.childCount ?? 0} onChange={(event) => setManageForm((form) => ({ ...form, childCount: Number(event.target.value) }))} /></label>
                    <label className="input-group booking-edit-notes"><span className="input-label">{language === 'en' ? 'Notes' : 'Catatan'}</span><textarea className="input" value={manageForm.notes || ''} onChange={(event) => setManageForm((form) => ({ ...form, notes: event.target.value }))} /></label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={() => setManageModal(null)}>{t('btn_cancel', 'Batal')}</button>
                <button type="submit" className={`btn btn-sm ${manageModal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} disabled={actionLoading}>
                  {actionLoading ? t('common_loading', 'Memproses...') : manageModal.type === 'delete' ? t('booking_delete', 'Hapus booking') : t('btn_save', 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Custom Confirmation Modal Dialog */}
      {typeof document !== 'undefined' && confirmModal && createPortal((
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setConfirmModal(null);
          }}
        >
          <div
            className="modal"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: `1px solid ${confirmModal.type === 'accept' ? 'rgba(5, 150, 105, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
              borderRadius: 12,
              width: 520,
              maxWidth: '94vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: confirmModal.type === 'accept' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: confirmModal.type === 'accept' ? '#059669' : '#dc2626',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: confirmModal.type === 'accept' ? '0 0 14px rgba(5, 150, 105, 0.4)' : '0 0 14px rgba(220, 38, 38, 0.4)',
                }}
              >
                {confirmModal.type === 'accept' ? '✓' : '✕'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {confirmModal.type === 'accept' ? t('confirm_accept_title', 'Konfirmasi Persetujuan Booking') : t('confirm_reject_title', 'Konfirmasi Penolakan Booking')}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {confirmModal.type === 'accept' ? t('confirm_accept_desc') : t('confirm_reject_desc')}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !actionLoading && setConfirmModal(null)}
                disabled={actionLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Booking Details Summary */}
            <div style={{ padding: '20px 24px', background: 'var(--bg-card)' }}>
              <div
                style={{
                  background: 'var(--bg-elevated, rgba(0, 0, 0, 0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                      {t('booking_code')}
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {confirmModal.booking.booking_code}
                    </div>
                  </div>
                  {confirmModal.booking.staff_name && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: confirmModal.booking.staff_role === 'external' ? '#7c3aed18' : '#0891b218',
                        color: confirmModal.booking.staff_role === 'external' ? '#7c3aed' : '#0891b2',
                        border: `1px solid ${confirmModal.booking.staff_role === 'external' ? '#7c3aed40' : '#0891b240'}`,
                      }}
                    >
                      {confirmModal.booking.staff_role === 'external' ? `External: ${confirmModal.booking.staff_name}` : `Internal: ${confirmModal.booking.staff_name}`}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>{t('booking_guest')}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{confirmModal.booking.guest_name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {t('common_room')} {confirmModal.booking.room_number || '-'} {confirmModal.booking.guest_phone ? `· ${confirmModal.booking.guest_phone}` : ''}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>{t('booking_package')}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{confirmModal.booking.package_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>{t('booking_schedule')}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{String(confirmModal.booking.event_date).slice(0, 10)}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{confirmModal.booking.time_start} - {confirmModal.booking.time_end}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>{t('common_pax')}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {confirmModal.booking.adult_count} {t('form_adults')} / {confirmModal.booking.child_count} {t('form_children')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                background: 'var(--bg-elevated, rgba(0, 0, 0, 0.02))',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                style={{ padding: '8px 16px', fontWeight: 600 }}
              >
                {t('btn_cancel_action', 'Batal')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmAction}
                disabled={actionLoading}
                style={{
                  background: confirmModal.type === 'accept' ? '#059669' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '8px 20px',
                  fontWeight: 700,
                  boxShadow: confirmModal.type === 'accept' ? '0 2px 10px rgba(5, 150, 105, 0.35)' : '0 2px 10px rgba(220, 38, 38, 0.35)',
                  opacity: actionLoading ? 0.7 : 1,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading
                  ? t('common_processing')
                  : confirmModal.type === 'accept'
                  ? t('btn_yes_accept', '✓ Ya, Setujui Booking')
                  : t('btn_yes_reject', '✕ Ya, Tolak Booking')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 28 }}>{value}</div>
    </div>
  );
}
