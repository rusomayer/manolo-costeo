'use client';

import { useState } from 'react';

type Tab = 'whatsapp' | 'telegram';

export default function TelegramButton({ telegramLink, twiioCode }: { telegramLink: string; twiioCode?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('whatsapp');

  const telegramQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(telegramLink)}`;

  // WhatsApp URL con el comando /link
  const whatsappUrl = twiioCode
    ? `https://wa.me/14155238886?text=/link%20${encodeURIComponent(twiioCode)}`
    : 'https://wa.me/14155238886';

  const whatsappQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappUrl)}`;

  return (
    <>
      <button onClick={() => setOpen(true)} style={btnStyle}>
        🤖 Agrega a Manolo
      </button>

      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={closeStyle}>&times;</button>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setTab('whatsapp')}
                style={{
                  ...tabButtonStyle,
                  ...(tab === 'whatsapp' ? tabButtonActiveStyle : {}),
                }}
              >
                📱 WhatsApp
              </button>
              <button
                onClick={() => setTab('telegram')}
                style={{
                  ...tabButtonStyle,
                  ...(tab === 'telegram' ? tabButtonActiveStyle : {}),
                }}
              >
                ✈️ Telegram
              </button>
            </div>

            {/* WhatsApp Tab */}
            {tab === 'whatsapp' && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
                  Agrega a Manolo a WhatsApp
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
                  Escanea el QR o copia el código para vincularte al bot.
                </p>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img src={whatsappQrUrl} alt="QR WhatsApp" width={220} height={220} style={{ borderRadius: 12 }} />
                </div>

                {twiioCode && (
                  <div style={{ ...codeBoxStyle }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Código:</p>
                    <p style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-all', marginBottom: 12 }}>
                      {twiioCode}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`/link ${twiioCode}`);
                      }}
                      style={copyBtnStyle}
                    >
                      Copiar comando
                    </button>
                  </div>
                )}

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={whatsappBtnStyle}
                >
                  Abrir en WhatsApp
                </a>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 16 }}>
                  Si no se abre automáticamente, envía: <br />
                  <code style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                    /link {twiioCode}
                  </code>
                </p>
              </>
            )}

            {/* Telegram Tab */}
            {tab === 'telegram' && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
                  Agrega a Manolo a Telegram
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
                  Escanea el QR con tu celular o toca el link para agregar el bot.
                </p>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img src={telegramQrUrl} alt="QR Telegram" width={220} height={220} style={{ borderRadius: 12 }} />
                </div>

                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={telegramBtnStyle}
                >
                  Abrir en Telegram
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(telegramLink);
                  }}
                  style={copyBtnStyle}
                >
                  Copiar link
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 14px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: '#25D366',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  borderRadius: 'var(--radius)',
  padding: 32,
  maxWidth: 380,
  width: '100%',
  position: 'relative',
  border: '1px solid var(--border)',
};

const closeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 16,
  background: 'none',
  border: 'none',
  fontSize: 24,
  color: 'var(--text-muted)',
  cursor: 'pointer',
};

const tabButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  transition: 'all 0.15s',
};

const tabButtonActiveStyle: React.CSSProperties = {
  color: 'var(--accent)',
  borderBottomColor: 'var(--accent)',
  fontWeight: 600,
};

const whatsappBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  background: '#25D366',
  color: '#fff',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
  textDecoration: 'none',
  marginBottom: 8,
  border: 'none',
  cursor: 'pointer',
};

const telegramBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  background: '#0088cc',
  color: '#fff',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
  textDecoration: 'none',
  marginBottom: 8,
};

const copyBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const codeBoxStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: 12,
  marginBottom: 16,
};
