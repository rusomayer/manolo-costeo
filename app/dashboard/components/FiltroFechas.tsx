'use client';

interface FiltroFechasProps {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
}

export default function FiltroFechas({ desde, hasta, onChange }: FiltroFechasProps) {
  const hoy = new Date();

  function ultimos30Dias() {
    const h = new Date();
    const d = new Date();
    d.setDate(d.getDate() - 30);
    onChange(formatDate(d), formatDate(h));
  }

  function mesActual() {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const h = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    onChange(formatDate(d), formatDate(h));
  }

  function mesAnterior() {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const h = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    onChange(formatDate(d), formatDate(h));
  }

  function formatDate(d: Date): string {
    return d.toLocaleDateString('en-CA');
  }

  // Detect active preset
  const mesActualDesde = formatDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const mesActualHasta = formatDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
  const mesAnteriorDesde = formatDate(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  const mesAnteriorHasta = formatDate(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
  const ultimos30Desde = formatDate((() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })());
  const ultimos30Hasta = formatDate(hoy);

  const isMesActual = desde === mesActualDesde && hasta === mesActualHasta;
  const isMesAnterior = desde === mesAnteriorDesde && hasta === mesAnteriorHasta;
  const isUltimos30 = desde === ultimos30Desde && hasta === ultimos30Hasta;

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={mesActual} style={btnStyle(isMesActual)}>Mes actual</button>
      <button onClick={mesAnterior} style={btnStyle(isMesAnterior)}>Mes anterior</button>
      <button onClick={ultimos30Dias} style={btnStyle(isUltimos30)}>Últimos 30 días</button>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          type="date"
          value={desde}
          onChange={(e) => onChange(e.target.value, hasta)}
          style={inputStyle}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>a</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => onChange(desde, e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg-primary)',
    color: active ? '#fff' : 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
  };
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '13px',
};
