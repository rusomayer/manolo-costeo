'use client';

import { useState, useEffect } from 'react';
import { Gasto, GastoInput, TipoGasto } from '@/lib/types';
import FiltroFechas from '../components/FiltroFechas';
import ModalGasto from '../components/ModalGasto';
import FormGasto from '../components/FormGasto';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIA_EMOJI: Record<string, string> = {
  insumos: '☕',
  servicios: '💡',
  sueldos: '👤',
  alquiler: '🏠',
  impuestos: '📋',
  mantenimiento: '🔧',
  otros: '📦',
};

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [hasta, setHasta] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toLocaleDateString('en-CA');
  });
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Modal states
  const [mostrarForm, setMostrarForm] = useState(false);
  const [gastoEditando, setGastoEditando] = useState<Gasto | undefined>();
  const [gastoEliminando, setGastoEliminando] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Error cargando gastos:', error);
    }
    setLoading(false);
  }

  // Filter by tipo locally (not via API)
  const gastosFiltrados = filtroTipo
    ? gastos.filter((g) => (g.tipo_gasto || 'variable') === filtroTipo)
    : gastos;

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

  async function handleEditar(data: GastoInput & { tipo_gasto?: TipoGasto }) {
    if (!gastoEditando) return;
    const res = await fetch(`/api/gastos/${gastoEditando.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error actualizando gasto');
    setGastoEditando(undefined);
    cargarDatos();
  }

  async function handleEliminar() {
    if (!gastoEliminando) return;
    const res = await fetch(`/api/gastos/${gastoEliminando}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error eliminando gasto');
    setGastoEliminando(null);
    cargarDatos();
  }

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(monto);

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Gastos</h1>
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
      </div>

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
          style={selectStyle}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIA_EMOJI).map(([cat, emoji]) => (
            <option key={cat} value={cat}>
              {emoji} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={selectStyle}
        >
          <option value="">Todos los tipos</option>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
      </div>

      {/* Counter */}
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        {gastosFiltrados.length} gasto{gastosFiltrados.length !== 1 ? 's' : ''} encontrado{gastosFiltrados.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Cargando...
        </div>
      ) : gastosFiltrados.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}>
          No hay gastos en este período.
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 120px 110px 100px 80px 60px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
          }}>
            <span>Fecha</span>
            <span>Descripción</span>
            <span>Categoría</span>
            <span>Proveedor</span>
            <span style={{ textAlign: 'right' }}>Monto</span>
            <span style={{ textAlign: 'center' }}>Tipo</span>
            <span></span>
          </div>

          {/* Rows */}
          {gastosFiltrados.map((gasto) => (
            <div
              key={gasto.id}
              onClick={() => setGastoEditando(gasto)}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 120px 110px 100px 80px 60px',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                alignItems: 'center',
                fontSize: '14px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <div>
                <span style={{ fontWeight: 500 }}>{gasto.descripcion}</span>
                {gasto.cantidad && gasto.unidad && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '6px' }}>
                    ({gasto.cantidad} {gasto.unidad})
                  </span>
                )}
                {gasto.notas && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {gasto.notas}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '13px' }}>
                {CATEGORIA_EMOJI[gasto.categoria] || '📦'}{' '}
                {gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {gasto.proveedor || '-'}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 500, color: 'var(--danger)' }}>
                -{formatMonto(gasto.monto)}
              </span>
              <span style={{ textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: (gasto.tipo_gasto || 'variable') === 'fijo'
                    ? 'rgba(25, 135, 84, 0.1)'
                    : 'rgba(255, 193, 7, 0.15)',
                  color: (gasto.tipo_gasto || 'variable') === 'fijo'
                    ? 'var(--success)'
                    : '#b8860b',
                }}>
                  {(gasto.tipo_gasto || 'variable') === 'fijo' ? 'Fijo' : 'Variable'}
                </span>
              </span>
              <span style={{ textAlign: 'center' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGastoEliminando(gasto.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                  }}
                  title="Eliminar"
                >
                  🗑
                </button>
              </span>
            </div>
          ))}
        </div>
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

      {/* Modal: Editar gasto */}
      <ModalGasto
        abierto={!!gastoEditando}
        onCerrar={() => setGastoEditando(undefined)}
        titulo="Editar gasto"
      >
        {gastoEditando && (
          <FormGasto
            gasto={gastoEditando}
            onGuardar={handleEditar}
            onCancelar={() => setGastoEditando(undefined)}
          />
        )}
      </ModalGasto>

      {/* Confirm: Eliminar */}
      <ConfirmDialog
        abierto={!!gastoEliminando}
        mensaje="¿Estás seguro que querés eliminar este gasto? Esta acción no se puede deshacer."
        onConfirmar={handleEliminar}
        onCancelar={() => setGastoEliminando(null)}
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '13px',
};
