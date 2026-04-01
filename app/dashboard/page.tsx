'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Gasto, GastoInput, TipoGasto } from '@/lib/types';
import FiltroFechas from './components/FiltroFechas';
import ModalGasto from './components/ModalGasto';
import FormGasto from './components/FormGasto';

interface Resumen {
  total: number;
  porCategoria: Record<string, number>;
  porTipo: Record<string, number>;
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
  const [mostrarForm, setMostrarForm] = useState(false);

  // Initialize to current month
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [hasta, setHasta] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toLocaleDateString('en-CA');
  });

  useEffect(() => {
    cargarDatos();
  }, [desde, hasta, filtroCategoria]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
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

  async function handleCrear(data: GastoInput & { tipo_gasto?: TipoGasto }) {
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error creando gasto');
    setMostrarForm(false);
    cargarDatos();
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

  // Build period label from desde/hasta
  const periodoLabel = (() => {
    if (!desde || !hasta) return 'Período';
    const dDesde = new Date(desde + 'T12:00:00');
    const dHasta = new Date(hasta + 'T12:00:00');
    // Check if it's a full month
    if (dDesde.getDate() === 1 && dHasta.getDate() === new Date(dHasta.getFullYear(), dHasta.getMonth() + 1, 0).getDate() && dDesde.getMonth() === dHasta.getMonth()) {
      return dDesde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    }
    return `${dDesde.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - ${dHasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
  })();

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
            ☕ Gastos del Café
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Agregar gasto
        </button>
      </header>

      {/* Filtros */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <FiltroFechas
          desde={desde}
          hasta={hasta}
          onChange={(d, h) => { setDesde(d); setHasta(h); }}
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '13px',
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
              label="Total del período"
              value={formatMonto(resumen?.total || 0)}
            />
            <MetricCard
              label="Gastos registrados"
              value={String(resumen?.cantidad || 0)}
            />
            <MetricCard
              label="Gastos fijos"
              value={formatMonto(resumen?.porTipo?.fijo || 0)}
            />
            <MetricCard
              label="Gastos variables"
              value={formatMonto(resumen?.porTipo?.variable || 0)}
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
                No hay gastos registrados en este período.
                <br />
                <span style={{ fontSize: '14px' }}>
                  Mandá un mensaje al bot de Telegram o agregá uno manualmente.
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
                          {new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' · '}
                          <span style={{
                            fontSize: '11px',
                            padding: '1px 6px',
                            borderRadius: '8px',
                            background: (gasto.tipo_gasto || 'variable') === 'fijo'
                              ? 'rgba(25, 135, 84, 0.1)'
                              : 'rgba(255, 193, 7, 0.15)',
                            color: (gasto.tipo_gasto || 'variable') === 'fijo'
                              ? 'var(--success)'
                              : '#b8860b',
                            fontWeight: 600,
                          }}>
                            {(gasto.tipo_gasto || 'variable') === 'fijo' ? 'Fijo' : 'Variable'}
                          </span>
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

      {/* Modal: Crear gasto */}
      <ModalGasto
        abierto={mostrarForm}
        onCerrar={() => setMostrarForm(false)}
        titulo="Agregar gasto"
      >
        <FormGasto
          onGuardar={handleCrear}
          onCancelar={() => setMostrarForm(false)}
        />
      </ModalGasto>
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
