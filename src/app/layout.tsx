import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UIGen — AI React Component Generator',
  description:
    'Generate beautiful React components with AI. Describe what you want and watch it come to life.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
