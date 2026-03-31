'use client';

import { useState } from 'react';

export default function TelegramButton({ telegramLink }: { telegramLink: string }) {
  const [open, setOpen] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(telegramLink)}`;

  return (
    <>
      <button onClick={() => setOpen(true)} style={btnStyle}>
        Agrega a Manolo
      </button>

      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={closeStyle}>&times;</button>

            <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
              Agrega a Manolo a Telegram
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
              Escanea el QR con tu celular o toca el link para agregar el bot y empezar a pasarle tus gastos.
            </p>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img src={qrUrl} alt="QR Telegram" width={220} height={220} style={{ borderRadius: 12 }} />
            </div>

            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              style={linkBtnStyle}
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
  background: '#0088cc',
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

const linkBtnStyle: React.CSSProperties = {
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
