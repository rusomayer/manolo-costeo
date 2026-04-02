'use client';

import { useState } from 'react';

type Tab = 'whatsapp' | 'telegram';

function WhatsAppIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.22 8.22 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32A8.188 8.188 0 0 1 3.8 11.9c.01-4.54 3.7-8.24 8.24-8.24zm-1.51 4.66c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1.02 2.56.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.1-.22-.16-.47-.28-.25-.13-1.47-.73-1.7-.81-.22-.08-.38-.12-.54.12-.17.25-.64.81-.78.97-.14.17-.28.19-.53.06-.25-.13-1.05-.39-2-.12-.75-.66-1.24-1.47-1.39-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.54-1.36-.74-1.85-.2-.48-.4-.42-.55-.43h-.47z"/>
    </svg>
  );
}

function TelegramIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.4l-2.956-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.884.16z"/>
    </svg>
  );
}

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
        <WhatsAppIcon size={15} color="#fff" />
        Agrega a Manolo
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
                  ...(tab === 'whatsapp' ? { ...tabButtonActiveStyle, borderBottomColor: '#25D366', color: '#25D366' } : {}),
                }}
              >
                <WhatsAppIcon size={15} color={tab === 'whatsapp' ? '#25D366' : 'var(--text-muted)'} />
                WhatsApp
              </button>
              <button
                onClick={() => setTab('telegram')}
                style={{
                  ...tabButtonStyle,
                  ...(tab === 'telegram' ? { ...tabButtonActiveStyle, borderBottomColor: '#0088cc', color: '#0088cc' } : {}),
                }}
              >
                <TelegramIcon size={15} color={tab === 'telegram' ? '#0088cc' : 'var(--text-muted)'} />
                Telegram
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
                  <WhatsAppIcon size={18} color="#fff" />
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
                  <TelegramIcon size={18} color="#fff" />
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
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  padding: '8px 14px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: '#25D366',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
  justifyContent: 'center',
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '12px 16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '12px 16px',
  background: '#25D366',
  color: '#fff',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  marginBottom: 8,
  boxSizing: 'border-box',
};

const telegramBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '12px 16px',
  background: '#0088cc',
  color: '#fff',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  marginBottom: 8,
  boxSizing: 'border-box',
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
