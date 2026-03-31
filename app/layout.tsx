import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Manolo Costeo',
  description: 'Registra y controla los gastos de tu local',
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
