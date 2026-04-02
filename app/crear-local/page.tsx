'use client';

import { useRef, useState } from 'react';
import { crearLocal } from '@/lib/actions';

export default function CrearLocalPage() {
  const tzRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');

    // Inject timezone before submitting
    formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

    try {
      await crearLocal(formData);
    } catch (e: any) {
      setError(e?.message || 'Error al crear el local');
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

        <form action={handleSubmit}>
          <label style={styles.label} htmlFor="nombre">Nombre del local</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Cafe Manolo"
            required
            style={styles.input}
          />

          <label style={styles.label} htmlFor="direccion">Direccion (opcional)</label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            placeholder="Ej: Av. Corrientes 1234"
            style={styles.input}
          />

          <input type="hidden" name="timezone" ref={tzRef} />

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
