import './globals.css';
import type { Metadata } from 'next';

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
      <body>{children}</body>
    </html>
  );
}
