'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import TelegramButton from '../telegram-button';

interface SidebarLocal {
  id: string;
  nombre: string;
  rol: string;
}

interface SidebarProps {
  locales: SidebarLocal[];
  selectedLocal: SidebarLocal;
  userEmail: string;
  telegramLink: string;
  signOutAction: () => Promise<void>;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
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

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function handleLocalChange(localId: string) {
    document.cookie = `selected_local=${localId};path=/;max-age=31536000`;
    window.location.reload();
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <span style={{ fontSize: 20 }}>☰</span>
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Header: Logo + Local */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span style={{ fontSize: 28 }}>☕</span>
            <div>
              <h1 className="sidebar-title">{selectedLocal.nombre}</h1>
              {locales.length > 1 && (
                <select
                  className="sidebar-local-select"
                  defaultValue={selectedLocal.id}
                  onChange={(e) => handleLocalChange(e.target.value)}
                >
                  {locales.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href, item.exact) ? 'sidebar-nav-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Footer: Telegram + User */}
        <div className="sidebar-footer">
          <TelegramButton telegramLink={telegramLink} />
          <div className="sidebar-user">
            <span className="sidebar-email">{userEmail}</span>
            <form action={signOutAction}>
              <button type="submit" className="sidebar-logout-btn">Salir</button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
