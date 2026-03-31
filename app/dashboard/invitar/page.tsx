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
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Invitar al local</h2>

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
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, wordBreak: 'break-all' }}>{linkCopied}</p>
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
