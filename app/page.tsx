import { redirect } from 'next/navigation';

/**
 * Root homepage - redirects to demo dashboard
 * This ensures users land directly in the portal experience
 */
export default function HomePage() {
  redirect('/demo-dashboard');
}
