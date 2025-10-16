import { TrendingUp } from 'lucide-react';

interface Opportunity {
  productId: string;
  productName: string;
  potentialRevenue: number;
  customerPenetration: number;
  category: string;
}

interface TopOpportunitiesProps {
  opportunities: Opportunity[];
}

export function TopOpportunities({ opportunities }: TopOpportunitiesProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Top Opportunities</h3>
        </div>
      </div>
      <div className="p-6">
        {opportunities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No opportunities found
          </p>
        ) : (
          <div className="space-y-4">
            {opportunities.slice(0, 5).map((opp) => (
              <div
                key={opp.productId}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{opp.productName}</p>
                  <p className="text-xs text-muted-foreground">{opp.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(opp.potentialRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {opp.customerPenetration.toFixed(1)}% penetration
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
