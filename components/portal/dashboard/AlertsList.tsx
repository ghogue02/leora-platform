import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  severity: string;
  accountId: string;
  accountName: string;
  message: string;
  createdAt: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-6">
        <h3 className="font-semibold">Alerts</h3>
      </div>
      <div className="p-6">
        {alerts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No alerts at this time
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {alert.accountName && (
                      <p className="text-xs text-muted-foreground">
                        Account: {alert.accountName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
