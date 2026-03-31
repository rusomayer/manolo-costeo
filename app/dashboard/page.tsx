'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Gasto {
  id: string;
  created_at: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: string;
  proveedor?: string;
}

interface Resumen {
  total: number;
  porCategoria: Record<string, number>;
  cantidad: number;
}

const CATEGORIAS_COLORES: Record<string, string> = {
  insumos: '#7F77DD',
  servicios: '#378ADD',
  sueldos: '#1D9E75',
  alquiler: '#D85A30',
  impuestos: '#639922',
  mantenimiento: '#D4537E',
  otros: '#888780',
};

const CATEGORIA_EMOJI: Record<string, string> = {
  insumos: '☕',
  servicios: '💡',
  sueldos: '👤',
  alquiler: '🏠',
  impuestos: '📋',
  mantenimiento: '🔧',
  otros: '📦',
};

export default function Dashboard() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [mesActual, setMesActual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    cargarDatos();
  }, [mesActual, filtroCategoria]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('mes', mesActual);
      if (filtroCategoria) params.set('categoria', filtroCategoria);

      const res = await fetch(`/api/gastos?${params}`);
      const data = await res.json();
      
      setGastos(data.gastos || []);
      setResumen(data.resumen || null);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
    setLoading(false);
  }

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(monto);
  };

  const datosGrafico = resumen
    ? Object.entries(resumen.porCategoria).map(([categoria, monto]) => ({
        name: categoria.charAt(0).toUpperCase() + categoria.slice(1),
        monto,
        color: CATEGORIAS_COLORES[categoria] || '#888',
      }))
    : [];

  const nombreMes = new Date(mesActual + '-01').toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
          ☕ Gastos del Café
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
        </p>
      </header>

      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <input
          type="month"
          value={mesActual}
          onChange={(e) => setMesActual(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">Todas las categorías</option>
          {Object.keys(CATEGORIAS_COLORES).map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORIA_EMOJI[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Cargando...
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <MetricCard 
              label="Total del mes" 
              value={formatMonto(resumen?.total || 0)} 
            />
            <MetricCard 
              label="Gastos registrados" 
              value={String(resumen?.cantidad || 0)} 
            />
            <MetricCard 
              label="Promedio por gasto" 
              value={formatMonto(resumen?.cantidad ? (resumen.total / resumen.cantidad) : 0)} 
            />
            <MetricCard 
              label="Mayor categoría" 
              value={
                resumen?.porCategoria 
                  ? Object.entries(resumen.porCategoria)
                      .sort((a, b) => b[1] - a[1])[0]?.[0]
                      ?.charAt(0).toUpperCase() + 
                    Object.entries(resumen.porCategoria)
                      .sort((a, b) => b[1] - a[1])[0]?.[0]
                      ?.slice(1) || '-'
                  : '-'
              } 
            />
          </div>

          {/* Gráfico */}
          {datosGrafico.length > 0 && (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius)',
              padding: '24px',
              marginBottom: '32px',
              border: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>
                Gastos por categoría
              </h2>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip 
                      formatter={(value: number) => formatMonto(value)}
                      contentStyle={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="monto" radius={[0, 4, 4, 0]}>
                      {datosGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista de gastos */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '500' }}>
                Últimos gastos
              </h2>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {gastos.length} registros
              </span>
            </div>
            
            {gastos.length === 0 ? (
              <div style={{ 
                padding: '48px', 
                textAlign: 'center', 
                color: 'var(--text-secondary)' 
              }}>
                No hay gastos registrados este mes.
                <br />
                <span style={{ fontSize: '14px' }}>
                  Mandá un mensaje al bot de Telegram para empezar.
                </span>
              </div>
            ) : (
              <div>
                {gastos.map((gasto) => (
                  <div
                    key={gasto.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {CATEGORIA_EMOJI[gasto.categoria] || '📦'}
                      </span>
                      <div>
                        <p style={{ fontWeight: '500', marginBottom: '2px' }}>
                          {gasto.descripcion}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}
                          {gasto.proveedor && ` · ${gasto.proveedor}`}
                          {' · '}
                          {new Date(gasto.fecha).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <p style={{ 
                      fontWeight: '500', 
                      color: 'var(--danger)',
                      whiteSpace: 'nowrap',
                    }}>
                      -{formatMonto(gasto.monto)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      border: '1px solid var(--border)',
    }}>
      <p style={{ 
        fontSize: '13px', 
        color: 'var(--text-secondary)', 
        marginBottom: '4px' 
      }}>
        {label}
      </p>
      <p style={{ fontSize: '24px', fontWeight: '600' }}>
        {value}
      </p>
    </div>
  );
}
