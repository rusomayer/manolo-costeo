'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from 'recharts';

type ReportTab = 'evolucion' | 'categorias' | 'proveedores' | 'precios';

const CATEGORIAS_COLORES: Record<string, string> = {
  insumos: '#7F77DD', servicios: '#378ADD', sueldos: '#1D9E75',
  alquiler: '#D85A30', impuestos: '#639922', mantenimiento: '#D4537E', otros: '#888780',
};

export default function ReportesPage() {
  const [tab, setTab] = useState<ReportTab>('evolucion');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productosBusqueda, setProductosBusqueda] = useState<string[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');

  useEffect(() => {
    cargarReporte(tab);
  }, [tab, productoSeleccionado]);

  async function cargarReporte(tipo: ReportTab) {
    setLoading(true);
    try {
      let url = `/api/reportes?tipo=${tipo}`;
      if (tipo === 'precios' && productoSeleccionado) {
        url += `&producto=${encodeURIComponent(productoSeleccionado)}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      setData(result);

      // Si es pestaña de precios y no hay producto seleccionado, cargar lista
      if (tipo === 'precios' && !productoSeleccionado && result.productos) {
        setProductosBusqueda(result.productos);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto);

  const formatMes = (mes: string) => {
    const [y, m] = mes.split('-');
    const fecha = new Date(parseInt(y), parseInt(m) - 1);
    return fecha.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>📈 Reportes</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Análisis detallado de tus costos, tendencias y comparativas.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { id: 'evolucion', label: '📊 Evolución mensual' },
          { id: 'categorias', label: '📦 Por categoría' },
          { id: 'proveedores', label: '🏪 Top proveedores' },
          { id: 'precios', label: '💲 Evolución de precios' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setData(null); }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: tab === t.id ? 'var(--accent)' : 'var(--bg-primary)',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>Cargando reporte...</div>
      ) : (
        <div style={cardStyle}>
          {tab === 'evolucion' && data?.evolucion && <EvolucionChart data={data.evolucion} formatMonto={formatMonto} formatMes={formatMes} />}
          {tab === 'categorias' && data?.categorias && <CategoriasChart data={data.categorias} formatMonto={formatMonto} formatMes={formatMes} />}
          {tab === 'proveedores' && data?.proveedores && <ProveedoresChart data={data.proveedores} formatMonto={formatMonto} />}
          {tab === 'precios' && (
            <PreciosView
              data={data}
              productos={productosBusqueda}
              productoSeleccionado={productoSeleccionado}
              onSelectProducto={setProductoSeleccionado}
              formatMonto={formatMonto}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EvolucionChart({ data, formatMonto, formatMes }: { data: Record<string, any>; formatMonto: (n: number) => string; formatMes: (s: string) => string }) {
  const chartData = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, vals]) => ({ mes: formatMes(mes), total: vals.total, fijo: vals.fijo, variable: vals.variable }));

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Evolución mensual de gastos</h3>
      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={12} />
            <Tooltip formatter={(value: number) => formatMonto(value)} />
            <Legend />
            <Bar dataKey="fijo" name="Fijos" fill="#1D9E75" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="variable" name="Variables" fill="#378ADD" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen */}
      <div style={{ marginTop: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={thStyle}>Mes</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Fijos</th>
              <th style={thStyle}>Variables</th>
              <th style={thStyle}>Var. %</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => {
              const prev = i > 0 ? chartData[i - 1].total : null;
              const variacion = prev ? ((row.total - prev) / prev * 100) : null;
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{row.mes}</td>
                  <td style={tdStyle}>{formatMonto(row.total)}</td>
                  <td style={tdStyle}>{formatMonto(row.fijo)}</td>
                  <td style={tdStyle}>{formatMonto(row.variable)}</td>
                  <td style={{ ...tdStyle, color: variacion === null ? 'var(--text-muted)' : variacion > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {variacion !== null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriasChart({ data, formatMonto, formatMes }: { data: Record<string, Record<string, number>>; formatMonto: (n: number) => string; formatMes: (s: string) => string }) {
  const meses = Object.keys(data).sort();
  const categorias = Array.from(new Set(meses.flatMap(m => Object.keys(data[m]))));

  const chartData = meses.map(mes => {
    const row: any = { mes: formatMes(mes) };
    categorias.forEach(cat => { row[cat] = data[mes][cat] || 0; });
    return row;
  });

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Gastos por categoría (mensual)</h3>
      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={12} />
            <Tooltip formatter={(value: number) => formatMonto(value)} />
            <Legend />
            {categorias.map((cat) => (
              <Bar key={cat} dataKey={cat} name={cat.charAt(0).toUpperCase() + cat.slice(1)} fill={CATEGORIAS_COLORES[cat] || '#888'} stackId="a" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProveedoresChart({ data, formatMonto }: { data: any[]; formatMonto: (n: number) => string }) {
  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Top proveedores por monto</h3>
      <div style={{ height: Math.max(300, data.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={12} />
            <YAxis type="category" dataKey="nombre" width={140} fontSize={12} />
            <Tooltip formatter={(value: number) => formatMonto(value)} />
            <Bar dataKey="total" fill="var(--accent)" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#D85A30' : i < 3 ? '#378ADD' : 'var(--accent)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 24 }}>
        {data.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
            <span><strong>#{i + 1}</strong> {p.nombre}</span>
            <span>{formatMonto(p.total)} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({p.cantidad} compras)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreciosView({ data, productos, productoSeleccionado, onSelectProducto, formatMonto }: {
  data: any; productos: string[]; productoSeleccionado: string;
  onSelectProducto: (p: string) => void; formatMonto: (n: number) => string;
}) {
  if (!productoSeleccionado) {
    return (
      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Evolución de precios por producto</h3>
        {productos.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>
            No hay precios registrados todavía. Los precios se registran automáticamente al cargar gastos con cantidad y unidad.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {productos.map((p) => (
              <button
                key={p}
                onClick={() => onSelectProducto(p)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const precios = data?.precios || [];
  const chartData = precios.map((p: any) => ({
    fecha: new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    precioUnitario: p.precio_por_unidad,
  }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500 }}>Precio de: {productoSeleccionado}</h3>
        <button
          onClick={() => onSelectProducto('')}
          style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Volver
        </button>
      </div>

      {chartData.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>No hay datos de precios para este producto.</p>
      ) : (
        <>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="fecha" fontSize={12} />
                <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} fontSize={12} />
                <Tooltip formatter={(value: number) => formatMonto(value)} />
                <Line type="monotone" dataKey="precioUnitario" name="Precio/unidad" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 16 }}>
            {precios.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span>{new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR')}</span>
                <span>{p.cantidad} {p.unidad} × {formatMonto(p.precio_por_unidad)}/{p.unidad} = {formatMonto(p.precio)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'var(--bg-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' };
const tdStyle: React.CSSProperties = { padding: '8px 12px' };
