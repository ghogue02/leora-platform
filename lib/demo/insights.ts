/**
 * Demo Insights Dataset
 *
 * Provides deterministic analytics used when live data is unavailable.
 * Shared between demo API routes and dashboard pages so the UI can render
 * without a backing database.
 */

export interface DemoInsights {
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
    severity: 'low' | 'medium' | 'high';
    accountId: string;
    accountName: string;
    message: string;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderDate: string;
    totalAmount: number;
    customerName: string;
  }>;
  totals: {
    orders: number;
  };
}

const demoInsights: DemoInsights = {
  summary: {
    totalRevenue: 482750.25,
    revenueChange: 8.4,
    activeAccounts: 42,
    atRiskAccounts: 5,
    ordersThisMonth: 128,
    ordersChange: 6.2,
  },
  health: {
    healthy: 34,
    atRisk: 5,
    critical: 3,
    needsAttention: 6,
  },
  pace: {
    onPace: 119,
    slipping: 6,
    overdue: 3,
  },
  samples: {
    used: 18,
    allowance: 60,
    pending: 4,
    conversionRate: 31.5,
  },
  opportunities: [
    {
      productId: 'demo-product-pinot',
      productName: 'Willamette Valley Pinot Noir',
      potentialRevenue: 83500,
      customerPenetration: 32.5,
      category: 'Wine',
    },
    {
      productId: 'demo-product-cab',
      productName: 'Estate Reserve Cabernet',
      potentialRevenue: 76200,
      customerPenetration: 28.1,
      category: 'Wine',
    },
    {
      productId: 'demo-product-sparkling',
      productName: 'Sonoma Brut Sparkling',
      potentialRevenue: 52400,
      customerPenetration: 21.9,
      category: 'Sparkling',
    },
  ],
  alerts: [
    {
      id: 'demo-alert-revenue',
      type: 'revenue_risk',
      severity: 'medium',
      accountId: 'demo-account-harborview',
      accountName: 'Harborview Cellars',
      message: 'Revenue is tracking 18% below plan for October. Schedule a touchpoint.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-alert-orders',
      type: 'pace_risk',
      severity: 'high',
      accountId: 'demo-account-vineyard-market',
      accountName: 'Vineyard Market',
      message: 'No orders in the last 28 days. Follow up to prevent churn.',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  recentOrders: [
    {
      id: 'demo-order-1001',
      orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      totalAmount: 8250,
      customerName: 'Downtown Wine & Spirits',
    },
    {
      id: 'demo-order-1000',
      orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalAmount: 6180,
      customerName: 'Vineyard Market',
    },
    {
      id: 'demo-order-998',
      orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalAmount: 12940,
      customerName: 'Harborview Cellars',
    },
  ],
  totals: {
    orders: 486,
  },
};

export function getDemoInsights(): DemoInsights {
  return structuredClone(demoInsights);
}
