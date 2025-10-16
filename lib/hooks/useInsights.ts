/**
 * useInsights Hook
 *
 * React Query hook for fetching portal insights and analytics
 */

import { useQuery } from '@tanstack/react-query';

export interface InsightsData {
  summary: {
    totalRevenue: number;
    revenueChange: number;
    activeAccounts: number;
    atRiskAccounts: number;
    ordersThisMonth: number;
    ordersChange: number;
  };
  health: {
    healthy: number;
    atRisk: number;
    critical: number;
    needsAttention: number;
  };
  pace: {
    onPace: number;
    slipping: number;
    overdue: number;
  };
  samples: {
    used: number;
    allowance: number;
    pending: number;
    conversionRate: number;
  };
  opportunities: Array<{
    productId: string;
    productName: string;
    potentialRevenue: number;
    customerPenetration: number;
    category: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    accountId: string;
    accountName: string;
    message: string;
    createdAt: string;
  }>;
}

interface UseInsightsOptions {
  type?: string;
  startDate?: string;
  endDate?: string;
}

export function useInsights(options: UseInsightsOptions = {}) {
  return useQuery<InsightsData>({
    queryKey: ['insights', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await fetch(`/api/portal/insights?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
