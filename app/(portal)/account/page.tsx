import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your account settings',
};

/**
 * Account Management Page
 *
 * Account settings and profile management
 *
 * Features:
 * - User profile information
 * - Account summary (orders, invoices)
 * - Contact preferences
 * - Password management
 * - Company/customer details
 *
 * Data source:
 * - /api/portal/account
 * - PortalUser, Customer models
 */
export default function AccountPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account navigation */}
        <div className="lg:col-span-1">
          <div className="rounded-[var(--radius-default)] bg-card p-4 card-shadow">
            <nav className="space-y-2">
              <button className="w-full text-left px-4 py-2 rounded-[var(--radius-default)] bg-muted font-medium">
                Profile
              </button>
              <button className="w-full text-left px-4 py-2 rounded-[var(--radius-default)] hover:bg-muted">
                Security
              </button>
              <button className="w-full text-left px-4 py-2 rounded-[var(--radius-default)] hover:bg-muted">
                Notifications
              </button>
              <button className="w-full text-left px-4 py-2 rounded-[var(--radius-default)] hover:bg-muted">
                Company Details
              </button>
            </nav>
          </div>
        </div>

        {/* Account content */}
        <div className="lg:col-span-2">
          <div className="rounded-[var(--radius-default)] bg-card p-6 card-shadow">
            <h2 className="mb-6">Profile Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-small font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-[var(--radius-default)] border border-input bg-background px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-small font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="w-full rounded-[var(--radius-default)] border border-input bg-background px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-small font-medium mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="w-full rounded-[var(--radius-default)] border border-input bg-background px-4 py-2"
                />
              </div>

              <div className="pt-4">
                <button className="rounded-[var(--radius-default)] bg-primary px-6 py-2 font-medium text-primary-foreground">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
