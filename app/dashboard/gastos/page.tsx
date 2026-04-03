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

  // Multi-select
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [eliminandoMultiple, setEliminandoMultiple] = useState(false);
  const [confirmMultiple, setConfirmMultiple] = useState(false);

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
      setSeleccionados(new Set());
      setModoSeleccion(false);
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

  async function handleEliminarMultiple() {
    setEliminandoMultiple(true);
    try {
      const promises = Array.from(seleccionados).map(id =>
        fetch(`/api/gastos/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setSeleccionados(new Set());
      setConfirmMultiple(false);
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando gastos:', error);
    }
    setEliminandoMultiple(false);
  }

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (seleccionados.size === gastosFiltrados.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(gastosFiltrados.map(g => g.id)));
    }
  }

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(monto);

  const haySeleccionados = seleccionados.size > 0;
  const todosSeleccionados = gastosFiltrados.length > 0 && seleccionados.size === gastosFiltrados.length;
  const gridCols = modoSeleccion
    ? '40px 100px 1fr 120px 110px 100px 80px 60px'
    : '100px 1fr 120px 110px 100px 80px 60px';

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
        <div style={{ display: 'flex', gap: 8 }}>
          {!modoSeleccion ? (
            <button
              onClick={() => setModoSeleccion(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Seleccionar
            </button>
          ) : (
            <button
              onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          )}
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
          <option value="">Todas las categorias</option>
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

      {/* Counter + bulk actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {gastosFiltrados.length} gasto{gastosFiltrados.length !== 1 ? 's' : ''} encontrado{gastosFiltrados.length !== 1 ? 's' : ''}
        </p>
        {modoSeleccion && haySeleccionados && (
          <button
            onClick={() => setConfirmMultiple(true)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--danger, #ef4444)',
              background: 'transparent',
              color: 'var(--danger, #ef4444)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🗑 Eliminar {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
          </button>
        )}
      </div>

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
          No hay gastos en este periodo.
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
            gridTemplateColumns: gridCols,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            alignItems: 'center',
          }}>
            {modoSeleccion && (
              <span style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={toggleTodos}
                  style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--accent)' }}
                />
              </span>
            )}
            <span>Fecha</span>
            <span>Descripcion</span>
            <span>Categoria</span>
            <span>Proveedor</span>
            <span style={{ textAlign: 'right' }}>Monto</span>
            <span style={{ textAlign: 'center' }}>Tipo</span>
            <span></span>
          </div>

          {/* Rows */}
          {gastosFiltrados.map((gasto) => (
            <div
              key={gasto.id}
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                alignItems: 'center',
                fontSize: '14px',
                background: seleccionados.has(gasto.id) ? 'var(--bg-secondary)' : 'transparent',
              }}
            >
              {modoSeleccion && (
                <span style={{ display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={seleccionados.has(gasto.id)}
                    onChange={() => toggleSeleccion(gasto.id)}
                    style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--accent)' }}
                  />
                </span>
              )}
              <span
                onClick={() => setGastoEditando(gasto)}
                style={{ color: 'var(--text-secondary)', fontSize: '13px' }}
              >
                {new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <div onClick={() => setGastoEditando(gasto)}>
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
              <span onClick={() => setGastoEditando(gasto)} style={{ fontSize: '13px' }}>
                {CATEGORIA_EMOJI[gasto.categoria] || '📦'}{' '}
                {gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}
              </span>
              <span onClick={() => setGastoEditando(gasto)} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {gasto.proveedor || '-'}
              </span>
              <span onClick={() => setGastoEditando(gasto)} style={{ textAlign: 'right', fontWeight: 500, color: 'var(--danger)' }}>
                -{formatMonto(gasto.monto)}
              </span>
              <span onClick={() => setGastoEditando(gasto)} style={{ textAlign: 'center' }}>
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

      {/* Confirm: Eliminar uno */}
      <ConfirmDialog
        abierto={!!gastoEliminando}
        mensaje="¿Estas seguro que queres eliminar este gasto? Esta accion no se puede deshacer."
        onConfirmar={handleEliminar}
        onCancelar={() => setGastoEliminando(null)}
      />

      {/* Confirm: Eliminar multiple */}
      <ConfirmDialog
        abierto={confirmMultiple}
        mensaje={`¿Estas seguro que queres eliminar ${seleccionados.size} gasto${seleccionados.size !== 1 ? 's' : ''}? Esta accion no se puede deshacer.`}
        onConfirmar={handleEliminarMultiple}
        onCancelar={() => setConfirmMultiple(false)}
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
