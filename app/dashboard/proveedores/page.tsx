'use client';

import { useState, useEffect } from 'react';
import { Proveedor, ProveedorInput, PrecioProducto } from '@/lib/types';
import ModalGasto from '../components/ModalGasto';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [precios, setPrecios] = useState<PrecioProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedProveedor, setSelectedProveedor] = useState<string | null>(null);
  const [mostrarFormPrecio, setMostrarFormPrecio] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (selectedProveedor) {
      cargarPrecios(selectedProveedor);
    }
  }, [selectedProveedor]);

  async function cargarDatos() {
    setLoading(true);
    try {
      const res = await fetch('/api/proveedores');
      const data = await res.json();
      setProveedores(data.proveedores || []);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    }
    setLoading(false);
  }

  async function cargarPrecios(proveedorId: string) {
    try {
      const res = await fetch(`/api/precios?proveedor_id=${proveedorId}`);
      const data = await res.json();
      setPrecios(data.precios || []);
    } catch (error) {
      console.error('Error cargando precios:', error);
    }
  }

  async function handleGuardar(input: ProveedorInput) {
    if (editando) {
      const res = await fetch(`/api/proveedores/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Error actualizando');
    } else {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Error creando');
    }
    setMostrarForm(false);
    setEditando(null);
    cargarDatos();
  }

  async function handleEliminar(id: string) {
    await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    if (selectedProveedor === id) setSelectedProveedor(null);
    cargarDatos();
  }

  async function handleGuardarPrecio(input: { producto: string; precio: number; cantidad: number; unidad: string; fecha: string }) {
    const res = await fetch('/api/precios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, proveedor_id: selectedProveedor }),
    });
    if (!res.ok) throw new Error('Error guardando precio');
    setMostrarFormPrecio(false);
    if (selectedProveedor) cargarPrecios(selectedProveedor);
  }

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto);

  const proveedorSeleccionado = proveedores.find(p => p.id === selectedProveedor);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>🏪 Proveedores</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gestioná tus proveedores y seguí el historial de precios.
          </p>
        </div>
        <button onClick={() => { setEditando(null); setMostrarForm(true); }} style={btnPrimary}>
          + Agregar proveedor
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedProveedor ? '1fr 1fr' : '1fr', gap: 24 }}>
          {/* Lista de proveedores */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 500 }}>Proveedores</h2>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{proveedores.length}</span>
            </div>

            {proveedores.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No hay proveedores registrados.
                <br />
                <span style={{ fontSize: 14 }}>Agregá tu primer proveedor para empezar a trackear precios.</span>
              </div>
            ) : (
              proveedores.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProveedor(selectedProveedor === p.id ? null : p.id)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedProveedor === p.id ? 'var(--bg-secondary)' : 'transparent',
                    transition: 'background 0.15s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: 2 }}>{p.nombre}</p>
                    {p.contacto && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.contacto}</p>
                    )}
                    {p.notas && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.notas}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditando(p); setMostrarForm(true); }}
                      style={btnSmall}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                      style={{ ...btnSmall, color: 'var(--danger)' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detalle del proveedor seleccionado */}
          {selectedProveedor && proveedorSeleccionado && (
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 500 }}>{proveedorSeleccionado.nombre}</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Historial de precios</p>
                </div>
                <button onClick={() => setMostrarFormPrecio(true)} style={{ ...btnPrimary, fontSize: 13, padding: '6px 14px' }}>
                  + Precio
                </button>
              </div>

              {precios.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay precios registrados para este proveedor.
                </div>
              ) : (
                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                  {precios.map((precio) => (
                    <div key={precio.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <p style={{ fontWeight: 500 }}>{precio.producto}</p>
                        <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatMonto(precio.precio)}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span>{precio.cantidad} {precio.unidad}</span>
                        <span>{formatMonto(precio.precio_por_unidad)} / {precio.unidad}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(precio.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear/Editar proveedor */}
      <ModalGasto
        abierto={mostrarForm}
        onCerrar={() => { setMostrarForm(false); setEditando(null); }}
        titulo={editando ? 'Editar proveedor' : 'Agregar proveedor'}
      >
        <FormProveedor
          inicial={editando || undefined}
          onGuardar={handleGuardar}
          onCancelar={() => { setMostrarForm(false); setEditando(null); }}
        />
      </ModalGasto>

      {/* Modal: Agregar precio */}
      <ModalGasto
        abierto={mostrarFormPrecio}
        onCerrar={() => setMostrarFormPrecio(false)}
        titulo="Registrar precio"
      >
        <FormPrecio
          onGuardar={handleGuardarPrecio}
          onCancelar={() => setMostrarFormPrecio(false)}
        />
      </ModalGasto>

      {/* Confirm delete */}
      <ConfirmDialog
        abierto={!!confirmDelete}
        mensaje="¿Seguro que querés eliminar este proveedor? Se perderán todos sus precios asociados."
        onConfirmar={() => confirmDelete && handleEliminar(confirmDelete)}
        onCancelar={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// --- Sub-components ---

function FormProveedor({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: ProveedorInput;
  onGuardar: (data: ProveedorInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    contacto: inicial?.contacto || '',
    notas: inicial?.notas || '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setLoading(true);
    try {
      await onGuardar({
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim() || undefined,
        notas: form.notas.trim() || undefined,
      });
    } catch {}
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Nombre *</label>
        <input
          style={inputStyle}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Distribuidora Don José"
          required
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Contacto</label>
        <input
          style={inputStyle}
          value={form.contacto}
          onChange={(e) => setForm({ ...form, contacto: e.target.value })}
          placeholder="Teléfono, email, etc."
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Notas</label>
        <input
          style={inputStyle}
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
          placeholder="Días de entrega, observaciones..."
        />
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

function FormPrecio({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (data: { producto: string; precio: number; cantidad: number; unidad: string; fecha: string }) => Promise<void>;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({
    producto: '',
    precio: '',
    cantidad: '',
    unidad: 'kg',
    fecha: new Date().toLocaleDateString('en-CA'),
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.producto.trim() || !form.precio || !form.cantidad) return;
    setLoading(true);
    try {
      await onGuardar({
        producto: form.producto.trim(),
        precio: parseFloat(form.precio),
        cantidad: parseFloat(form.cantidad),
        unidad: form.unidad,
        fecha: form.fecha,
      });
    } catch {}
    setLoading(false);
  }

  const precioUnitario = form.precio && form.cantidad
    ? parseFloat(form.precio) / parseFloat(form.cantidad)
    : 0;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Producto *</label>
        <input
          style={inputStyle}
          value={form.producto}
          onChange={(e) => setForm({ ...form, producto: e.target.value })}
          placeholder="Ej: Café Colombia, Leche entera"
          required
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Precio total *</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            value={form.precio}
            onChange={(e) => setForm({ ...form, precio: e.target.value })}
            placeholder="45000"
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Cantidad *</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            placeholder="5"
            required
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Unidad</label>
          <select
            style={inputStyle}
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
          >
            <option value="kg">kg</option>
            <option value="litros">litros</option>
            <option value="unidades">unidades</option>
            <option value="cajas">cajas</option>
            <option value="paquetes">paquetes</option>
            <option value="docenas">docenas</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input
            style={inputStyle}
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </div>
      </div>

      {precioUnitario > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: 24,
          fontSize: 14,
        }}>
          Precio unitario: <strong>
            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precioUnitario)}
          </strong> / {form.unidad}
        </div>
      )}

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

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  overflow: 'hidden',
};

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  fontSize: 14,
  cursor: 'pointer',
};

const btnSmall: React.CSSProperties = {
  padding: '4px 8px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 14,
  borderRadius: 4,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 14,
};
