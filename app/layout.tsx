import './globals.css';
import type { Metadata } from 'next';
import { UserProvider } from '@/contexts/user-context';
import { QueryProvider } from '@/contexts/query-provider';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export const metadata: Metadata = {
  title: 'Koffers - Personal Finance',
  description: 'AI-powered personal finance management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <UserProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
