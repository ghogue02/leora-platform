import { Package } from 'lucide-react';

interface Order {
  id: string;
  orderDate: string;
  totalAmount: number;
  customerName: string;
}

interface RecentOrdersProps {
  orders: Order[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Recent Orders</h3>
        </div>
      </div>
      <div className="p-6">
        {orders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No recent orders
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.orderDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(order.totalAmount)}
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
