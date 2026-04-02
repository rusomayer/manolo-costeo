'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrearLocalPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/crear-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          direccion,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al crear el local');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <span style={{ fontSize: 48, textAlign: 'center', display: 'block' }}>&#127978;</span>
        <h1 style={styles.title}>Crea tu primer local</h1>
        <p style={styles.subtitle}>
          Agrega tu cafe, bar o restaurante para empezar a registrar gastos.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nombre del local</label>
          <input
            type="text"
            placeholder="Ej: Cafe Manolo"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Direccion (opcional)</label>
          <input
            type="text"
            placeholder="Ej: Av. Corrientes 1234"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Creando...' : 'Crear local'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'var(--bg-secondary)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius)',
    padding: 32,
    border: '1px solid var(--border)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center' as const,
    marginTop: 12,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    marginTop: 4,
    marginBottom: 28,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 8,
  },
  submitBtn: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
};
