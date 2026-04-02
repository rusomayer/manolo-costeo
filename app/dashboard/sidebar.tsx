'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Store,
  Receipt,
  Truck,
  ChefHat,
  BarChart2,
  Bot,
  Settings,
  ChevronDown,
  Plus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Local } from '@/lib/types';
import TelegramButton from './telegram-button';

interface SidebarProps {
  locales: (Local & { rol: string })[];
  selectedLocal: Local & { rol: string };
  userEmail: string;
  telegramLink: string;
  twiioCode?: string;
  signOutAction: () => Promise<void>;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',               label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/mi-local',      label: 'Mi Local',     icon: Store           },
  { href: '/dashboard/gastos',        label: 'Gastos',       icon: Receipt         },
  { href: '/dashboard/asistente',     label: 'Asistente IA', icon: Bot             },
  { href: '/dashboard/proveedores',   label: 'Proveedores',  icon: Truck           },
  { href: '/dashboard/recetas',       label: 'Recetas',      icon: ChefHat         },
  { href: '/dashboard/reportes',      label: 'Reportes',     icon: BarChart2       },
  { href: '/dashboard/configuracion', label: 'Configuración',icon: Settings        },
];

export default function Sidebar({ locales, selectedLocal, userEmail, telegramLink, twiioCode, signOutAction }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const localMenuRef = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function handleLocalChange(localId: string) {
    document.cookie = `selected_local=${localId};path=/;max-age=31536000`;
    window.location.reload();
  }

  // Sincroniza la cookie con el local seleccionado (fix para móvil sin cookie)
  useEffect(() => {
    const currentCookie = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('selected_local='))
      ?.split('=')[1]?.trim();

    if (currentCookie !== selectedLocal.id) {
      document.cookie = `selected_local=${selectedLocal.id};path=/;max-age=31536000`;
      if (!currentCookie) {
        // Primera vez sin cookie (ej: móvil): recargar para que todas las queries la tomen
        window.location.reload();
      }
    }
  }, [selectedLocal.id]);

  // Cierra el menú al click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (localMenuRef.current && !localMenuRef.current.contains(e.target as Node)) {
        setLocalMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={styles.logoSection}>
        <Image
          src="/logo.png"
          alt="Manolo"
          width={180}
          height={72}
          style={{ objectFit: 'contain', objectPosition: 'left' }}
          priority
        />
      </div>

      {/* Local selector */}
      <div style={styles.localSection} ref={localMenuRef}>
        <button
          onClick={() => setLocalMenuOpen(prev => !prev)}
          style={styles.localBtn}
        >
          <div style={styles.localBtnInner}>
            <span style={styles.localBtnDot} />
            <span style={styles.localBtnName}>{selectedLocal.nombre}</span>
          </div>
          <ChevronDown
            size={14}
            style={{
              flexShrink: 0,
              color: 'var(--text-muted)',
              transform: localMenuOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {localMenuOpen && (
          <div style={styles.localDropdown}>
            {locales.map((l) => (
              <button
                key={l.id}
                onClick={() => { handleLocalChange(l.id); setLocalMenuOpen(false); }}
                style={{
                  ...styles.localDropdownItem,
                  ...(l.id === selectedLocal.id ? styles.localDropdownItemActive : {}),
                }}
              >
                <span style={{
                  ...styles.localBtnDot,
                  background: l.id === selectedLocal.id ? 'var(--accent)' : 'var(--border)',
                }} />
                {l.nombre}
                {l.id === selectedLocal.id && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>activo</span>
                )}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
              <a
                href="/crear-local"
                style={styles.localDropdownAdd}
                onClick={() => setLocalMenuOpen(false)}
              >
                <Plus size={13} />
                Agregar local
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                ...styles.navLink,
                ...(active ? styles.navLinkActive : {}),
              }}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Bottom: Telegram + User */}
      <div style={styles.bottomSection}>
        <div style={styles.telegramRow}>
          <TelegramButton telegramLink={telegramLink} twiioCode={twiioCode} />
          <a
            href="/dashboard/mi-local#equipo"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              marginTop: 8,
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <UserPlus size={15} />
            Invitar colaborador
          </a>
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
    padding: '20px 16px 12px',
  },
  localSection: {
    padding: '0 12px 12px',
    borderBottom: '1px solid var(--border)',
    position: 'relative',
  },
  localBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-secondary)',
    cursor: 'pointer',
    gap: 8,
  },
  localBtnInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  localBtnDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
  } as React.CSSProperties,
  localBtnName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  localDropdown: {
    position: 'absolute',
    top: 'calc(100% - 4px)',
    left: 12,
    right: 12,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 200,
    padding: 4,
  } as React.CSSProperties,
  localDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-primary)',
    textAlign: 'left' as const,
  },
  localDropdownItemActive: {
    background: 'var(--bg-secondary)',
    fontWeight: 600,
  },
  localDropdownAdd: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--accent)',
    fontWeight: 500,
    textDecoration: 'none',
  } as React.CSSProperties,
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
