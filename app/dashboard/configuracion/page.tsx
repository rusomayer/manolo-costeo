'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LocalInfo {
  id: string;
  nombre: string;
  direccion?: string;
  telegram_code: string;
}

interface TelegramLink {
  chat_id: number;
  created_at: string;
}

export default function ConfiguracionPage() {
  const [local, setLocal] = useState<LocalInfo | null>(null);
  const [telegramLink, setTelegramLink] = useState<TelegramLink | null>(null);
  const [botUsername, setBotUsername] = useState('');

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
        .select('id, nombre, direccion, telegram_code')
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

  const telegramDeepLink = botUsername
    ? `https://t.me/${botUsername}?start=${local.telegram_code}`
    : `t.me/TU_BOT?start=${local.telegram_code}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(telegramDeepLink)}`;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Configuracion</h2>

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
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Vincular Telegram</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Comparte este link o QR para que alguien vincule su chat de Telegram a este local.
          Los gastos que manden por Telegram se guardaran aca.
        </p>

        <p style={labelStyle}>Username del bot (sin @)</p>
        <input
          type="text"
          placeholder="ej: manolo_gastos_bot"
          value={botUsername}
          onChange={(e) => setBotUsername(e.target.value)}
          style={inputStyle}
        />

        <p style={labelStyle}>Link de vinculacion</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <code style={{
            flex: 1,
            padding: '10px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            wordBreak: 'break-all',
          }}>
            {telegramDeepLink}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(telegramDeepLink)}
            style={btnStyle}
          >
            Copiar
          </button>
        </div>

        <p style={labelStyle}>Codigo de vinculacion</p>
        <code style={{
          display: 'block',
          padding: '10px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 2,
          marginBottom: 16,
        }}>
          {local.telegram_code}
        </code>

        {botUsername && (
          <div style={{ textAlign: 'center' }}>
            <p style={labelStyle}>QR Code</p>
            <img src={qrUrl} alt="QR Telegram" width={200} height={200} style={{ borderRadius: 8 }} />
          </div>
        )}

        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontSize: 12, fontWeight: 600 }}>Estado</p>
          <p style={{ fontSize: 13, color: telegramLink ? 'var(--success)' : 'var(--text-muted)', marginTop: 2 }}>
            {telegramLink
              ? `Vinculado (chat ${telegramLink.chat_id})`
              : 'No vinculado aun'
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
