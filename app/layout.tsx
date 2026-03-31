import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gastos Café',
  description: 'Dashboard de gastos de tu café',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
