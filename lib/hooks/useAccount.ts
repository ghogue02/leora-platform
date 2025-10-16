/**
 * useAccount Hook
 *
 * Retrieves and updates the current portal account profile.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  customerId: string | null;
  companyName: string | null;
}

export interface AccountStats {
  ordersCount: number;
  invoicesCount: number;
  outstandingBalance: number;
  lastOrderDate: string | null;
}

export interface AccountSettings {
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
}

export interface AccountData {
  profile: AccountProfile;
  stats: AccountStats;
  settings: AccountSettings | null;
}

export function useAccount() {
  return useQuery<AccountData>({
    queryKey: ['account'],
    queryFn: async () => {
      const response = await fetch('/api/portal/account');
      if (!response.ok) {
        throw new Error('Failed to fetch account');
      }

      const data = await response.json();
      return data.data as AccountData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Pick<AccountProfile, 'firstName' | 'lastName' | 'phone' | 'companyName'>>) => {
      const response = await fetch('/api/portal/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });
}
