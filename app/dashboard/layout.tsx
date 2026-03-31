import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/actions';
import { Local } from '@/lib/types';
import TelegramButton from './telegram-button';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: memberships } = await supabase
    .from('local_members')
    .select('local_id, rol, locales(*)')
    .eq('user_id', user.id);

  const locales: (Local & { rol: string })[] = (memberships || []).map((m: any) => ({
    ...m.locales,
    rol: m.rol,
  }));

  if (locales.length === 0) {
    return (
      <div>
        <header style={headerStyles.header}>
          <div style={headerStyles.left}>
            <span style={{ fontSize: 24 }}>&#9749;</span>
            <h1 style={headerStyles.title}>Manolo Costeo</h1>
          </div>
          <div style={headerStyles.right}>
            <span style={headerStyles.email}>{user.email}</span>
            <form action={signOut}>
              <button type="submit" style={headerStyles.logoutBtn}>Salir</button>
            </form>
          </div>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <span style={{ fontSize: 64, display: 'block' }}>&#127978;</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>Bienvenido!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>
              Todavia no tenes ningun local. Crea el primero para empezar a registrar gastos.
            </p>
            <a href="/crear-local" style={{
              display: 'inline-block', padding: '12px 24px', background: 'var(--accent)',
              color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>
              Crear mi primer local
            </a>
          </div>
        </div>
      </div>
    );
  }

  const cookieStore = cookies();
  const selectedLocalId = cookieStore.get('selected_local')?.value;
  const selectedLocal = locales.find((l) => l.id === selectedLocalId) || locales[0];

  if (selectedLocal.id !== selectedLocalId) {
    cookieStore.set('selected_local', selectedLocal.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'manolocosteo_bot';
  const telegramLink = `https://t.me/${botUsername}?start=${selectedLocal.telegram_code}`;

  return (
    <div>
      <header style={headerStyles.header}>
        <div style={headerStyles.left}>
          <span style={{ fontSize: 24 }}>&#9749;</span>
          <div>
            <h1 style={headerStyles.title}>{selectedLocal.nombre}</h1>
            {locales.length > 1 && (
              <form style={{ marginTop: 4 }}>
                <select style={headerStyles.select} defaultValue={selectedLocal.id} name="localId">
                  {locales.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </form>
            )}
          </div>
        </div>
        <div style={headerStyles.right}>
          <TelegramButton telegramLink={telegramLink} />
          <a href="/dashboard/configuracion" style={headerStyles.link}>Config</a>
          <a href="/dashboard/invitar" style={headerStyles.link}>Invitar</a>
          <span style={headerStyles.email}>{user.email}</span>
          <form action={signOut}>
            <button type="submit" style={headerStyles.logoutBtn}>Salir</button>
          </form>
        </div>
      </header>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelector('select[name="localId"]')?.addEventListener('change', function(e) {
              document.cookie = 'selected_local=' + e.target.value + ';path=/;max-age=31536000';
              window.location.reload();
            });
          `,
        }}
      />
      {children}
    </div>
  );
}

const headerStyles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 20px', background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8,
  },
  left: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  select: {
    fontSize: 12, padding: '2px 6px', border: '1px solid var(--border)',
    borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  link: { fontSize: 13, color: 'var(--accent)', textDecoration: 'none' },
  email: { fontSize: 12, color: 'var(--text-muted)' },
  logoutBtn: {
    fontSize: 13, padding: '6px 12px', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)',
    color: 'var(--text-secondary)', cursor: 'pointer',
  },
};
