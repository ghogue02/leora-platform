import type { Metadata } from 'next';
import AccountPageClient from './AccountPageClient';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your account settings',
};

export default function AccountPage() {
  return <AccountPageClient />;
}
