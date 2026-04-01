'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Local } from '@/lib/types';
import TelegramButton from './telegram-button';

interface SidebarProps {
  locales: (Local & { rol: string })[];
  selectedLocal: Local & { rol: string };
  userEmail: string;
  telegramLink: string;
  signOutAction: () => Promise<void>;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/gastos', label: 'Gastos', icon: '💰' },
  { href: '/dashboard/proveedores', label: 'Proveedores', icon: '🏪' },
  { href: '/dashboard/recetas', label: 'Recetas', icon: '🍳' },
  { href: '/dashboard/reportes', label: 'Reportes', icon: '📈' },
  { href: '/dashboard/asistente', label: 'Asistente', icon: '🤖' },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: '⚙️' },
];

export default function Sidebar({ locales, selectedLocal, userEmail, telegramLink, signOutAction }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `selected_local=${e.target.value};path=/;max-age=31536000`;
    window.location.reload();
  }

  const sidebarContent = (
    <>
      {/* Logo + Local */}
      <div style={styles.logoSection}>
        <div style={styles.logoRow}>
          <span style={{ fontSize: 22 }}>☕</span>
          <span style={styles.logoText}>Manolo Costeo</span>
        </div>
        <div style={styles.localSelector}>
          <div style={styles.localName}>{selectedLocal.nombre}</div>
          {locales.length > 1 && (
            <select
              style={styles.localSelect}
              defaultValue={selectedLocal.id}
              onChange={handleLocalChange}
            >
              {locales.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            style={{
              ...styles.navLink,
              ...(isActive(item.href) ? styles.navLinkActive : {}),
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Bottom: Telegram + User */}
      <div style={styles.bottomSection}>
        <div style={styles.telegramRow}>
          <TelegramButton telegramLink={telegramLink} />
        </div>
        <div style={styles.userSection}>
          <div style={styles.userEmail} title={userEmail}>
            {userEmail}
          </div>
          <form action={signOutAction}>
            <button type="submit" style={styles.logoutBtn}>Salir</button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        style={styles.hamburger}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        <span style={styles.hamburgerIcon}>{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          ...(mobileOpen ? styles.sidebarMobileOpen : {}),
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 240,
    background: 'var(--bg-primary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transition: 'transform 0.2s ease',
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 99,
  },
  hamburger: {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 101,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'none', // shown via CSS media query
  },
  hamburgerIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  logoSection: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  localSelector: {},
  localName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent)',
    marginBottom: 4,
  },
  localSelect: {
    width: '100%',
    fontSize: 12,
    padding: '4px 8px',
    border: '1px solid var(--border)',
    borderRadius: 4,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  navLinkActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  bottomSection: {
    borderTop: '1px solid var(--border)',
    padding: '12px 16px',
  },
  telegramRow: {
    marginBottom: 12,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userEmail: {
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  logoutBtn: {
    fontSize: 12,
    padding: '4px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
