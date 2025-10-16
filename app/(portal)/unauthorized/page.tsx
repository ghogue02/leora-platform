import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Access denied',
  description: 'You do not have permission to view this page.',
};

export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-6 text-center py-12">
      <div className="rounded-full bg-amber-50 p-6">
        <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-heading-xl font-semibold">Access denied</h1>
        <p className="text-body-md text-muted">
          You don&apos;t have the required permissions for this area.
          If you think this is a mistake, please contact your administrator.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/demo-dashboard"
          className="rounded-button bg-primary px-5 py-2 text-primary-foreground transition hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
        <Link
          href="/account"
          className="rounded-button border border-border px-5 py-2 text-body-md transition hover:bg-muted"
        >
          Manage account access
        </Link>
      </div>
    </div>
  );
}
