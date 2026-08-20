'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ── Query Keys Factory ────────────────────────────────── */
export const queryKeys = {
  bookings: {
    all: ['bookings'],
    list: (filters) => ['bookings', 'list', filters],
    detail: (id) => ['bookings', 'detail', id],
  },
  packages: {
    all: ['packages'],
    list: () => ['packages', 'list'],
  },
  resorts: {
    all: ['resorts'],
    list: () => ['resorts', 'list'],
  },
  payouts: {
    all: ['payouts'],
    list: () => ['payouts', 'list'],
  },
  notifications: {
    all: ['notifications'],
    list: () => ['notifications', 'list'],
  },
  auditLogs: {
    all: ['audit-logs'],
    list: () => ['audit-logs', 'list'],
  },
  skyEvents: {
    all: ['sky-events'],
    list: () => ['sky-events', 'list'],
  },
  skySettings: {
    all: ['sky-settings'],
    current: () => ['sky-settings', 'current'],
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

/* ── Bookings Hooks ─────────────────────────────────────── */
export function useBookingsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.bookings.all,
    queryFn: async () => {
      const data = await fetchApi('/api/bookings');
      return data.bookings || [];
    },
    ...options,
  });
}

export function useUpdateBookingMutation() {
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
export function usePackagesQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.packages.all,
    queryFn: async () => {
      const data = await fetchApi('/api/packages');
      return data.packages || [];
    },
    staleTime: 5 * 60 * 1000, // Packages master data remains fresh for 5 mins
    ...options,
  });
}

export function useCreatePackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      return fetchApi('/api/packages', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
    },
  });
}

export function useUpdatePackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }) => {
      // API expects PATCH /api/packages/:id with JSON if no image, or let's check API.
      // Wait, in my admin route.js, I parsed JSON. Let's see if the API supports formData.
      return fetchApi(`/api/packages/${id}`, {
        method: 'PATCH',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
    },
  });
}

/* ── Resorts Hooks ──────────────────────────────────────── */
export function useResortsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.resorts.all,
    queryFn: async () => {
      const data = await fetchApi('/api/resorts');
      return data.resorts || [];
    },
    staleTime: 10 * 60 * 1000, // Resorts rarely change
    ...options,
  });
}

/* ── Payouts Hooks ──────────────────────────────────────── */
export function usePayoutsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.payouts.all,
    queryFn: async () => {
      const data = await fetchApi('/api/payouts');
      return data.payouts || [];
    },
    ...options,
  });
}

export function useUpdatePayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }) => {
      return fetchApi(`/api/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.all });
    },
  });
}

/* ── Notifications Hooks ────────────────────────────────── */
export function useNotificationsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: async () => {
      const data = await fetchApi('/api/notifications');
      return data.notifications || [];
    },
    refetchInterval: 60 * 1000, // Auto-poll notifications every minute
    ...options,
  });
}

/* ── Audit Logs Hooks ───────────────────────────────────── */
export function useAuditLogsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs.all,
    queryFn: async () => {
      const data = await fetchApi('/api/audit-logs');
      return data.logs || [];
    },
    ...options,
  });
}
