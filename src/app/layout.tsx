import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import ClientNavbar from '@/components/ClientNavbar';
import Footer from '@/components/Footer';
import LiveWinnerToast from '@/components/LiveWinnerToast';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'T CPI — 10-Box Mystery Number Draw | Win KSh 100,000',
  description:
    'Experience T CPI: Match 10 ordered mystery numbers to claim the KSh 100,000 grand prize. Server-verified RNG, Paystack M-PESA payments, and transparent audit logs.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020617',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth bg-slate-950 text-slate-100" style={{ colorScheme: 'dark' }}>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
        <ClientNavbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
        <LiveWinnerToast />
        <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
