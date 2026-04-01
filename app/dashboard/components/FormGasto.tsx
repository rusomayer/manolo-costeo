'use client';

import { useState } from 'react';
import { Gasto, GastoInput, Categoria, TipoGasto } from '@/lib/types';

const CATEGORIAS: { value: Categoria; label: string; emoji: string }[] = [
  { value: 'insumos', label: 'Insumos', emoji: '☕' },
  { value: 'servicios', label: 'Servicios', emoji: '💡' },
  { value: 'sueldos', label: 'Sueldos', emoji: '👤' },
  { value: 'alquiler', label: 'Alquiler', emoji: '🏠' },
  { value: 'impuestos', label: 'Impuestos', emoji: '📋' },
  { value: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧' },
  { value: 'otros', label: 'Otros', emoji: '📦' },
];

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta de crédito' },
  { value: 'debito', label: 'Tarjeta de débito' },
];

interface FormGastoProps {
  gasto?: Gasto;
  onGuardar: (data: GastoInput & { tipo_gasto?: TipoGasto }) => Promise<void>;
  onCancelar: () => void;
}

export default function FormGasto({ gasto, onGuardar, onCancelar }: FormGastoProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fecha: gasto?.fecha || new Date().toLocaleDateString('en-CA'),
    descripcion: gasto?.descripcion || '',
    monto: gasto?.monto?.toString() || '',
    categoria: (gasto?.categoria || 'insumos') as Categoria,
    proveedor: gasto?.proveedor || '',
    metodo_pago: gasto?.metodo_pago || 'efectivo',
    notas: gasto?.notas || '',
    cantidad: gasto?.cantidad?.toString() || '',
    unidad: gasto?.unidad || '',
    tipo_gasto: (gasto?.tipo_gasto || 'variable') as TipoGasto,
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descripcion.trim() || !form.monto) return;

    setLoading(true);
    try {
      await onGuardar({
        fecha: form.fecha,
        descripcion: form.descripcion.trim(),
        monto: parseFloat(form.monto),
        categoria: form.categoria,
        proveedor: form.proveedor.trim() || undefined,
        metodo_pago: form.metodo_pago,
        notas: form.notas.trim() || undefined,
        cantidad: form.cantidad ? parseFloat(form.cantidad) : undefined,
        unidad: form.unidad.trim() || undefined,
        tipo_gasto: form.tipo_gasto,
      });
    } catch {
      // error handled by parent
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: '16px' }}>
        {/* Row: fecha + monto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => updateField('fecha', e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Monto ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.monto}
              onChange={(e) => updateField('monto', e.target.value)}
              placeholder="0.00"
              style={inputStyle}
              required
            />
          </div>
        </div>

        {/* Descripcion */}
        <div>
          <label style={labelStyle}>Descripción</label>
          <input
            type="text"
            value={form.descripcion}
            onChange={(e) => updateField('descripcion', e.target.value)}
            placeholder="Ej: Compra de café"
            maxLength={50}
            style={inputStyle}
            required
          />
        </div>

        {/* Row: categoria + tipo_gasto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => updateField('categoria', e.target.value)}
              style={inputStyle}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              value={form.tipo_gasto}
              onChange={(e) => updateField('tipo_gasto', e.target.value)}
              style={inputStyle}
            >
              <option value="variable">Variable</option>
              <option value="fijo">Fijo</option>
            </select>
          </div>
        </div>

        {/* Row: proveedor + metodo_pago */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Proveedor (opcional)</label>
            <input
              type="text"
              value={form.proveedor}
              onChange={(e) => updateField('proveedor', e.target.value)}
              placeholder="Nombre del proveedor"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Método de pago</label>
            <select
              value={form.metodo_pago}
              onChange={(e) => updateField('metodo_pago', e.target.value)}
              style={inputStyle}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: cantidad + unidad */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Cantidad (opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cantidad}
              onChange={(e) => updateField('cantidad', e.target.value)}
              placeholder="Ej: 5"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Unidad (opcional)</label>
            <input
              type="text"
              value={form.unidad}
              onChange={(e) => updateField('unidad', e.target.value)}
              placeholder="Ej: kg, litros, cajas"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label style={labelStyle}>Notas (opcional)</label>
          <textarea
            value={form.notas}
            onChange={(e) => updateField('notas', e.target.value)}
            placeholder="Detalles adicionales..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button
          type="button"
          onClick={onCancelar}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Guardando...' : gasto ? 'Guardar cambios' : 'Agregar gasto'}
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '14px',
};
