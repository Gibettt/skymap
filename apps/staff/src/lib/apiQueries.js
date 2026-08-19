'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ── Query Keys Factory ────────────────────────────────── */
export const queryKeys = {
  bookings: {
    all: ['staff-bookings'],
    list: (filters) => ['staff-bookings', 'list', filters],
    detail: (id) => ['staff-bookings', 'detail', id],
  },
  packages: {
    all: ['staff-packages'],
    list: () => ['staff-packages', 'list'],
  },
  resorts: {
    all: ['staff-resorts'],
    list: () => ['staff-resorts', 'list'],
  },
  payouts: {
    all: ['staff-payouts'],
    list: () => ['staff-payouts', 'list'],
  },
  notifications: {
    all: ['staff-notifications'],
    list: () => ['staff-notifications', 'list'],
  },
  me: {
    current: () => ['staff-me'],
  },
};

/* ── Fetchers ───────────────────────────────────────────── */
export async function fetchApi(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

/* ── Current User Hook ──────────────────────────────────── */
export function useCurrentUserQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.me.current(),
    queryFn: async () => {
      const data = await fetchApi('/api/me', { cache: 'no-store' });
      return data.user || null;
    },
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/* ── Bookings Hooks ─────────────────────────────────────── */
export function useStaffBookingsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.bookings.all,
    queryFn: async () => {
      const data = await fetchApi('/api/bookings', { cache: 'no-store' });
      return data.bookings || [];
    },
    refetchInterval: 4000,
    ...options,
  });
}

export function useUpdateStaffBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }) => {
      return fetchApi(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

/* ── Packages Hooks ─────────────────────────────────────── */
export function useStaffPackagesQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.packages.all,
    queryFn: async () => {
      const data = await fetchApi('/api/packages');
      return data.packages || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/* ── Resorts Hooks ──────────────────────────────────────── */
export function useStaffResortsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.resorts.all,
    queryFn: async () => {
      const data = await fetchApi('/api/resorts');
      return data.resorts || [];
    },
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/* ── Payouts Hooks ──────────────────────────────────────── */
export function useStaffPayoutsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.payouts.all,
    queryFn: async () => {
      const data = await fetchApi('/api/payouts', { cache: 'no-store' });
      return data.payouts || [];
    },
    ...options,
  });
}

export function useCreateStaffPayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      return fetchApi('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.all });
    },
  });
}
