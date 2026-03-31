import { createClient } from '@/lib/supabase/server';
import { aceptarInvitacion } from '@/lib/actions';
import { redirect } from 'next/navigation';

export default async function InvitePage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in -> redirect to login with return URL
  if (!user) {
    redirect(`/?next=/invite/${params.code}`);
  }

  // Look up invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, locales(nombre)')
    .eq('codigo', params.code)
    .eq('estado', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}>Invitacion invalida</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
            Esta invitacion no existe, ya fue usada o expiro.
          </p>
          <a href="/dashboard" style={linkStyle}>Ir al dashboard</a>
        </div>
      </div>
    );
  }

  const localName = (invitation as any).locales?.nombre || 'un local';

  async function handleAccept() {
    'use server';
    await aceptarInvitacion(params.code);
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <span style={{ fontSize: 48, textAlign: 'center', display: 'block' }}>&#127881;</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginTop: 12 }}>
          Te invitaron!
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
          Te invitaron a unirte a <strong>{localName}</strong>
        </p>
        <form action={handleAccept}>
          <button type="submit" style={btnStyle}>
            Aceptar invitacion
          </button>
        </form>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'var(--bg-secondary)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  background: 'var(--bg-primary)',
  borderRadius: 'var(--radius)',
  padding: 32,
  border: '1px solid var(--border)',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 24,
};

const linkStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  marginTop: 20,
  fontSize: 14,
  color: 'var(--accent)',
};
