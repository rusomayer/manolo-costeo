import { crearLocal } from '@/lib/actions';

export default function CrearLocalPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <span style={{ fontSize: 48, textAlign: 'center', display: 'block' }}>&#127978;</span>
        <h1 style={styles.title}>Crea tu primer local</h1>
        <p style={styles.subtitle}>
          Agrega tu cafe, bar o restaurante para empezar a registrar gastos.
        </p>

        <form action={crearLocal}>
          <label style={styles.label}>Nombre del local</label>
          <input
            name="nombre"
            type="text"
            placeholder="Ej: Cafe Manolo"
            required
            style={styles.input}
          />

          <label style={styles.label}>Direccion (opcional)</label>
          <input
            name="direccion"
            type="text"
            placeholder="Ej: Av. Corrientes 1234"
            style={styles.input}
          />

          <button type="submit" style={styles.submitBtn}>
            Crear local
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
