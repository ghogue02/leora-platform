'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAccount, useUpdateAccount } from '@/lib/hooks/useAccount';

export default function AccountPageClient() {
  const { data, isLoading, error } = useAccount();
  const updateAccount = useUpdateAccount();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (data) {
      setFirstName(data.profile.firstName ?? '');
      setLastName(data.profile.lastName ?? '');
      setPhone(data.profile.phone ?? '');
      setCompanyName(data.profile.companyName ?? '');
    }
  }, [data]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAccount.mutate({
      firstName,
      lastName,
      phone,
      companyName,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-1" />
          <Skeleton className="h-64 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          title="Unable to load account"
          description="Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-2 text-heading-xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1 space-y-4">
          <div>
            <p className="text-label text-muted mb-1">Email</p>
            <p className="font-medium">{data.profile.email}</p>
          </div>
          <div>
            <p className="text-label text-muted mb-1">Company</p>
            <p className="font-medium">
              {data.profile.companyName || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-label text-muted mb-1">Outstanding Balance</p>
            <p className="text-heading-sm font-semibold text-warning">
              {formatCurrency(data.stats.outstandingBalance)}
            </p>
          </div>
          <div>
            <p className="text-label text-muted mb-1">Last Order</p>
            <p className="font-medium">
              {data.stats.lastOrderDate
                ? formatDate(data.stats.lastOrderDate)
                : 'No orders yet'}
            </p>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-heading-lg font-semibold">Profile Information</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-small font-medium mb-2">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-small font-medium mb-2">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-small font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-small font-medium mb-2">
                  Company Name
                </label>
                <Input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button type="submit" loading={updateAccount.isPending}>
                Save Changes
              </Button>
              {updateAccount.isSuccess && (
                <span className="text-success text-body-sm">Profile updated!</span>
              )}
              {updateAccount.isError && (
                <span className="text-destructive text-body-sm">
                  Failed to update profile.
                </span>
              )}
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-label text-muted mb-1">Orders</p>
          <p className="text-heading-lg font-semibold">{data.stats.ordersCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-label text-muted mb-1">Invoices</p>
          <p className="text-heading-lg font-semibold">{data.stats.invoicesCount}</p>
        </Card>
        {data.settings && (
          <Card className="p-6">
            <p className="text-label text-muted mb-1">Preferences</p>
            <p className="text-body-md">
              Currency: {data.settings.defaultCurrency}
            </p>
            <p className="text-body-md">
              Timezone: {data.settings.timezone}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
