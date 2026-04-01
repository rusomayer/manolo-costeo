'use client';

import { useState, useRef, useEffect } from 'react';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

const SUGERENCIAS = [
  '¿Cuánto gasté este mes?',
  '¿Cuánto pago el kilo de café?',
  '¿Cuáles son mis gastos fijos?',
  '¿Cuál es mi proveedor más caro?',
  'Compará este mes con el anterior',
  '¿Cuánto gasté en insumos este mes?',
];

export default function AsistentePage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensajes]);

  async function enviar(texto?: string) {
    const msg = texto || input.trim();
    if (!msg || loading) return;

    const nuevosMensajes: Mensaje[] = [...mensajes, { role: 'user', content: msg }];
    setMensajes(nuevosMensajes);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: nuevosMensajes }),
      });

      const data = await res.json();

      if (data.respuesta) {
        setMensajes([...nuevosMensajes, { role: 'assistant', content: data.respuesta }]);
      } else {
        setMensajes([...nuevosMensajes, { role: 'assistant', content: 'Hubo un error procesando tu consulta. Intentá de nuevo.' }]);
      }
    } catch (error) {
      setMensajes([...nuevosMensajes, { role: 'assistant', content: 'Error de conexión. Intentá de nuevo.' }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>🤖 Asistente Manolo</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Preguntale sobre tus costos, precios, gastos y recetas. Manolo consulta tu base de datos para darte respuestas con datos reales.
        </p>
      </header>

      {/* Chat area */}
      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: 20,
          marginBottom: 16,
        }}
      >
        {mensajes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>☕</span>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Hola! Soy Manolo</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Preguntame lo que quieras sobre los costos de tu local.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGERENCIAS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => enviar(s)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mensajes.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: 16,
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'assistant' && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      🤖 Manolo
                    </span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 16,
                  background: 'var(--bg-secondary)',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    🤖 Manolo
                  </span>
                  Consultando datos...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preguntale a Manolo..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={() => enviar()}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: loading || !input.trim() ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: loading || !input.trim() ? 'var(--text-muted)' : '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
