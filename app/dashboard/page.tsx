'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Gasto, GastoInput, TipoGasto } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
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

const GASTOS_EN_DASHBOARD = 5;

export default function Dashboard() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombreLocal, setNombreLocal] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    const localId = document.cookie.split(';').find(c => c.trim().startsWith('selected_local='))?.split('=')[1]?.trim();
    if (!localId) return;
    supabase.from('locales').select('nombre').eq('id', localId).single().then(({ data }) => {
      if (data?.nombre) setNombreLocal(data.nombre);
    });
  }, []);

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

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(monto);

  const datosTorta = resumen
    ? Object.entries(resumen.porCategoria)
        .filter(([, monto]) => monto > 0)
        .map(([categoria, monto]) => ({
          name: categoria,
          label: categoria.charAt(0).toUpperCase() + categoria.slice(1),
          monto,
          color: CATEGORIAS_COLORES[categoria] || '#888',
        }))
        .sort((a, b) => b.monto - a.monto)
    : [];

  const periodoLabel = (() => {
    if (!desde || !hasta) return 'Período';
    const dDesde = new Date(desde + 'T12:00:00');
    const dHasta = new Date(hasta + 'T12:00:00');
    if (
      dDesde.getDate() === 1 &&
      dHasta.getDate() === new Date(dHasta.getFullYear(), dHasta.getMonth() + 1, 0).getDate() &&
      dDesde.getMonth() === dHasta.getMonth()
    ) {
      return dDesde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    }
    return `${dDesde.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${dHasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
  })();

  const gastosVisibles = gastos.slice(0, GASTOS_EN_DASHBOARD);
  const hayMasGastos = gastos.length > GASTOS_EN_DASHBOARD;

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
            {nombreLocal || '☕ Mi Local'}
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
            marginBottom: '24px',
          }}>
            <MetricCard label="Total del período" value={formatMonto(resumen?.total || 0)} />
            <MetricCard label="Gastos registrados" value={String(resumen?.cantidad || 0)} />
            <MetricCard label="Gastos fijos" value={formatMonto(resumen?.porTipo?.fijo || 0)} />
            <MetricCard label="Gastos variables" value={formatMonto(resumen?.porTipo?.variable || 0)} />
          </div>

          {/* Gastos recientes */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            marginBottom: '24px',
          }}>
            {/* Header de la sección */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '500' }}>
                Gastos recientes
              </h2>
              <Link
                href="/dashboard/gastos"
                style={{
                  fontSize: '13px',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  padding: '4px 10px',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s',
                }}
              >
                Ver todos →
              </Link>
            </div>

            {gastos.length === 0 ? (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}>
                No hay gastos registrados en este período.
                <br />
                <span style={{ fontSize: '14px' }}>
                  Mandá un mensaje al bot de Telegram o agregá uno manualmente.
                </span>
              </div>
            ) : (
              <>
                {gastosVisibles.map((gasto) => (
                  <div
                    key={gasto.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span style={{
                        fontSize: '20px',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-secondary)',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}>
                        {CATEGORIA_EMOJI[gasto.categoria] || '📦'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: '500', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {gasto.descripcion}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}
                          {gasto.proveedor && ` · ${gasto.proveedor}`}
                          {' · '}
                          {new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' '}
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
                      fontWeight: '600',
                      color: 'var(--danger)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      -{formatMonto(gasto.monto)}
                    </p>
                  </div>
                ))}

                {/* Footer con "Ver todos" si hay más */}
                {hayMasGastos && (
                  <div style={{
                    padding: '14px 20px',
                    textAlign: 'center',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <Link
                      href="/dashboard/gastos"
                      style={{
                        fontSize: '13px',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Ver los {gastos.length - GASTOS_EN_DASHBOARD} gastos restantes →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Gráfico de torta */}
          {datosTorta.length > 0 && (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              border: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>
                Distribución por categoría
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap',
              }}>
                {/* Donut chart */}
                <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosTorta}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="monto"
                        strokeWidth={0}
                      >
                        {datosTorta.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatMonto(value), 'Monto']}
                        contentStyle={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total en el centro */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {formatMonto(resumen?.total || 0)}
                    </p>
                  </div>
                </div>

                {/* Leyenda */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  {datosTorta.map((entry) => {
                    const pct = resumen ? ((entry.monto / resumen.total) * 100).toFixed(0) : '0';
                    return (
                      <div
                        key={entry.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: entry.color,
                          flexShrink: 0,
                        }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>
                          {CATEGORIA_EMOJI[entry.name]} {entry.label}
                        </span>
                        <span style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          minWidth: 36,
                          textAlign: 'right',
                        }}>
                          {pct}%
                        </span>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          minWidth: 90,
                          textAlign: 'right',
                        }}>
                          {formatMonto(entry.monto)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ fontSize: '22px', fontWeight: '600' }}>
        {value}
      </p>
    </div>
  );
}
