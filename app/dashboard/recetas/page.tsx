'use client';

import { useState, useEffect } from 'react';
import { Receta, RecetaInput, RecetaIngrediente, RecetaIngredienteInput } from '@/lib/types';
import { CostoReceta } from '@/lib/costeo';
import ModalGasto from '../components/ModalGasto';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIAS_RECETA = ['plato principal', 'entrada', 'postre', 'bebida', 'snack', 'otro'];

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<{ receta: Receta; ingredientes: RecetaIngrediente[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<{ receta: Receta; ingredientes: RecetaIngrediente[]; costeo: CostoReceta } | null>(null);

  useEffect(() => { cargarRecetas(); }, []);

  async function cargarRecetas() {
    setLoading(true);
    try {
      const res = await fetch('/api/recetas');
      const data = await res.json();
      setRecetas(data.recetas || []);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }

  async function verDetalle(recetaId: string) {
    try {
      const [recetaRes, costeoRes] = await Promise.all([
        fetch(`/api/recetas/${recetaId}`),
        fetch(`/api/recetas/${recetaId}/costeo`),
      ]);
      const recetaData = await recetaRes.json();
      const costeoData = await costeoRes.json();
      setDetalle({
        receta: recetaData.receta,
        ingredientes: recetaData.ingredientes,
        costeo: costeoData,
      });
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  }

  async function handleGuardar(recetaInput: RecetaInput, ingredientes: RecetaIngredienteInput[]) {
    const body = { ...recetaInput, ingredientes };

    if (editando) {
      const res = await fetch(`/api/recetas/${editando.receta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error actualizando');
    } else {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error creando');
    }

    setMostrarForm(false);
    setEditando(null);
    cargarRecetas();
    if (detalle && editando) {
      verDetalle(editando.receta.id);
    }
  }

  async function handleEliminar(id: string) {
    await fetch(`/api/recetas/${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    if (detalle?.receta.id === id) setDetalle(null);
    cargarRecetas();
  }

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>🍳 Recetas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Cargá tus platos, definí ingredientes y calculá el costo por porción.
          </p>
        </div>
        <button onClick={() => { setEditando(null); setMostrarForm(true); }} style={btnPrimary}>
          + Nueva receta
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: detalle ? '1fr 1fr' : '1fr', gap: 24 }}>
          {/* Lista de recetas */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 500 }}>Recetas ({recetas.length})</h2>
            </div>

            {recetas.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No hay recetas cargadas.
                <br />
                <span style={{ fontSize: 14 }}>Agregá tu primer plato para empezar a costear.</span>
              </div>
            ) : (
              recetas.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => verDetalle(r.id)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: detalle?.receta.id === r.id ? 'var(--bg-secondary)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: 2 }}>{r.nombre}</p>
                    <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {r.categoria && <span>{r.categoria}</span>}
                      {r.porciones > 1 && <span>· {r.porciones} porciones</span>}
                      {r.precio_venta && <span>· PV: {formatMonto(r.precio_venta)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await fetch(`/api/recetas/${r.id}`);
                        const data = await res.json();
                        setEditando({ receta: data.receta, ingredientes: data.ingredientes });
                        setMostrarForm(true);
                      }}
                      style={btnSmall}
                    >✏️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(r.id); }}
                      style={{ ...btnSmall, color: 'var(--danger)' }}
                    >🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detalle costeo */}
          {detalle && (
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 500 }}>{detalle.receta.nombre}</h2>
                {detalle.receta.descripcion && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{detalle.receta.descripcion}</p>
                )}
              </div>

              {/* Métricas de costeo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, padding: 16 }}>
                <MiniMetric label="Costo total" value={formatMonto(detalle.costeo.costoTotal)} />
                <MiniMetric label="Costo/porción" value={formatMonto(detalle.costeo.costoPorPorcion)} />
                {detalle.costeo.precioVenta && (
                  <>
                    <MiniMetric label="Precio venta" value={formatMonto(detalle.costeo.precioVenta)} />
                    <MiniMetric
                      label="Food cost"
                      value={`${detalle.costeo.foodCostPct?.toFixed(1)}%`}
                      color={
                        (detalle.costeo.foodCostPct || 0) <= 30 ? 'var(--success)'
                        : (detalle.costeo.foodCostPct || 0) <= 40 ? '#b8860b'
                        : 'var(--danger)'
                      }
                    />
                  </>
                )}
              </div>

              {/* Ingredientes */}
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <div style={{ padding: '12px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Ingredientes ({detalle.ingredientes.length})
                </div>
                {detalle.costeo.ingredientes.map((ing, i) => (
                  <div key={i} style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>{ing.producto}</span>
                      <span style={{ fontWeight: 500, color: ing.fuente === 'sin_dato' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {ing.costoLinea ? formatMonto(ing.costoLinea) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>{ing.cantidad} {ing.unidad}</span>
                      <span>
                        {ing.fuente === 'precio_registrado' && ing.precioUnitario && (
                          <>{formatMonto(ing.precioUnitario)}/{ing.unidad}{ing.proveedor ? ` · ${ing.proveedor}` : ''}</>
                        )}
                        {ing.fuente === 'costo_manual' && 'Costo manual'}
                        {ing.fuente === 'sin_dato' && (
                          <span style={{ color: 'var(--danger)' }}>⚠️ Sin precio registrado</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {detalle.costeo.sinDatos.length > 0 && (
                <div style={{ padding: '12px 20px', background: 'rgba(255,193,7,0.1)', fontSize: 13, color: '#b8860b', borderTop: '1px solid var(--border)' }}>
                  ⚠️ {detalle.costeo.sinDatos.length} ingrediente(s) sin precio: {detalle.costeo.sinDatos.join(', ')}.
                  Cargá precios en la sección de Proveedores o usá costo manual.
                </div>
              )}

              {detalle.costeo.precioVenta && detalle.costeo.margenBruto && (
                <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', fontSize: 14, borderTop: '1px solid var(--border)' }}>
                  <strong>Margen bruto:</strong> {formatMonto(detalle.costeo.margenBruto)} por porción
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear/Editar receta */}
      <ModalGasto
        abierto={mostrarForm}
        onCerrar={() => { setMostrarForm(false); setEditando(null); }}
        titulo={editando ? 'Editar receta' : 'Nueva receta'}
      >
        <FormReceta
          inicial={editando || undefined}
          onGuardar={handleGuardar}
          onCancelar={() => { setMostrarForm(false); setEditando(null); }}
        />
      </ModalGasto>

      <ConfirmDialog
        abierto={!!confirmDelete}
        mensaje="¿Seguro que querés eliminar esta receta?"
        onConfirmar={() => confirmDelete && handleEliminar(confirmDelete)}
        onCancelar={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// --- Sub-components ---

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function FormReceta({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: { receta: Receta; ingredientes: RecetaIngrediente[] };
  onGuardar: (receta: RecetaInput, ingredientes: RecetaIngredienteInput[]) => Promise<void>;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombre: inicial?.receta.nombre || '',
    descripcion: inicial?.receta.descripcion || '',
    categoria: inicial?.receta.categoria || '',
    porciones: String(inicial?.receta.porciones || 1),
    precio_venta: inicial?.receta.precio_venta ? String(inicial.receta.precio_venta) : '',
  });

  const [ingredientes, setIngredientes] = useState<RecetaIngredienteInput[]>(
    inicial?.ingredientes.map(i => ({
      producto: i.producto,
      cantidad: i.cantidad,
      unidad: i.unidad,
      costo_override: i.costo_override,
    })) || [{ producto: '', cantidad: 0, unidad: 'kg' }]
  );

  const [loading, setLoading] = useState(false);

  function addIngrediente() {
    setIngredientes([...ingredientes, { producto: '', cantidad: 0, unidad: 'kg' }]);
  }

  function removeIngrediente(index: number) {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  }

  function updateIngrediente(index: number, field: keyof RecetaIngredienteInput, value: any) {
    const updated = [...ingredientes];
    updated[index] = { ...updated[index], [field]: value };
    setIngredientes(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setLoading(true);
    try {
      const validIngredientes = ingredientes.filter(i => i.producto.trim() && i.cantidad > 0);
      await onGuardar(
        {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          categoria: form.categoria || undefined,
          porciones: parseInt(form.porciones) || 1,
          precio_venta: form.precio_venta ? parseFloat(form.precio_venta) : undefined,
        },
        validIngredientes
      );
    } catch {}
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Nombre del plato *</label>
        <input style={inputStyle} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Croque Madame" required />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Categoría</label>
          <select style={inputStyle} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            <option value="">Sin categoría</option>
            {CATEGORIAS_RECETA.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Porciones</label>
          <input style={inputStyle} type="number" min="1" value={form.porciones} onChange={(e) => setForm({ ...form, porciones: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Descripción</label>
          <input style={inputStyle} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Opcional" />
        </div>
        <div>
          <label style={labelStyle}>Precio de venta</label>
          <input style={inputStyle} type="number" step="0.01" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} placeholder="Opcional" />
        </div>
      </div>

      {/* Ingredientes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Ingredientes</label>
          <button type="button" onClick={addIngrediente} style={{ ...btnSmall, color: 'var(--accent)', fontSize: 13 }}>+ Agregar</button>
        </div>

        {ingredientes.map((ing, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input
              style={inputStyle}
              value={ing.producto}
              onChange={(e) => updateIngrediente(i, 'producto', e.target.value)}
              placeholder="Producto"
            />
            <input
              style={inputStyle}
              type="number"
              step="0.001"
              value={ing.cantidad || ''}
              onChange={(e) => updateIngrediente(i, 'cantidad', parseFloat(e.target.value) || 0)}
              placeholder="Cant."
            />
            <select
              style={inputStyle}
              value={ing.unidad}
              onChange={(e) => updateIngrediente(i, 'unidad', e.target.value)}
            >
              <option value="kg">kg</option>
              <option value="litros">litros</option>
              <option value="unidades">unidades</option>
              <option value="gramos">gramos</option>
              <option value="ml">ml</option>
            </select>
            <button type="button" onClick={() => removeIngrediente(i)} style={{ ...btnSmall, color: 'var(--danger)' }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancelar} style={btnSecondary}>Cancelar</button>
        <button type="submit" disabled={loading} style={btnPrimary}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

// --- Styles ---
const cardStyle: React.CSSProperties = { background: 'var(--bg-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' };
const btnSmall: React.CSSProperties = { padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, borderRadius: 4 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 };
