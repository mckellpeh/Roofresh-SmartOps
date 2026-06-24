import './globals.css';
import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Roofresh Container Dashboard',
  description: 'IOT Mushroom Container Dashboard powered by SwitchBot',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
