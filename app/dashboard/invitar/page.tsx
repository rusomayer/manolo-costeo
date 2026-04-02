'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Invitation {
  id: string;
  codigo: string;
  tipo: string;
  email?: string;
  estado: string;
  created_at: string;
  expires_at: string;
}

export default function InvitarPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  function getLocalId() {
    return document.cookie.split(';').find(c => c.trim().startsWith('selected_local='))?.split('=')[1] || '';
  }

  async function loadInvitations() {
    const localId = getLocalId();
    if (!localId) return;

    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('local_id', localId)
      .order('created_at', { ascending: false });

    setInvitations(data || []);
  }

  useEffect(() => { loadInvitations(); }, []);

  async function generarLink() {
    setLoading(true);
    const localId = getLocalId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !localId) return;

    const { data } = await supabase
      .from('invitations')
      .insert([{ local_id: localId, tipo: 'link', created_by: user.id }])
      .select()
      .single();

    if (data) {
      const url = `${window.location.origin}/invite/${data.codigo}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(url);
      await loadInvitations();
    }
    setLoading(false);
  }

  async function invitarPorEmail() {
    if (!email) return;
    setLoading(true);
    const localId = getLocalId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !localId) return;

    const { data } = await supabase
      .from('invitations')
      .insert([{ local_id: localId, tipo: 'email', email, created_by: user.id }])
      .select()
      .single();

    if (data) {
      const url = `${window.location.origin}/invite/${data.codigo}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(url);
      setEmail('');
      await loadInvitations();
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Invitar al local</h2>
        <a href="/dashboard" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Volver al dashboard</a>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Generar link de invitacion</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Cualquiera con el link puede unirse a tu local. Expira en 7 dias.
        </p>
        <button onClick={generarLink} disabled={loading} style={btnStyle}>
          Generar link
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Invitar por email</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={invitarPorEmail} disabled={loading || !email} style={btnStyle}>
            Invitar
          </button>
        </div>
      </div>

      {linkCopied && (
        <div style={{ ...cardStyle, background: '#1987541a', border: '1px solid var(--success)' }}>
          <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>Link copiado al portapapeles!</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 12, wordBreak: 'break-all' }}>{linkCopied}</p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Te invito a unirte a mi local en Manolo Costeo: ${linkCopied}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              background: '#25D366',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Compartir por WhatsApp
          </a>
        </div>
      )}

      {invitations.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Invitaciones enviadas</h3>
          {invitations.map((inv) => (
            <div key={inv.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{inv.tipo === 'email' ? inv.email : 'Link'}</span>
              <span style={{
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                background: inv.estado === 'accepted' ? '#1987541a' : inv.estado === 'pending' ? '#ffc1071a' : '#dc35451a',
                color: inv.estado === 'accepted' ? 'var(--success)' : inv.estado === 'pending' ? '#b8860b' : 'var(--danger)',
              }}>
                {inv.estado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 20,
  marginBottom: 16,
};

const btnStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
};
