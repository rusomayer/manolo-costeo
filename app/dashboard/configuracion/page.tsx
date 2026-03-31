'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LocalInfo {
  id: string;
  nombre: string;
  direccion?: string;
  telegram_code: string;
  timezone: string;
}

interface TelegramLink {
  chat_id: number;
  created_at: string;
}

export default function ConfiguracionPage() {
  const [local, setLocal] = useState<LocalInfo | null>(null);
  const [telegramLink, setTelegramLink] = useState<TelegramLink | null>(null);
  const [tzSaved, setTzSaved] = useState(false);

  const supabase = createClient();

  function getLocalId() {
    return document.cookie.split(';').find(c => c.trim().startsWith('selected_local='))?.split('=')[1] || '';
  }

  useEffect(() => {
    async function load() {
      const localId = getLocalId();
      if (!localId) return;

      const { data: localData } = await supabase
        .from('locales')
        .select('id, nombre, direccion, telegram_code, timezone')
        .eq('id', localId)
        .single();

      if (localData) setLocal(localData);

      const { data: linkData } = await supabase
        .from('telegram_links')
        .select('chat_id, created_at')
        .eq('local_id', localId)
        .maybeSingle();

      if (linkData) setTelegramLink(linkData);
    }
    load();
  }, []);

  if (!local) return <div style={{ padding: 20 }}>Cargando...</div>;

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'manolocosteo_bot';
  const telegramDeepLink = `https://t.me/${botUsername}?start=${local.telegram_code}`;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Configuracion</h2>
        <a href="/dashboard" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Volver al dashboard</a>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Datos del local</h3>
        <p style={labelStyle}>Nombre</p>
        <p style={valueStyle}>{local.nombre}</p>
        {local.direccion && (
          <>
            <p style={labelStyle}>Direccion</p>
            <p style={valueStyle}>{local.direccion}</p>
          </>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Zona horaria</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Se usa para registrar las fechas correctas de los gastos por Telegram.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={local.timezone}
            onChange={(e) => setLocal({ ...local, timezone: e.target.value })}
            style={{ ...inputStyle, flex: 1 }}
          >
            {Intl.supportedValuesOf('timeZone').filter(tz => tz.startsWith('America/')).map(tz => (
              <option key={tz} value={tz}>{tz.replace('America/', '').replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.from('locales').update({ timezone: local.timezone }).eq('id', local.id);
              setTzSaved(true);
              setTimeout(() => setTzSaved(false), 2000);
            }}
            style={btnStyle}
          >
            {tzSaved ? 'Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Telegram</h3>
        <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontSize: 12, fontWeight: 600 }}>Estado</p>
          <p style={{ fontSize: 13, color: telegramLink ? 'var(--success)' : 'var(--text-muted)', marginTop: 2 }}>
            {telegramLink
              ? `Vinculado (chat ${telegramLink.chat_id})`
              : 'No vinculado aun — usa el boton "Agrega a Manolo" en el dashboard'
            }
          </p>
        </div>
      </div>
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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
  marginTop: 12,
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-primary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  marginBottom: 8,
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
  whiteSpace: 'nowrap',
};
