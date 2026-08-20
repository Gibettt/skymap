'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { findPackageForSlug, getExperienceForPackage } from '@/data/observations';
import { useLanguage } from '@/context/LanguageContext';

const DEFAULT_TIME_SLOT = '21:00 - 22:00';

function titleCase(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createEmptyChild(index = 1) {
  return {
    id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    age: '',
    gender: 'Male',
    schoolGrade: '',
    astronomyLevel: 'Beginner',
    dietaryRestrictions: '',
    comfortNotes: '',
    packages: [],
  };
}

function createEmptyAdult(index = 3) {
  return {
    id: `adult_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    phone: '',
    email: '',
    occupation: '',
    packages: [],
    index,
  };
}

function initialForm() {
  return {
    eventDate: '',
    timeSlot: '',
    preferredLanguage: 'English',
    roomNumber: '',
    nationality: '',
    adultCount: 2,
    childCount: 0,
    // Tamu Utama (Lead Guest)
    leadGuestName: '',
    leadGuestPhone: '',
    leadGuestEmail: '',
    leadGuestOccupation: '',
    leadGuestPackages: [],
    // Tamu Dewasa 2 (Pasangan / Pendamping)
    companionName: '',
    companionPhone: '',
    companionEmail: '',
    companionOccupation: '',
    companionPackages: [],
    extraAdults: [],
    // Dynamic Children List
    children: [],
    // Consent & General
    specialOccasion: '',
    seatingSetup: 'Couple / Family',
    photoRequest: 'Ask guest first',
    privacyPreference: 'Standard',
    dietaryRestrictions: '',
    rescheduleConsent: 'Yes',
    slotStatus: 'available',
    paymentMethod: 'Room charge',
    packageNotes: '',
    notes: '',
  };
}

function splitTimeSlot(slot) {
  const [start = '21:00', end = '22:00'] = String(slot || DEFAULT_TIME_SLOT).split('-').map((part) => part.trim());
  return { start, end };
}

function packageNames(packages, ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => packages.find((pkg) => pkg.id === id)?.name).filter(Boolean);
}

function packageIdsFromNames(packages, names) {
  if (!Array.isArray(names)) return [];
  return names.map((name) => packages.find((pkg) => pkg.name === name)?.id).filter(Boolean);
}

function addOnNames(addOns, owner) {
  if (!Array.isArray(addOns)) return [];
  return addOns
    .filter((item) => String(item).startsWith(`${owner}: `) || String(item).startsWith(`${owner} `))
    .map((item) => String(item).replace(new RegExp(`^${owner}[:\\s(].*?\\)?[:\\s]*`), '').trim())
    .filter(Boolean);
}

function noteLine(notes, label) {
  return String(notes || '').split('\n').find((line) => line.toLowerCase().startsWith(label.toLowerCase())) || '';
}

function notePart(line, label) {
  const part = String(line || '').split('|').find((item) => item.trim().toLowerCase().startsWith(label.toLowerCase()));
  return part ? part.replace(new RegExp(`^${label}:?\\s*`, 'i'), '').trim() : '';
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function timeValue(value) {
  return value ? String(value).slice(0, 5) : '';
}

function statusLabel(status, lang = 'id') {
  const isEn = lang === 'en';
  const labels = {
    pending: isEn ? 'Pending' : 'Menunggu',
    active: isEn ? 'Active' : 'Aktif',
    completed: isEn ? 'Completed' : 'Selesai',
    rescheduled: isEn ? 'Rescheduled' : 'Dijadwalkan ulang',
    cancelled_by_guest: isEn ? 'Cancelled by guest' : 'Dibatalkan tamu',
    cancelled_weather: isEn ? 'Cancelled by weather' : 'Dibatalkan karena cuaca',
  };
  return labels[status] || status;
}

function statusClass(status) {
  if (['active', 'completed', 'rescheduled'].includes(status)) return 'tag-confirmed';
  if (status?.startsWith('cancelled_')) return 'tag-cancelled';
  return 'tag-pending';
}

function cleanPackageName(name) {
  return String(name || '').replace(/^(Tamu Utama|Tamu 2|Ayah|Ibu|Anak\s*\d*|Anak):\s*/i, '').trim();
}

function bookingPackageText(booking) {
  const names = [
    booking.package_name,
    ...(Array.isArray(booking.add_ons) ? booking.add_ons.map(cleanPackageName) : []),
  ].map(cleanPackageName).filter(Boolean);

  return [...new Set(names)].join(', ');
}

export default function FamilyBookingForm({ basePath, fixedSlug = null, staticExperience = null, listMode = false }) {
  const router = useRouter();
  const { t, language, localizeApiError } = useLanguage();
  const [packages, setPackages] = useState([]);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(!listMode);
  const [showForm, setShowForm] = useState(!listMode);
  const [form, setForm] = useState(initialForm);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fixedPackage = useMemo(() => {
    if (!fixedSlug) return null;
    return findPackageForSlug(packages, fixedSlug, staticExperience);
  }, [fixedSlug, packages, staticExperience]);

  const selectedPackageIds = useMemo(() => [
    ...form.leadGuestPackages,
    ...(Number(form.adultCount) >= 2 ? form.companionPackages : []),
    ...form.extraAdults.flatMap((adult) => adult.packages),
    ...form.children.flatMap((c) => c.packages),
  ], [form.leadGuestPackages, form.companionPackages, form.extraAdults, form.children, form.adultCount]);

  const selectedPackageId = selectedPackageIds[0] || (fixedPackage ? fixedPackage.id : '');
  const selectedPackage = fixedPackage || (selectedPackageId ? packages.find((pkg) => pkg.id === selectedPackageId) : null);
  const canSubmitPackage = Boolean(fixedPackage || selectedPackageIds.length > 0);
  const submitPackage = selectedPackage || packages[0];
  const experience = fixedPackage ? getExperienceForPackage(fixedPackage) : null;

  const pageTitle = fixedPackage
    ? (experience?.title || fixedPackage.name)
    : (language === 'en' ? 'Stargazing Booking Form' : 'Form Booking');

  const experienceTaglineKey = fixedSlug
    ? `experience_${fixedSlug.replaceAll('-', '_')}_tagline`
    : '';
  const pageTagline = fixedPackage
    ? t(
        experienceTaglineKey,
        experience?.tagline || `${titleCase(fixedPackage.package_type || 'Regular')} package at ${fixedPackage.location || 'Observatory'}.`
      ).replace('{location}', fixedPackage.location || 'Observatory')
    : t('form_desc', 'Isi data tamu, pilih paket observasi, dan tentukan preferensi reservasi.');

  const selectedTimeSlot = form.timeSlot || experience?.schedule?.time || DEFAULT_TIME_SLOT;

  useEffect(() => {
    fetch('/api/packages')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(language === 'en' ? 'Failed to load active packages.' : 'Gagal memuat package aktif.')))
      .then((data) => {
        const pkgs = data.packages || [];
        setPackages(pkgs);
        if (fixedSlug) {
          const matched = findPackageForSlug(pkgs, fixedSlug, staticExperience);
          if (matched) {
            setForm((current) => ({
              ...current,
              leadGuestPackages: current.leadGuestPackages.length ? current.leadGuestPackages : [matched.id],
            }));
          }
        } else if (pkgs.length > 0) {
          // Jika tidak ada fixedSlug, auto-pilih package pertama sebagai default
          // agar user tidak perlu manual mencentang sebelum submit
          setForm((current) => ({
            ...current,
            leadGuestPackages: current.leadGuestPackages.length ? current.leadGuestPackages : [pkgs[0].id],
          }));
        }
      })
      .catch((error) => {
        setToast({ type: 'error', msg: error.message });
        setTimeout(() => setToast(null), 3000);
      })
      .finally(() => {
        setPackagesLoaded(true);
      });
  }, [language, fixedSlug, staticExperience]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBookings = () => {
    if (!listMode) return;
    fetch('/api/bookings')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(t('form_load_booking_error'))))
      .then((data) => setBookings(data.bookings || []))
      .catch((error) => showToast('error', error.message))
      .finally(() => setBookingsLoaded(true));
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMode]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  // Adults counter handler
  const handleAdultCountChange = (value) => {
    const count = Math.max(1, parseInt(value, 10) || 1);
    setForm((current) => {
      const extraCount = Math.max(0, count - 2);
      let nextExtraAdults = [...current.extraAdults];
      if (extraCount > nextExtraAdults.length) {
        for (let i = nextExtraAdults.length; i < extraCount; i++) {
          nextExtraAdults.push(createEmptyAdult(i + 3));
        }
      } else if (extraCount < nextExtraAdults.length) {
        nextExtraAdults = nextExtraAdults.slice(0, extraCount);
      }
      return {
        ...current,
        adultCount: count,
        extraAdults: nextExtraAdults.map((adult, index) => ({ ...adult, index: index + 3 })),
      };
    });
  };

  // Children counter handler with list synchronization
  const handleChildCountChange = (value) => {
    const count = Math.max(0, parseInt(value, 10) || 0);
    setForm((current) => {
      let nextChildren = [...current.children];
      if (count > nextChildren.length) {
        const diff = count - nextChildren.length;
        for (let i = 0; i < diff; i++) {
          nextChildren.push(createEmptyChild(nextChildren.length + 1));
        }
      } else if (count < nextChildren.length) {
        nextChildren = nextChildren.slice(0, count);
      }
      return {
        ...current,
        childCount: count,
        children: nextChildren,
      };
    });
  };

  // Add a child dynamically
  const handleAddChild = () => {
    setForm((current) => {
      const nextChildren = [...current.children, createEmptyChild(current.children.length + 1)];
      return {
        ...current,
        children: nextChildren,
        childCount: nextChildren.length,
      };
    });
  };

  // Remove child dynamically
  const handleRemoveChild = (index) => {
    setForm((current) => {
      const nextChildren = current.children.filter((_, idx) => idx !== index);
      return {
        ...current,
        children: nextChildren,
        childCount: nextChildren.length,
      };
    });
  };

  // Update specific child field
  const handleChildFieldChange = (index, field, value) => {
    setForm((current) => {
      const nextChildren = current.children.map((c, idx) => {
        if (idx === index) {
          return { ...c, [field]: value };
        }
        return c;
      });
      return { ...current, children: nextChildren };
    });
  };

  // Toggle package for a child
  const handleToggleChildPackage = (index, packageId) => {
    setForm((current) => {
      const nextChildren = current.children.map((c, idx) => {
        if (idx === index) {
          const currentPkgs = c.packages || [];
          const nextPkgs = currentPkgs.includes(packageId)
            ? currentPkgs.filter((id) => id !== packageId)
            : [...currentPkgs, packageId];
          return { ...c, packages: nextPkgs };
        }
        return c;
      });
      return { ...current, children: nextChildren };
    });
  };

  // Toggle package for adults
  const togglePackage = (field, packageId) => {
    setForm((current) => {
      const currentIds = current[field] || [];
      const nextIds = currentIds.includes(packageId)
        ? currentIds.filter((id) => id !== packageId)
        : [...currentIds, packageId];
      return { ...current, [field]: nextIds };
    });
  };

  const handleExtraAdultFieldChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      extraAdults: current.extraAdults.map((adult, idx) => (
        idx === index ? { ...adult, [field]: value } : adult
      )),
    }));
  };

  const handleToggleExtraAdultPackage = (index, packageId) => {
    setForm((current) => ({
      ...current,
      extraAdults: current.extraAdults.map((adult, idx) => {
        if (idx !== index) return adult;
        const currentIds = adult.packages || [];
        return {
          ...adult,
          packages: currentIds.includes(packageId)
            ? currentIds.filter((id) => id !== packageId)
            : [...currentIds, packageId],
        };
      }),
    }));
  };

  const leadPackageNames = packageNames(packages, form.leadGuestPackages);
  const companionPackageNames = packageNames(packages, form.companionPackages);

  const addOns = useMemo(() => {
    const list = [];
    leadPackageNames.forEach((name) => {
      list.push(`Tamu Utama (${form.leadGuestName || 'Lead'}): ${name}`);
    });
    if (Number(form.adultCount) >= 2) {
      companionPackageNames.forEach((name) => {
        list.push(`Tamu 2 (${form.companionName || 'Pendamping'}): ${name}`);
      });
    }
    form.extraAdults.forEach((adult, idx) => {
      packageNames(packages, adult.packages).forEach((name) => {
        list.push(`Tamu ${idx + 3} (${adult.name || 'Pendamping'}): ${name}`);
      });
    });
    form.children.forEach((c, idx) => {
      const cNames = packageNames(packages, c.packages);
      cNames.forEach((name) => {
        list.push(`Anak ${idx + 1} (${c.name || 'Anak'}): ${name}`);
      });
    });
    return list;
  }, [leadPackageNames, companionPackageNames, form.children, form.extraAdults, form.leadGuestName, form.companionName, form.adultCount, packages]);

  const childAgesSummary = useMemo(() => {
    if (!form.children.length) return '-';
    return form.children.map((c) => `${c.name || 'Anak'} (${c.age || '?'} thn)`).join(', ');
  }, [form.children]);

  const buildFamilyNotes = () => {
    const lines = [
      `Package utama: ${selectedPackage?.name || pageTitle}`,
      `Tamu Utama: ${form.leadGuestName} | WhatsApp: ${form.leadGuestPhone} | Email: ${form.leadGuestEmail || '-'} | Pekerjaan: ${form.leadGuestOccupation || '-'}`,
      `Package Tamu Utama: ${leadPackageNames.join(', ') || '-'}`,
    ];

    if (Number(form.adultCount) >= 2) {
      lines.push(
        `Tamu 2 (Pasangan/Pendamping): ${form.companionName || '-'} | WhatsApp: ${form.companionPhone || '-'} | Email: ${form.companionEmail || '-'} | Pekerjaan: ${form.companionOccupation || '-'}`,
        `Package Tamu 2: ${companionPackageNames.join(', ') || '-'}`
      );
    }

    form.extraAdults.forEach((adult, idx) => {
      const guestNumber = idx + 3;
      const adultPkgs = packageNames(packages, adult.packages);
      lines.push(
        `Tamu ${guestNumber}: ${adult.name || '-'} | WhatsApp: ${adult.phone || '-'} | Email: ${adult.email || '-'} | Pekerjaan: ${adult.occupation || '-'}`,
        `Package Tamu ${guestNumber}: ${adultPkgs.join(', ') || '-'}`
      );
    });

    if (form.children.length > 0) {
      form.children.forEach((c, idx) => {
        const cPkgs = packageNames(packages, c.packages);
        lines.push(
          `Anak ${idx + 1}: ${c.name} | Umur: ${c.age || '-'} thn | Gender: ${c.gender || '-'} | Kelas: ${c.schoolGrade || '-'}`,
          `Package Anak ${idx + 1}: ${cPkgs.join(', ') || '-'}`,
          c.astronomyLevel ? `Level Astronomi Anak ${idx + 1}: ${c.astronomyLevel}` : null,
          c.dietaryRestrictions ? `Alergi/Diet Anak ${idx + 1}: ${c.dietaryRestrictions}` : null,
          c.comfortNotes ? `Catatan Kenyamanan Anak ${idx + 1}: ${c.comfortNotes}` : null
        );
      });
    }

    if (form.specialOccasion) lines.push(`Occasion: ${form.specialOccasion}`);
    if (form.packageNotes) lines.push(`Detail tambahan: ${form.packageNotes}`);

    return lines.filter(Boolean).join('\n');
  };

  const handleBook = async (event) => {
    event.preventDefault();
    if (!form.eventDate) {
      showToast('error', t('form_validation_date'));
      return;
    }
    if (!canSubmitPackage || !submitPackage) {
      showToast('error', t('form_validation_package'));
      return;
    }
    if (!form.leadGuestName || !form.leadGuestPhone) {
      showToast('error', t('form_validation_lead'));
      return;
    }

    // Validate child data if children exist
    for (let i = 0; i < form.children.length; i++) {
      const child = form.children[i];
      if (!child.name || !child.age) {
        showToast('error', t('form_validation_child').replace('{number}', i + 1));
        return;
      }
    }

    setSubmitting(true);
    const { start, end } = splitTimeSlot(selectedTimeSlot);
    let response, data;
    try {
      response = await fetch(editingBooking ? `/api/bookings/${editingBooking.id}` : '/api/bookings', {
        method: editingBooking ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: submitPackage.id,
          eventDate: form.eventDate,
          timeStart: start,
          timeEnd: end,
          guestName: form.leadGuestName,
          guestPhone: form.leadGuestPhone,
          guestEmail: form.leadGuestEmail || null,
          preferredLanguage: form.preferredLanguage,
          roomNumber: form.roomNumber,
          nationality: form.nationality,
          adultCount: Number(form.adultCount),
          childCount: Number(form.children.length),
          childAges: childAgesSummary,
          specialOccasion: form.specialOccasion,
          guardianName: form.leadGuestName,
          guardianPhone: form.leadGuestPhone,
          seatingSetup: form.seatingSetup,
          photoRequest: form.photoRequest,
          privacyPreference: form.privacyPreference,
          dietaryRestrictions: form.dietaryRestrictions,
          rescheduleConsent: form.rescheduleConsent,
          slotStatus: form.slotStatus,
          bookingSource: 'WhatsApp',
          paymentMethod: form.paymentMethod,
          addOns,
          packageNotes: buildFamilyNotes(),
          notes: form.notes,
        }),
      });
      data = await response.json();
    } catch (fetchErr) {
      setSubmitting(false);
      const errMsg = language === 'en'
        ? `Network error: ${fetchErr.message}. Check your connection.`
        : `Gagal mengirim data: ${fetchErr.message}. Periksa koneksi Anda.`;
      console.error('[FamilyBookingForm] fetch error:', fetchErr);
      setToast({ type: 'error', msg: errMsg });
      setTimeout(() => setToast(null), 8000);
      return;
    }
    setSubmitting(false);

    if (!response.ok) {
      const errorMsg = localizeApiError(data.error, t('form_submit_error'));
      console.error('[FamilyBookingForm] POST error:', response.status, errorMsg, data);
      setToast({ type: 'error', msg: errorMsg });
      setTimeout(() => setToast(null), 8000);
      return;
    }

    showToast('success', t(editingBooking ? 'form_submit_success_updated' : 'form_submit_success_created').replace('{code}', data.booking.booking_code));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('ephemeris_sync_channel');
        channel.postMessage({ type: 'BOOKING_CREATED', booking: data.booking });
        channel.close();
      }
    } catch {
      // ignore
    }
    const defaultPackageId = !fixedSlug && packages.length > 0 ? packages[0].id : undefined;
    setForm({
      ...initialForm(),
      leadGuestPackages: defaultPackageId ? [defaultPackageId] : [],
    });
    setEditingBooking(null);
    if (basePath) {
      setTimeout(() => {
        router.push(`${basePath}/bookings`);
      }, 800);
    }
  };

  const startCreate = () => {
    setEditingBooking(null);
    const defaultPackageId = !fixedSlug && packages.length > 0 ? packages[0].id : undefined;
    setForm({
      ...initialForm(),
      leadGuestPackages: defaultPackageId ? [defaultPackageId] : [],
    });
    setShowForm(true);
  };

  const startEdit = (booking) => {
    const notes = booking.package_notes || '';
    const leadLine = noteLine(notes, 'Tamu Utama') || noteLine(notes, 'Ayah');
    const companionLine = noteLine(notes, 'Tamu 2') || noteLine(notes, 'Ibu');
    
    // Parse package IDs from add_ons
    const leadPackageIds = packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Tamu Utama'))
      .concat(packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Ayah')));
    const companionPackageIds = packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Tamu 2'))
      .concat(packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Ibu')));
    const adultCount = Number(booking.adult_count || 2);
    const parsedExtraAdults = [];
    for (let i = 3; i <= Math.max(adultCount, 10); i++) {
      const adultLine = noteLine(notes, `Tamu ${i}:`);
      if (adultLine || i <= adultCount) {
        parsedExtraAdults.push({
          ...createEmptyAdult(i),
          id: `adult_parsed_${i}`,
          name: notePart(adultLine, `Tamu ${i}`),
          phone: notePart(adultLine, 'WhatsApp'),
          email: notePart(adultLine, 'Email'),
          occupation: notePart(adultLine, 'Pekerjaan'),
          packages: packageIdsFromNames(packages, addOnNames(booking.add_ons, `Tamu ${i}`)),
          index: i,
        });
      }
    }

    // Parse children from notes or count
    const parsedChildren = [];
    const childCount = Number(booking.child_count || 0);

    for (let i = 1; i <= Math.max(childCount, 10); i++) {
      const cLine = noteLine(notes, `Anak ${i}:`) || (i === 1 ? noteLine(notes, 'Anak:') : '');
      if (cLine) {
        const cPackageIds = packageIdsFromNames(packages, addOnNames(booking.add_ons, `Anak ${i}`))
          .concat(packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Anak')));
        parsedChildren.push({
          id: `child_parsed_${i}`,
          name: notePart(cLine, `Anak ${i}`) || notePart(cLine, 'Anak') || '',
          age: notePart(cLine, 'Umur').replace(/\s*thn?/i, '') || '',
          gender: notePart(cLine, 'Gender') || 'Male',
          schoolGrade: notePart(cLine, 'Kelas') || '',
          astronomyLevel: notePart(noteLine(notes, `Level Astronomi Anak ${i}`), `Level Astronomi Anak ${i}`) || 'Beginner',
          dietaryRestrictions: notePart(noteLine(notes, `Alergi/Diet Anak ${i}`), `Alergi/Diet Anak ${i}`) || '',
          comfortNotes: notePart(noteLine(notes, `Catatan Kenyamanan Anak ${i}`), `Catatan Kenyamanan Anak ${i}`) || '',
          packages: cPackageIds,
        });
      }
    }

    // If childCount > 0 but none found in notes, create empty placeholders
    if (childCount > 0 && parsedChildren.length === 0) {
      for (let i = 0; i < childCount; i++) {
        parsedChildren.push(createEmptyChild(i + 1));
      }
    }

    setEditingBooking(booking);
    setForm({
      ...initialForm(),
      eventDate: dateValue(booking.event_date),
      timeSlot: `${timeValue(booking.time_start)} - ${timeValue(booking.time_end)}`,
      preferredLanguage: booking.preferred_language || 'English',
      roomNumber: booking.room_number || '',
      nationality: booking.nationality || '',
      adultCount,
      childCount: parsedChildren.length,
      leadGuestName: notePart(leadLine, 'Tamu Utama') || notePart(leadLine, 'Ayah') || booking.guest_name || '',
      leadGuestPhone: notePart(leadLine, 'WhatsApp') || booking.guest_phone || '',
      leadGuestEmail: notePart(leadLine, 'Email') || booking.guest_email || '',
      leadGuestOccupation: notePart(leadLine, 'Pekerjaan'),
      leadGuestPackages: leadPackageIds.length ? leadPackageIds : [booking.package_id].filter(Boolean),
      companionName: notePart(companionLine, 'Tamu 2 (Pasangan/Pendamping)') || notePart(companionLine, 'Tamu 2') || notePart(companionLine, 'Ibu'),
      companionPhone: notePart(companionLine, 'WhatsApp'),
      companionEmail: notePart(companionLine, 'Email'),
      companionOccupation: notePart(companionLine, 'Pekerjaan'),
      companionPackages: companionPackageIds,
      extraAdults: parsedExtraAdults.slice(0, Math.max(0, adultCount - 2)),
      children: parsedChildren,
      specialOccasion: booking.special_occasion || '',
      seatingSetup: booking.seating_setup || 'Couple / Family',
      photoRequest: booking.photo_request || 'Ask guest first',
      privacyPreference: booking.privacy_preference || 'Standard',
      dietaryRestrictions: booking.dietary_restrictions || '',
      rescheduleConsent: booking.reschedule_consent || 'Yes',
      slotStatus: booking.slot_status || 'available',
      paymentMethod: booking.payment_method || 'Room charge',
      packageNotes: '',
      notes: booking.notes || '',
    });
    setShowForm(true);
  };

  const handleCheckAvailability = () => {
    if (!form.eventDate) {
      showToast('error', t('form_validation_date'));
      return;
    }
    showToast('info', t('form_availability_ok'));
  };

  if (!packagesLoaded) {
    return <div className="external-booking-note">{language === 'en' ? 'Loading packages...' : 'Memuat package...'}</div>;
  }

  if (fixedSlug && !fixedPackage) {
    return <div className="external-booking-note">{language === 'en' ? 'This package is no longer active.' : 'Package ini sudah tidak aktif.'}</div>;
  }

  if (listMode && !showForm) {
    return (
      <div className="fade-in-up">
        <div className="form-booking-toolbar">
          <div>
            <h1>{t('nav_booking_form', 'Form Booking')}</h1>
            <p>{t('form_submitted_desc')}</p>
          </div>
          <button type="button" className="btn btn-primary" style={{ background: '#7c3aed' }} onClick={startCreate}>
            {t('btn_new_booking', '+ Tambah Booking')}
          </button>
        </div>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{t('form_submitted_title')}</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{bookings.length} {language === 'en' ? 'bookings' : 'booking'}</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('common_booking')}</th>
                  <th>{t('common_guest')}</th>
                  <th>{t('common_package')}</th>
                  <th>{t('common_event')}</th>
                  <th>{t('common_room')}</th>
                  <th>{t('common_status')}</th>
                  <th style={{ textAlign: 'center' }}>{t('common_action')}</th>
                </tr>
              </thead>
              <tbody>
                {!bookingsLoaded && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>{t('form_loading_bookings')}</td></tr>
                )}
                {bookingsLoaded && bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="name-cell">{booking.booking_code}</td>
                    <td>
                      {booking.guest_name}
                      <br />
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{booking.guest_phone || '-'}</span>
                    </td>
                    <td><strong>{bookingPackageText(booking) || '-'}</strong></td>
                    <td>{dateValue(booking.event_date)}<br /><span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{timeValue(booking.time_start)} - {timeValue(booking.time_end)}</span></td>
                    <td>{booking.room_number || '-'}</td>
                    <td><span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status, language)}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewingBooking(booking)}>{t('btn_view')}</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(booking)}>{t('btn_edit')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bookingsLoaded && bookings.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>{t('form_no_bookings')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {toast && (
          <div className="toast-container">
            <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
          </div>
        )}

        {viewingBooking && (
          <StaffBookingView
            booking={viewingBooking}
            isInternal={basePath?.includes('/internal')}
            onClose={() => setViewingBooking(null)}
            onEdit={() => {
              const booking = viewingBooking;
              setViewingBooking(null);
              startEdit(booking);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fade-in-up stagger">
      <div className="form-booking-toolbar">
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {editingBooking ? `Edit ${editingBooking.booking_code}` : pageTitle}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>{pageTagline}</p>
        </div>
        <div className="form-booking-actions">
          <Link href={`${basePath}/bookings`} className="btn btn-secondary btn-sm">
            {t('btn_list', 'View List')}
          </Link>
          <Link href={`${basePath}/jadwal`} className="btn btn-secondary btn-sm">
            {t('nav_calendar', 'View Calendar')}
          </Link>
        </div>
      </div>

      <section className="card booking-form-card">
        <div className="card-header">
          <h2 className="card-title">{t('form_intake_title')}</h2>
        </div>
        <form className="card-body family-intake-form" onSubmit={handleBook}>
          <div className="booking-intake-strip">
            <div>
              <strong>{selectedPackage ? selectedPackage.name : (language === 'en' ? 'Select Observation Package' : 'Pilih Paket Observasi')}</strong>
              <span>
                {selectedPackage
                  ? (selectedPackage.location ? `${titleCase(selectedPackage.package_type || 'Regular')} · ${selectedPackage.location}` : t('form_selected_package_desc'))
                  : (language === 'en' ? 'Lead guest, companion, optional children, and package selection' : 'Tentukan paket observasi untuk tamu utama, pendamping, dan anak di bawah.')}
              </span>
            </div>
            <b>{form.adultCount} {t('form_adults')}{form.children.length > 0 ? `, ${form.children.length} ${t('form_children')}` : ''}</b>
          </div>

          {/* 1. DATA RESERVASI */}
          <section className="booking-form-section">
            <h3>{t('form_sec_reservation')}</h3>
            <div className="booking-form-grid">
              <Field label="Date">
                <input className="input" type="date" value={form.eventDate} onChange={(e) => setField('eventDate', e.target.value)} required />
              </Field>

              <Field label="Time">
                <input className="input" value={selectedTimeSlot} onChange={(e) => setField('timeSlot', e.target.value)} placeholder={DEFAULT_TIME_SLOT} required />
              </Field>

              <Field label="Room / Villa">
                <input className="input" value={form.roomNumber} onChange={(e) => setField('roomNumber', e.target.value)} placeholder={t('form_placeholder_room')} required />
              </Field>

              <Field label="Nationality">
                <input className="input" value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} placeholder={t('form_placeholder_nationality')} required />
              </Field>

              <Field label="Preferred Language">
                <input className="input" value={form.preferredLanguage} onChange={(e) => setField('preferredLanguage', e.target.value)} />
              </Field>

              <Field label="Billing Method">
                <select className="input" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
                  <option value="Room charge">{t('form_payment_room')}</option>
                  <option value="Cash">{t('form_payment_cash')}</option>
                  <option value="Card">{t('form_payment_card')}</option>
                  <option value="Resort billing">{t('form_payment_resort')}</option>
                </select>
              </Field>

              <Field label={t('form_label_adult_count')}>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="20"
                  value={form.adultCount}
                  onChange={(e) => handleAdultCountChange(e.target.value)}
                  required
                />
              </Field>

              <Field label={t('form_label_child_count')}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="20"
                  value={form.childCount}
                  onChange={(e) => handleChildCountChange(e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* 2. DATA TAMU UTAMA (LEAD GUEST) */}
          <section className="booking-form-section">
            <div className="section-header-row">
              <h3>{t('form_sec_lead_compact')}</h3>
              <span className="section-badge-required">{t('form_required')}</span>
            </div>
            <div className="booking-form-grid">
              <Field label={t('form_label_full_name')}>
                <input
                  className="input"
                  value={form.leadGuestName}
                  onChange={(e) => setField('leadGuestName', e.target.value)}
                  placeholder={t('form_placeholder_lead_name')}
                  required
                />
              </Field>

              <Field label={t('form_label_phone_short')}>
                <input
                  className="input"
                  value={form.leadGuestPhone}
                  onChange={(e) => setField('leadGuestPhone', e.target.value)}
                  placeholder="+62... / +960..."
                  required
                />
              </Field>

              <Field label="Email">
                <input
                  className="input"
                  type="email"
                  value={form.leadGuestEmail}
                  onChange={(e) => setField('leadGuestEmail', e.target.value)}
                  placeholder="guest@email.com"
                />
              </Field>

              <Field label={t('form_label_occupation_company')}>
                <input
                  className="input"
                  value={form.leadGuestOccupation}
                  onChange={(e) => setField('leadGuestOccupation', e.target.value)}
                  placeholder={t('form_placeholder_optional')}
                />
              </Field>

              <PackagePicker
                label={t('form_label_lead_package')}
                packages={packages}
                selectedIds={form.leadGuestPackages}
                onToggle={(packageId) => togglePackage('leadGuestPackages', packageId)}
              />
            </div>
          </section>

          {/* 3. DATA TAMU DEWASA 2 (PASANGAN / PENDAMPING) - HANYA MUNCUL JIKA ADULTS >= 2 */}
          {Number(form.adultCount) >= 2 && (
            <section className="booking-form-section">
              <div className="section-header-row">
                <h3>{t('form_sec_companion_compact')}</h3>
                <span className="section-badge-optional">{t('form_optional')}</span>
              </div>
              <div className="booking-form-grid">
                <Field label={t('form_label_full_name')}>
                  <input
                    className="input"
                    value={form.companionName}
                    onChange={(e) => setField('companionName', e.target.value)}
                    placeholder={t('form_placeholder_companion_name')}
                  />
                </Field>

                <Field label="WhatsApp">
                  <input
                    className="input"
                    value={form.companionPhone}
                    onChange={(e) => setField('companionPhone', e.target.value)}
                    placeholder={t('form_placeholder_same_as_lead')}
                  />
                </Field>

                <Field label="Email">
                  <input
                    className="input"
                    type="email"
                    value={form.companionEmail}
                    onChange={(e) => setField('companionEmail', e.target.value)}
                    placeholder={t('form_placeholder_optional')}
                  />
                </Field>

                <Field label={t('form_label_companion_job')}>
                  <input
                    className="input"
                    value={form.companionOccupation}
                    onChange={(e) => setField('companionOccupation', e.target.value)}
                    placeholder={t('form_placeholder_optional')}
                  />
                </Field>

                <PackagePicker
                  label={t('form_label_companion_package')}
                  packages={packages}
                  selectedIds={form.companionPackages}
                  onToggle={(packageId) => togglePackage('companionPackages', packageId)}
                />
              </div>
            </section>
          )}

          {form.extraAdults.map((adult, index) => {
            const guestNumber = index + 3;
            return (
              <section className="booking-form-section" key={adult.id || guestNumber}>
                <div className="section-header-row">
                  <h3>{t('form_sec_extra_adult').replace('{number}', guestNumber)}</h3>
                  <span className="section-badge-optional">{t('form_optional')}</span>
                </div>
                <div className="booking-form-grid">
                  <Field label={t('form_label_full_name')}>
                    <input
                      className="input"
                      value={adult.name}
                      onChange={(e) => handleExtraAdultFieldChange(index, 'name', e.target.value)}
                      placeholder={t('form_placeholder_extra_adult_name')}
                    />
                  </Field>

                  <Field label={t('form_label_phone_short')}>
                    <input
                      className="input"
                      value={adult.phone}
                      onChange={(e) => handleExtraAdultFieldChange(index, 'phone', e.target.value)}
                      placeholder={t('form_placeholder_same_as_lead')}
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      className="input"
                      type="email"
                      value={adult.email}
                      onChange={(e) => handleExtraAdultFieldChange(index, 'email', e.target.value)}
                      placeholder={t('form_placeholder_optional')}
                    />
                  </Field>

                  <Field label={t('form_label_companion_job')}>
                    <input
                      className="input"
                      value={adult.occupation}
                      onChange={(e) => handleExtraAdultFieldChange(index, 'occupation', e.target.value)}
                      placeholder={t('form_placeholder_optional')}
                    />
                  </Field>

                  <PackagePicker
                    label={t('form_label_extra_adult_package').replace('{number}', guestNumber)}
                    packages={packages}
                    selectedIds={adult.packages || []}
                    onToggle={(packageId) => handleToggleExtraAdultPackage(index, packageId)}
                  />
                </div>
              </section>
            );
          })}

          {/* 4. DATA ANAK (DYNAMIC LIST DENGAN TOMBOL TAMBAH) */}
          <section className="booking-form-section">
            <div className="section-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ borderBottom: 'none', padding: 0 }}>{t('form_sec_children_compact')}</h3>
                <span className="section-badge-info">
                  {form.children.length > 0 ? t('form_child_added').replace('{count}', form.children.length) : t('form_no_children')}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddChild}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>+</span> {t('form_add_child')}
              </button>
            </div>

            {form.children.length === 0 ? (
              <div className="booking-empty-children-box">
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👶</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {t('form_no_child_data')}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 12px' }}>
                  {t('form_no_child_desc')}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddChild}
                >
                  {t('form_add_child_data')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px', padding: '16px' }}>
                {form.children.map((child, index) => (
                  <div key={child.id || index} className="booking-child-card">
                    <div className="booking-child-header">
                      <span className="booking-child-tag">{t('form_child_tag').replace('{number}', index + 1)}</span>
                      <button
                        type="button"
                        className="booking-child-delete-btn"
                        onClick={() => handleRemoveChild(index)}
                        title={t('form_remove_child_title')}
                      >
                        {t('form_remove_child')}
                        <span hidden>
                        🗑️ Hapus
                        </span>
                      </button>
                    </div>

                    <div className="booking-form-grid" style={{ padding: 0 }}>
                      <Field label={t('form_label_child_name')}>
                        <input
                          className="input"
                          value={child.name}
                          onChange={(e) => handleChildFieldChange(index, 'name', e.target.value)}
                          placeholder={t('form_placeholder_child_name')}
                          required
                        />
                      </Field>

                      <Field label={t('form_label_child_age_years')}>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max="17"
                          value={child.age}
                          onChange={(e) => handleChildFieldChange(index, 'age', e.target.value)}
                          placeholder={t('form_placeholder_child_age')}
                          required
                        />
                      </Field>

                      <Field label="Gender">
                        <select
                          className="input"
                          value={child.gender}
                          onChange={(e) => handleChildFieldChange(index, 'gender', e.target.value)}
                        >
                          <option value="Male">{t('form_option_male')}</option>
                          <option value="Female">{t('form_option_female')}</option>
                        </select>
                      </Field>

                      <Field label={t('form_label_school_grade')}>
                        <input
                          className="input"
                          value={child.schoolGrade}
                          onChange={(e) => handleChildFieldChange(index, 'schoolGrade', e.target.value)}
                          placeholder={t('form_placeholder_grade')}
                        />
                      </Field>

                      <Field label={t('form_label_astronomy_interest')}>
                        <select
                          className="input"
                          value={child.astronomyLevel}
                          onChange={(e) => handleChildFieldChange(index, 'astronomyLevel', e.target.value)}
                        >
                          <option value="Beginner">{t('form_option_beginner')}</option>
                          <option value="Already curious">{t('form_option_curious')}</option>
                          <option value="Advanced for age">{t('form_option_advanced')}</option>
                        </select>
                      </Field>

                      <Field label={t('form_label_dietary')}>
                        <input
                          className="input"
                          value={child.dietaryRestrictions}
                          onChange={(e) => handleChildFieldChange(index, 'dietaryRestrictions', e.target.value)}
                          placeholder={t('form_placeholder_child_dietary')}
                        />
                      </Field>

                      <PackagePicker
                        label={t('form_label_child_package').replace('{number}', index + 1)}
                        packages={packages}
                        selectedIds={child.packages || []}
                        onToggle={(packageId) => handleToggleChildPackage(index, packageId)}
                      />

                      <Field label={t('form_label_child_notes')} wide>
                        <textarea
                          className="input"
                          value={child.comfortNotes}
                          onChange={(e) => handleChildFieldChange(index, 'comfortNotes', e.target.value)}
                          placeholder={t('form_placeholder_child_notes')}
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddChild}
                  style={{ justifySelf: 'start', marginTop: '4px' }}
                >
                  + {t('form_add_child')}
                </button>
              </div>
            )}
          </section>

          {/* 5. CONSENT & CATATAN */}
          <section className="booking-form-section">
            <h3>{t('form_sec_consent_notes')}</h3>
            <div className="booking-form-grid">
              <Field label={t('form_label_photo_consent')}>
                <select className="input" value={form.photoRequest} onChange={(e) => setField('photoRequest', e.target.value)}>
                  <option value="Ask guest first">{t('form_photo_ask')}</option>
                  <option value="Allowed">{t('form_photo_allowed')}</option>
                  <option value="Not allowed">{t('form_photo_not_allowed')}</option>
                </select>
              </Field>

              <Field label={t('form_label_weather_reschedule')}>
                <select className="input" value={form.rescheduleConsent} onChange={(e) => setField('rescheduleConsent', e.target.value)}>
                  <option value="Yes">{t('common_yes')}</option>
                  <option value="No">{t('common_no')}</option>
                  <option value="Ask guest first">{t('form_photo_ask')}</option>
                </select>
              </Field>

              <Field label={t('form_label_seating_setup')}>
                <input className="input" value={form.seatingSetup} onChange={(e) => setField('seatingSetup', e.target.value)} placeholder={t('form_placeholder_seating')} />
              </Field>

              <Field label={t('form_label_slot_status')}>
                <select className="input" value={form.slotStatus} onChange={(e) => setField('slotStatus', e.target.value)}>
                  <option value="available">{t('form_slot_available')}</option>
                  <option value="needs_check">{t('form_slot_check')}</option>
                  <option value="confirmed">{t('form_slot_confirmed')}</option>
                </select>
              </Field>

              <Field label={t('form_label_occasion_compact')} wide>
                <input className="input" value={form.specialOccasion} onChange={(e) => setField('specialOccasion', e.target.value)} placeholder={t('form_placeholder_occasion')} />
              </Field>

              <Field label={t('form_label_extra_details')} wide>
                <textarea className="input" value={form.packageNotes} onChange={(e) => setField('packageNotes', e.target.value)} placeholder={t('form_placeholder_extra')} />
              </Field>

              <Field label={t('form_label_internal_notes')} wide>
                <textarea className="input" maxLength={300} value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder={t('form_placeholder_internal_notes')} />
                <div className="char-counter">{form.notes.length}/300</div>
              </Field>
            </div>
          </section>

          {!canSubmitPackage && (
            <div className="external-booking-note" style={{ color: 'var(--accent)' }}>
              {t('form_package_required_note')}
            </div>
          )}

          <div className="booking-submit-row">
            <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', opacity: (!canSubmitPackage || submitting) ? 0.5 : 1 }} disabled={submitting || !canSubmitPackage}>
              {submitting ? t('btn_saving') : editingBooking ? t('btn_update_booking') : t('btn_submit')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCheckAvailability}>
              {t('btn_check_availability')}
            </button>
          </div>
        </form>
      </section>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}

function NotesPopupModal({ title, bookingCode, guestName, notes, onClose }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="notes-popup-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="notes-popup-modal">
        <div className="notes-popup-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                {title || t('view_notes_popup_title', 'Catatan Lengkap Form & Log Intake')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {t('notes_code')}: <strong>{bookingCode}</strong> &bull; {t('notes_guest')}: <strong>{guestName}</strong>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title={t('btn_close', 'Tutup')}>x</button>
        </div>

        <div className="notes-popup-body">
          <pre className="notes-pre-content">
            {notes || t('notes_empty')}
          </pre>
        </div>

        <div className="notes-popup-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
          >
            {copied ? t('btn_copied_success', '✓ Berhasil Disalin!') : t('btn_copy_notes', '📄 Salin Seluruh Catatan')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onClose}
          >
            {t('btn_close', 'Tutup Catatan')}
          </button>
        </div>
      </div>
    </div>
  );
}

function extractGuestName(line, fallbackName) {
  if (!line) return fallbackName || '-';
  const cleaned = line.replace(/^(Tamu Utama|Tamu 2 \(Pasangan\/Pendamping\)|Tamu 2|Ayah|Ibu|Anak\s*\d*)\s*:\s*/i, '').trim();
  if (cleaned.includes('|')) {
    const firstPart = cleaned.split('|')[0].trim();
    const matchAge = cleaned.match(/Umur\s*:\s*(\d+\s*thn?|\d+)/i);
    if (matchAge && matchAge[1]) {
      return `${firstPart} (${matchAge[1].trim()})`;
    }
    return firstPart || fallbackName || '-';
  }
  return cleaned || fallbackName || '-';
}

function extractChildName(line, defaultIndex) {
  if (!line) return `Anak #${defaultIndex}`;
  const cleaned = line.replace(/^Anak\s*\d*\s*:\s*/i, '').trim();
  if (cleaned.includes('|')) {
    const parts = cleaned.split('|').map((p) => p.trim());
    const name = parts[0] || `Anak #${defaultIndex}`;
    const agePart = parts.find((p) => /^Umur/i.test(p));
    if (agePart) {
      const ageVal = agePart.replace(/^Umur\s*:\s*/i, '').trim();
      return `${name} (${ageVal})`;
    }
    return name;
  }
  return cleaned || `Anak #${defaultIndex}`;
}

function StaffBookingView({ booking, onClose, onEdit, isInternal = false }) {
  const { language, t } = useLanguage();
  const [showNotesModal, setShowNotesModal] = useState(false);
  const notes = booking.package_notes || booking.notes || '';
  const leadLine = noteLine(notes, 'Tamu Utama') || noteLine(notes, 'Ayah');
  const companionLine = noteLine(notes, 'Tamu 2 (Pasangan/Pendamping)') || noteLine(notes, 'Tamu 2') || noteLine(notes, 'Ibu');
  
  const mainPkgName = booking.package_name || bookingPackageText(booking) || '-';

  const leadPkgFromAddons = addOnNames(booking.add_ons, 'Tamu Utama').concat(addOnNames(booking.add_ons, 'Ayah')).join(', ');
  const leadPackages = leadPkgFromAddons && leadPkgFromAddons !== '-' ? leadPkgFromAddons : mainPkgName;

  const compPkgFromAddons = addOnNames(booking.add_ons, 'Tamu 2').concat(addOnNames(booking.add_ons, 'Ibu')).join(', ');
  const companionPackages = compPkgFromAddons && compPkgFromAddons !== '-' ? compPkgFromAddons : mainPkgName;

  // Parse all child lines
  const childLines = String(notes || '').split('\n').filter((l) => /^Anak\s*\d*:/i.test(l));

  const leadName = extractGuestName(leadLine, booking.guest_name);
  const companionName = extractGuestName(companionLine, '-');

  const staffComm = Number(
    booking.staff_commission_5_usd ??
    booking.staffCommissionUsd ??
    booking.staff_commission_usd ??
    0
  );
  const starPoints = isInternal ? null : 1 + (Number(booking.child_count || 0) * 0.5);

  const modal = (
    <div className="modal-backdrop family-view-backdrop">
      <div className="modal family-view-modal">
        {/* Hero Header */}
        <div className="family-view-hero">
          <div>
            <span>{t('view_title', 'Detail Reservasi Staf Operasional')}</span>
            <h2>{booking.guest_name || '-'}</h2>
            <p>{booking.booking_code} / {booking.package_name || 'Package belum ada'}</p>
          </div>
          <div className="family-view-hero-actions">
            <span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status, language)}</span>
            <span className={`tag ${booking.signed_by_guest ? 'tag-completed' : 'tag-pending'}`}>
              {booking.signed_by_guest ? t('tag_signed', '✓ Signed') : t('tag_not_signed', '⏱ Not Signed')}
            </span>
            <button className="modal-close" onClick={onClose} title={t('btn_close', 'Tutup')}>x</button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body family-view-body">
          {/* Quick Operational Info Grid (8 Stats) */}
          <div className="family-view-grid">
            <ViewItem label={t('view_stat_date', 'Tanggal Observasi')} value={dateValue(booking.event_date)} />
            <ViewItem label={t('view_stat_time', 'Jam & Sesi')} value={`${timeValue(booking.time_start)} - ${timeValue(booking.time_end)}`} />
            <ViewItem label={t('view_stat_room', 'Nomor Kamar / Villa')} value={booking.room_number || '-'} />
            <ViewItem label={t('view_stat_nationality', 'Kebangsaan / Bahasa')} value={`${booking.nationality || '-'}${booking.preferred_language ? ` (${booking.preferred_language})` : ''}`} />
            <ViewItem label={t('view_stat_whatsapp', 'WhatsApp Tamu')} value={booking.guest_phone || '-'} />
            <ViewItem label={t('view_stat_pax', 'Jumlah Tamu')} value={`${booking.adult_count} ${language === 'en' ? 'Adults' : 'Dewasa'} / ${booking.child_count} ${language === 'en' ? 'Children' : 'Anak'}`} />
            <ViewItem label={t('view_stat_commission', 'Estimasi Komisi Staf')} value={`$${staffComm.toFixed(2)}`} />
            {!isInternal && (
              <ViewItem label={t('view_stat_star_reward', 'Reward Bintang')} value={`+${starPoints.toFixed(1)} ⭐`} />
            )}
          </div>

          {/* Package Observasi Banner */}
          <div className="family-view-section family-view-package-card">
            <div>
              <h3>{t('view_package_banner_title', 'Package Observasi Terpilih')}</h3>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                {bookingPackageText(booking) || booking.package_name || '-'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status, language)}</span>
              {booking.slot_status && <span className="tag tag-info">{booking.slot_status}</span>}
            </div>
          </div>

          {/* Dynamic Guest & Family Cards (Name + Package Only) */}
          <div className="family-view-family-grid">
            <FamilyViewCard
              title={t('view_guest_lead_title', 'Tamu Utama (Lead Guest)')}
              name={leadName}
              packageText={leadPackages}
            />

            {(Number(booking.adult_count) >= 2 || companionLine) && (
              <FamilyViewCard
                title={t('view_guest_companion_title', 'Tamu 2 (Pasangan/Pendamping)')}
                name={companionName}
                packageText={companionPackages}
              />
            )}

            {childLines.length > 0 ? (
              childLines.map((line, idx) => {
                const childNum = idx + 1;
                const cName = extractChildName(line, childNum);
                const cPkgFromAddons = addOnNames(booking.add_ons, `Anak ${childNum}`).concat(addOnNames(booking.add_ons, 'Anak')).join(', ');
                const cPkg = cPkgFromAddons && cPkgFromAddons !== '-' ? cPkgFromAddons : mainPkgName;
                return (
                  <FamilyViewCard
                    key={idx}
                    title={`${t('view_guest_child_title', 'Data Anak')} #${childNum}`}
                    name={cName}
                    packageText={cPkg}
                  />
                );
              })
            ) : (
              <FamilyViewCard
                title={t('view_guest_child_title', 'Data Anak')}
                name={Number(booking.child_count) > 0 ? `${booking.child_count} ${language === 'en' ? 'children' : 'anak'}` : t('view_guest_no_child', 'Tidak membawa anak (Couple / Dewasa saja)')}
                packageText={Number(booking.child_count) > 0 ? mainPkgName : '-'}
              />
            )}
          </div>

          {/* Trigger Section for Catatan Lengkap Sub-Modal (Popup Overlay) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 18 }}>
                📋
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {t('view_notes_banner_title', 'Rincian Catatan Lengkap & Log Form')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t('view_notes_banner_desc', 'Klik tombol di kanan untuk membuka popup tampilan teks catatan lengkap di depan layar.')}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'var(--violet)', color: 'var(--violet)', fontWeight: 700, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowNotesModal(true)}
            >
              <span>{t('btn_open_notes', '🔍 Buka Catatan Lengkap (Popup)')}</span>
            </button>
          </div>

          {/* Internal Staff Notes if any */}
          {booking.notes && (
            <div className="family-view-section">
              <h3>{t('view_staff_notes_title', 'Catatan Khusus Operasional Lapangan')}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('btn_close', 'Tutup')}</button>
          <button type="button" className="btn btn-primary" style={{ background: '#7c3aed' }} onClick={onEdit}>{t('btn_edit', 'Edit Booking')}</button>
        </div>
      </div>

      {/* Sub-modal Pop-up Catatan Lengkap */}
      {showNotesModal && (
        <NotesPopupModal
          title={t('view_notes_popup_title', 'Catatan Lengkap & Log Intake Form')}
          bookingCode={booking.booking_code}
          guestName={booking.guest_name}
          notes={notes}
          onClose={() => setShowNotesModal(false)}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function FamilyViewCard({ title, name, packageText }) {
  const { t } = useLanguage();
  return (
    <div className="family-view-card">
      <h3>{title}</h3>
      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: '4px 0 10px', minHeight: 26, display: 'flex', alignItems: 'center' }}>
        {name || '-'}
      </div>
      <div>
        <span>{t('common_package')}</span>
        <strong>{packageText || '-'}</strong>
      </div>
    </div>
  );
}

function ViewItem({ label, value }) {
  return (
    <div className="family-view-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`input-group ${wide ? 'booking-form-wide' : ''}`}>
      <span className="input-label">{label}</span>
      {children}
    </label>
  );
}

function PackagePicker({ label, packages, selectedIds, onToggle }) {
  return (
    <div className="input-group booking-form-wide">
      <span className="input-label">{label}</span>
      <div className="package-pick-grid">
        {packages.map((pkg) => (
          <label className="package-pick-row" key={pkg.id}>
            <input type="checkbox" checked={selectedIds.includes(pkg.id)} onChange={() => onToggle(pkg.id)} />
            <span>
              <strong>{pkg.name}</strong>
              {pkg.adult_price_usd !== undefined && (
                <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 6 }}>
                  (${Number(pkg.adult_price_usd)} / pax{pkg.location ? ` · ${pkg.location}` : ''})
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
