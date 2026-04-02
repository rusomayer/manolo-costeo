'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Local, DiaSemana, Horarios, RolEmpleado } from '@/lib/types';

interface MemberWithEmail {
  id: string;
  user_id: string;
  rol: string;
  email: string;
  isMe: boolean;
}

interface PendingInvite {
  id: string;
  codigo: string;
  tipo: string;
  email?: string;
  expires_at: string;
}

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const DIAS_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const DEFAULT_HORARIOS: Horarios = {
  lunes:     { abierto: true,  abre: '08:00', cierra: '22:00' },
  martes:    { abierto: true,  abre: '08:00', cierra: '22:00' },
  miercoles: { abierto: true,  abre: '08:00', cierra: '22:00' },
  jueves:    { abierto: true,  abre: '08:00', cierra: '22:00' },
  viernes:   { abierto: true,  abre: '08:00', cierra: '22:00' },
  sabado:    { abierto: true,  abre: '09:00', cierra: '20:00' },
  domingo:   { abierto: false, abre: '10:00', cierra: '18:00' },
};

function getLocalId() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').find(c => c.trim().startsWith('selected_local='))?.split('=')[1]?.trim() || '';
}

export default function MiLocalPage() {
  const [local, setLocal] = useState<Local | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [roles, setRoles] = useState<RolEmpleado[]>([]);
  const [nuevoRol, setNuevoRol] = useState('');
  const [horarios, setHorarios] = useState<Horarios>(DEFAULT_HORARIOS);

  // Equipo
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [myRole, setMyRole] = useState('');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const supabase = createClient();

  async function loadTeam() {
    const localId = getLocalId();
    if (!localId) return;

    const res = await fetch(`/api/members?local_id=${localId}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
      setMyRole(data.myRole || '');
    }

    const { data: invites } = await supabase
      .from('invitations')
      .select('id, codigo, tipo, email, expires_at')
      .eq('local_id', localId)
      .eq('estado', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setPendingInvites(invites || []);
  }

  useEffect(() => {
    async function load() {
      const localId = getLocalId();
      if (!localId) return;

      const { data } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (data) {
        setLocal(data as Local);
        setRoles(data.roles_empleados || []);
        setHorarios(data.horarios || DEFAULT_HORARIOS);
      }
    }
    load();
    loadTeam();
  }, []);

  function update<K extends keyof Local>(field: K, value: Local[K]) {
    setLocal(prev => prev ? { ...prev, [field]: value } : prev);
  }

  function updateNum(field: keyof Local, value: string) {
    const num = parseFloat(value);
    update(field, (isNaN(num) ? undefined : num) as any);
  }

  function updateInt(field: keyof Local, value: string) {
    const num = parseInt(value);
    update(field, (isNaN(num) ? undefined : num) as any);
  }

  async function handleSave() {
    if (!local) return;
    setSaving(true);
    const { error } = await supabase
      .from('locales')
      .update({
        nombre: local.nombre,
        direccion: local.direccion,
        tipo_local: local.tipo_local,
        ubicacion_url: local.ubicacion_url,
        telefono: local.telefono,
        superficie: local.superficie,
        cantidad_mesas: local.cantidad_mesas,
        mesas_terraza: local.mesas_terraza,
        capacidad_personas: local.capacidad_personas,
        cantidad_turnos: local.cantidad_turnos,
        empleados_por_turno: local.empleados_por_turno,
        rotacion_mesa: local.rotacion_mesa,
        roles_empleados: roles,
        horarios: horarios,
        alquiler_mensual: local.alquiler_mensual,
        costo_luz: local.costo_luz,
        costo_gas: local.costo_gas,
        costo_agua: local.costo_agua,
        costo_internet: local.costo_internet,
        costo_seguro: local.costo_seguro,
        costo_delivery_comision: local.costo_delivery_comision,
        ticket_promedio: local.ticket_promedio,
        food_cost_objetivo: local.food_cost_objetivo,
        meta_ventas_mensual: local.meta_ventas_mensual,
      })
      .eq('id', local.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function toggleDia(dia: DiaSemana) {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], abierto: !prev[dia].abierto },
    }));
  }

  function updateHorario(dia: DiaSemana, field: 'abre' | 'cierra', value: string) {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value },
    }));
  }

  async function generarInvitacion() {
    const localId = getLocalId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !localId) return;
    setInviteLoading(true);

    const { data } = await supabase
      .from('invitations')
      .insert([{
        local_id: localId,
        tipo: inviteEmail ? 'email' : 'link',
        email: inviteEmail || null,
        created_by: user.id,
      }])
      .select()
      .single();

    if (data) {
      const url = `${window.location.origin}/invite/${data.codigo}`;
      setInviteLink(url);
      navigator.clipboard.writeText(url);
      setInviteEmail('');
      await loadTeam();
    }
    setInviteLoading(false);
  }

  async function eliminarMiembro(memberId: string) {
    const localId = getLocalId();
    if (!confirm('¿Eliminar este miembro del local?')) return;
    await fetch('/api/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, localId }),
    });
    await loadTeam();
  }

  async function reenviarInvitacion(codigo: string) {
    const url = `${window.location.origin}/invite/${codigo}`;
    navigator.clipboard.writeText(url);
    setInviteLink(url);
  }

  async function eliminarInvitacion(inviteId: string) {
    await supabase.from('invitations').update({ estado: 'expired' }).eq('id', inviteId);
    await loadTeam();
  }

  function agregarRol() {
    if (!nuevoRol.trim()) return;
    setRoles(prev => [...prev, { rol: nuevoRol.trim(), cantidad: 1 }]);
    setNuevoRol('');
  }

  function eliminarRol(index: number) {
    setRoles(prev => prev.filter((_, i) => i !== index));
  }

  function updateCantidadRol(index: number, cantidad: number) {
    setRoles(prev => prev.map((r, i) => i === index ? { ...r, cantidad } : r));
  }

  if (!local) {
    return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</div>;
  }

  // Métricas calculadas
  const totalCostosFijos =
    (local.alquiler_mensual || 0) +
    (local.costo_luz || 0) +
    (local.costo_gas || 0) +
    (local.costo_agua || 0) +
    (local.costo_internet || 0) +
    (local.costo_seguro || 0);

  const capacidadDiaria =
    local.cantidad_mesas && local.cantidad_turnos && local.rotacion_mesa
      ? Math.round(local.cantidad_mesas * local.cantidad_turnos * local.rotacion_mesa)
      : null;

  const ventasParaCubrir =
    local.ticket_promedio && totalCostosFijos > 0
      ? Math.ceil(totalCostosFijos / local.ticket_promedio)
      : null;

  const formatARS = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Mi Local</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Datos operativos de {local.nombre}</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle}>
          {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar todo'}
        </button>
      </div>

      {/* ── SECCIÓN 0: Equipo ── */}
      <div id="equipo" style={{ ...cardStyle, padding: '20px', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: 'var(--text-primary)' }}>👤 Equipo y colaboradores</h3>

        {/* Miembros actuales */}
        {members.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={labelStyle}>Miembros</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {m.email[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email} {m.isMe && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(vos)</span>}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: m.rol === 'owner' ? '#f59e0b22' : 'var(--bg-tertiary)',
                    color: m.rol === 'owner' ? '#b45309' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {m.rol === 'owner' ? 'dueño' : 'miembro'}
                  </span>
                  {myRole === 'owner' && !m.isMe && m.rol !== 'owner' && (
                    <button
                      onClick={() => eliminarMiembro(m.id)}
                      style={{ ...removeBtnStyle, marginLeft: 4 }}
                      title="Eliminar del local"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invitaciones pendientes */}
        {pendingInvites.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={labelStyle}>Invitaciones pendientes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: '#ffc1071a',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #ffc10744',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email || 'Link sin email'}&nbsp;
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      · vence {new Date(inv.expires_at).toLocaleDateString('es-AR')}
                    </span>
                  </span>
                  <button
                    onClick={() => reenviarInvitacion(inv.codigo)}
                    style={{ ...btnOutlineStyle, fontSize: 12, padding: '4px 10px' }}
                    title="Copiar link de invitación"
                  >
                    Copiar link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Te invito a unirte a mi local en Manolo Costeo: ${window.location.origin}/invite/${inv.codigo}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      background: '#25D366',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WA
                  </a>
                  {myRole === 'owner' && (
                    <button
                      onClick={() => eliminarInvitacion(inv.id)}
                      style={{ ...removeBtnStyle }}
                      title="Cancelar invitación"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario invitar */}
        <div>
          <p style={labelStyle}>Invitar nuevo colaborador</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Email (opcional)"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generarInvitacion()}
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            />
            <button onClick={generarInvitacion} disabled={inviteLoading} style={btnPrimaryStyle}>
              {inviteLoading ? 'Generando...' : 'Generar link'}
            </button>
          </div>
          <p style={hintStyle}>El email es opcional. El link expira en 7 días.</p>
        </div>

        {inviteLink && (
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#1987541a', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, marginBottom: 6 }}>Link copiado al portapapeles</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 10 }}>{inviteLink}</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Te invito a unirte a mi local en Manolo Costeo: ${inviteLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: '#25D366',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Compartir por WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 1: Datos básicos ── */}
      <SectionCard title="📍 Datos básicos">
        <TwoCol>
          <Field label="Nombre del local">
            <input
              style={inputStyle}
              value={local.nombre || ''}
              onChange={e => update('nombre', e.target.value)}
            />
          </Field>
          <Field label="Tipo de local">
            <select
              style={inputStyle}
              value={local.tipo_local || 'cafe'}
              onChange={e => update('tipo_local', e.target.value)}
            >
              <option value="cafe">☕ Café</option>
              <option value="restaurante">🍽️ Restaurante</option>
              <option value="bar">🍺 Bar</option>
              <option value="panaderia">🥐 Panadería</option>
              <option value="heladeria">🍦 Heladería</option>
              <option value="otro">📦 Otro</option>
            </select>
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="Dirección">
            <input
              style={inputStyle}
              value={local.direccion || ''}
              onChange={e => update('direccion', e.target.value)}
              placeholder="Av. Corrientes 1234, CABA"
            />
          </Field>
          <Field label="Teléfono">
            <input
              style={inputStyle}
              value={local.telefono || ''}
              onChange={e => update('telefono', e.target.value)}
              placeholder="+54 11 1234-5678"
            />
          </Field>
        </TwoCol>
        <Field label="Link de Google Maps">
          <input
            style={inputStyle}
            value={local.ubicacion_url || ''}
            onChange={e => update('ubicacion_url', e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
          />
          {local.ubicacion_url && (
            <a
              href={local.ubicacion_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}
            >
              Ver en Google Maps ↗
            </a>
          )}
        </Field>
      </SectionCard>

      {/* ── SECCIÓN 2: Espacio y capacidad ── */}
      <SectionCard title="🏠 Espacio y capacidad">
        <TwoCol>
          <Field label="Superficie (m²)">
            <input
              style={inputStyle}
              type="number"
              value={local.superficie ?? ''}
              onChange={e => updateNum('superficie', e.target.value)}
              placeholder="120"
            />
          </Field>
          <Field label="Mesas en salón">
            <input
              style={inputStyle}
              type="number"
              value={local.cantidad_mesas ?? ''}
              onChange={e => updateInt('cantidad_mesas', e.target.value)}
              placeholder="15"
            />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="Mesas en terraza">
            <input
              style={inputStyle}
              type="number"
              value={local.mesas_terraza ?? ''}
              onChange={e => updateInt('mesas_terraza', e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Capacidad total (personas)">
            <input
              style={inputStyle}
              type="number"
              value={local.capacidad_personas ?? ''}
              onChange={e => updateInt('capacidad_personas', e.target.value)}
              placeholder="40"
            />
          </Field>
        </TwoCol>
        {capacidadDiaria && (
          <InfoBox>
            📊 Con {local.cantidad_mesas} mesas · {local.cantidad_turnos} turno{local.cantidad_turnos !== 1 ? 's' : ''} · rotación {local.rotacion_mesa}x → <strong>~{capacidadDiaria} cubiertos/día</strong>
          </InfoBox>
        )}
      </SectionCard>

      {/* ── SECCIÓN 3: Operaciones ── */}
      <SectionCard title="👥 Operaciones">
        <TwoCol>
          <Field label="Turnos por día">
            <input
              style={inputStyle}
              type="number"
              value={local.cantidad_turnos ?? ''}
              onChange={e => updateInt('cantidad_turnos', e.target.value)}
              placeholder="2"
            />
          </Field>
          <Field label="Empleados por turno">
            <input
              style={inputStyle}
              type="number"
              value={local.empleados_por_turno ?? ''}
              onChange={e => updateInt('empleados_por_turno', e.target.value)}
              placeholder="3"
            />
          </Field>
        </TwoCol>
        <Field label="Rotación de mesa (veces por turno)">
          <input
            style={{ ...inputStyle, maxWidth: 160 }}
            type="number"
            step="0.5"
            value={local.rotacion_mesa ?? ''}
            onChange={e => updateNum('rotacion_mesa', e.target.value)}
            placeholder="1.5"
          />
          <p style={hintStyle}>Cuántas veces se ocupa cada mesa en un turno</p>
        </Field>

        {/* Roles */}
        <div style={{ marginTop: 4 }}>
          <p style={labelStyle}>Roles del equipo</p>
          {roles.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Aún no hay roles definidos.</p>
          )}
          {roles.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{r.rol}</span>
              <input
                type="number"
                min="1"
                value={r.cantidad}
                onChange={e => updateCantidadRol(i, parseInt(e.target.value) || 1)}
                style={{ ...inputStyle, width: 64, textAlign: 'center' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 52 }}>
                persona{r.cantidad !== 1 ? 's' : ''}
              </span>
              <button onClick={() => eliminarRol(i)} style={removeBtnStyle}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={nuevoRol}
              onChange={e => setNuevoRol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarRol()}
              placeholder="Ej: Barista, Cajero, Encargado..."
            />
            <button onClick={agregarRol} style={btnOutlineStyle}>+ Agregar</button>
          </div>
        </div>
      </SectionCard>

      {/* ── SECCIÓN 4: Horarios ── */}
      <SectionCard title="🕐 Horarios de apertura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DIAS.map(dia => (
            <div key={dia} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                <button
                  onClick={() => toggleDia(dia)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    border: 'none',
                    background: horarios[dia].abierto ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: horarios[dia].abierto ? 17 : 3,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: '#fff',
                    transition: 'left 0.15s',
                  }} />
                </button>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: horarios[dia].abierto ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                  {DIAS_LABEL[dia]}
                </span>
              </div>

              {horarios[dia].abierto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="time"
                    value={horarios[dia].abre}
                    onChange={e => updateHorario(dia, 'abre', e.target.value)}
                    style={{ ...inputStyle, width: 120 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>a</span>
                  <input
                    type="time"
                    value={horarios[dia].cierra}
                    onChange={e => updateHorario(dia, 'cierra', e.target.value)}
                    style={{ ...inputStyle, width: 120 }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── SECCIÓN 5: Costos fijos ── */}
      <SectionCard title="💰 Costos fijos mensuales estimados">
        <TwoCol>
          <Field label="Alquiler ($)">
            <input style={inputStyle} type="number" value={local.alquiler_mensual ?? ''} onChange={e => updateNum('alquiler_mensual', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Luz / electricidad ($)">
            <input style={inputStyle} type="number" value={local.costo_luz ?? ''} onChange={e => updateNum('costo_luz', e.target.value)} placeholder="0" />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="Gas ($)">
            <input style={inputStyle} type="number" value={local.costo_gas ?? ''} onChange={e => updateNum('costo_gas', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Agua ($)">
            <input style={inputStyle} type="number" value={local.costo_agua ?? ''} onChange={e => updateNum('costo_agua', e.target.value)} placeholder="0" />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="Internet / telefonía ($)">
            <input style={inputStyle} type="number" value={local.costo_internet ?? ''} onChange={e => updateNum('costo_internet', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Seguro ($)">
            <input style={inputStyle} type="number" value={local.costo_seguro ?? ''} onChange={e => updateNum('costo_seguro', e.target.value)} placeholder="0" />
          </Field>
        </TwoCol>
        <Field label="Comisión plataformas delivery (%)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              style={{ ...inputStyle, maxWidth: 120 }}
              type="number"
              step="0.5"
              max="100"
              value={local.costo_delivery_comision ?? ''}
              onChange={e => updateNum('costo_delivery_comision', e.target.value)}
              placeholder="18"
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>% sobre cada venta</span>
          </div>
          <p style={hintStyle}>Promedio entre Rappi, PedidosYa, etc.</p>
        </Field>
        {totalCostosFijos > 0 && (
          <InfoBox>
            📊 Total costos fijos configurados: <strong>{formatARS(totalCostosFijos)}/mes</strong>
          </InfoBox>
        )}
      </SectionCard>

      {/* ── SECCIÓN 6: Objetivos ── */}
      <SectionCard title="🎯 Objetivos del negocio">
        <TwoCol>
          <Field label="Ticket promedio objetivo ($)">
            <input
              style={inputStyle}
              type="number"
              value={local.ticket_promedio ?? ''}
              onChange={e => updateNum('ticket_promedio', e.target.value)}
              placeholder="2500"
            />
          </Field>
          <Field label="Food cost objetivo (%)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="number"
                step="0.5"
                max="100"
                value={local.food_cost_objetivo ?? ''}
                onChange={e => updateNum('food_cost_objetivo', e.target.value)}
                placeholder="32"
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
            </div>
            <p style={hintStyle}>En cafés/restaurantes: típicamente 28–35%</p>
          </Field>
        </TwoCol>
        <Field label="Meta de ventas mensual ($)">
          <input
            style={{ ...inputStyle, maxWidth: 280 }}
            type="number"
            value={local.meta_ventas_mensual ?? ''}
            onChange={e => updateNum('meta_ventas_mensual', e.target.value)}
            placeholder="500000"
          />
        </Field>

        {/* Métricas de insight */}
        {ventasParaCubrir && local.ticket_promedio && (
          <InfoBox>
            📊 Con ticket promedio {formatARS(local.ticket_promedio)}, necesitás <strong>~{ventasParaCubrir} ventas/mes</strong> solo para cubrir costos fijos
          </InfoBox>
        )}
        {local.meta_ventas_mensual && local.food_cost_objetivo && (
          <InfoBox>
            🍳 Con food cost {local.food_cost_objetivo}%, tu insumo máximo mensual sería <strong>{formatARS(local.meta_ventas_mensual * local.food_cost_objetivo / 100)}</strong>
          </InfoBox>
        )}
      </SectionCard>

      {/* Bottom save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle}>
          {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar todo'}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={labelStyle}>{label}</p>
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-secondary)',
      marginTop: 4,
      marginBottom: 8,
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px 20px 4px',
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginTop: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const btnOutlineStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
  padding: '0 4px',
  flexShrink: 0,
};
