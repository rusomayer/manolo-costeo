'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  MapPin, Building2, Settings2, Users, Users2, DollarSign, Target, Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { Local, DiaSemana, HorarioRango, Empleado } from '@/lib/types';

// ─── Interfaces para equipo ───────────────────────────────────────────────────

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

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const DIA_SHORT: Record<DiaSemana, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};

const DIA_FULL: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

const TIPO_LOCAL_LABEL: Record<string, string> = {
  cafe: '☕ Café', restaurante: '🍽️ Restaurante', bar: '🍺 Bar',
  panaderia: '🥐 Panadería', heladeria: '🍦 Heladería', otro: '📦 Otro',
};

const EMPTY_EMPLEADO: Omit<Empleado, 'id'> = {
  nombre: '', rol: '', sueldo_neto: undefined, horas_jornada: 8,
  dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  jornada: 'completa', es_yo: false,
};

function getLocalId() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').find(c => c.trim().startsWith('selected_local='))?.split('=')[1]?.trim() || '';
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MiLocalPage() {
  const supabase = createClient();

  // Local data
  const [local, setLocal] = useState<Local | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  // Horarios simplificados
  const [horarioApertura, setHorarioApertura] = useState<HorarioRango[]>([]);

  // Empleados
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [showEmpleadoForm, setShowEmpleadoForm] = useState(false);
  const [editingEmpleadoId, setEditingEmpleadoId] = useState<string | null>(null);
  const [empleadoForm, setEmpleadoForm] = useState<Omit<Empleado, 'id'>>(EMPTY_EMPLEADO);

  // Equipo / invitaciones
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [myRole, setMyRole] = useState('');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [invitePanel, setInvitePanel] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Eliminar local
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // ── Load ──────────────────────────────────────────────────────────────────

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
      .from('invitations').select('id, codigo, tipo, email, expires_at')
      .eq('local_id', localId).eq('estado', 'pending')
      .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
    setPendingInvites(invites || []);
  }

  useEffect(() => {
    async function load() {
      const localId = getLocalId();
      if (!localId) return;
      const { data } = await supabase.from('locales').select('*').eq('id', localId).single();
      if (data) {
        setLocal(data as Local);
        setHorarioApertura((data as any).horario_apertura || []);
        setEmpleados((data as any).empleados || []);
      }
    }
    load();
    loadTeam();
  }, []);

  // ── Save per section ──────────────────────────────────────────────────────

  async function saveSection(section: string, extraFields?: Record<string, any>) {
    if (!local) return;
    setSavingSection(section);

    const fieldMap: Record<string, Partial<any>> = {
      datos: { nombre: local.nombre, tipo_local: local.tipo_local, direccion: local.direccion, telefono: local.telefono, ubicacion_url: local.ubicacion_url },
      espacio: { superficie: local.superficie, cantidad_mesas: local.cantidad_mesas, mesas_terraza: local.mesas_terraza, capacidad_personas: local.capacidad_personas },
      operaciones: { cantidad_turnos: local.cantidad_turnos, empleados_por_turno: local.empleados_por_turno, rotacion_mesa: local.rotacion_mesa, horario_apertura: horarioApertura },
      costos: { alquiler_mensual: local.alquiler_mensual, costo_luz: local.costo_luz, costo_gas: local.costo_gas, costo_agua: local.costo_agua, costo_internet: local.costo_internet, costo_seguro: local.costo_seguro, costo_delivery_comision: local.costo_delivery_comision },
      objetivos: { ticket_promedio: local.ticket_promedio, food_cost_objetivo: local.food_cost_objetivo, meta_ventas_mensual: local.meta_ventas_mensual },
    };

    const fields = { ...(fieldMap[section] || {}), ...(extraFields || {}) };
    const { error } = await supabase.from('locales').update(fields).eq('id', local.id);
    setSavingSection(null);
    if (!error) {
      setSavedSection(section);
      setEditingSection(null);
      setTimeout(() => setSavedSection(null), 2000);

      // Sync costos fijos o sueldos a la planilla de gastos
      if (section === 'costos') {
        fetch('/api/gastos/sync-costos-fijos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'costos' }),
        }).catch(console.error);
      }
    }
  }

  function update<K extends keyof Local>(field: K, value: Local[K]) {
    setLocal(prev => prev ? { ...prev, [field]: value } : prev);
  }
  function updateNum(field: keyof Local, value: string) {
    const n = parseFloat(value); update(field, (isNaN(n) ? undefined : n) as any);
  }
  function updateInt(field: keyof Local, value: string) {
    const n = parseInt(value); update(field, (isNaN(n) ? undefined : n) as any);
  }

  // ── Empleados ─────────────────────────────────────────────────────────────

  async function saveEmpleados(lista: Empleado[]) {
    if (!local) return;
    await supabase.from('locales').update({ empleados: lista }).eq('id', local.id);
    setEmpleados(lista);

    // Sync sueldos a la planilla de gastos
    fetch('/api/gastos/sync-costos-fijos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'sueldos' }),
    }).catch(console.error);
  }

  function startAddEmpleado() {
    setEmpleadoForm(EMPTY_EMPLEADO);
    setEditingEmpleadoId(null);
    setShowEmpleadoForm(true);
  }

  function startEditEmpleado(emp: Empleado) {
    const { id, ...rest } = emp;
    setEmpleadoForm(rest);
    setEditingEmpleadoId(id);
    setShowEmpleadoForm(true);
  }

  async function confirmEmpleado() {
    if (!empleadoForm.nombre.trim()) return;
    let lista: Empleado[];
    if (editingEmpleadoId) {
      lista = empleados.map(e => e.id === editingEmpleadoId ? { id: editingEmpleadoId, ...empleadoForm } : e);
    } else {
      lista = [...empleados, { id: nanoid(), ...empleadoForm }];
    }
    await saveEmpleados(lista);
    setShowEmpleadoForm(false);
    setEditingEmpleadoId(null);
  }

  async function removeEmpleado(id: string) {
    if (!confirm('¿Eliminar este empleado?')) return;
    await saveEmpleados(empleados.filter(e => e.id !== id));
  }

  function toggleDiaEmpleado(dia: DiaSemana) {
    setEmpleadoForm(prev => ({
      ...prev,
      dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia],
    }));
  }

  // ── Horario apertura ──────────────────────────────────────────────────────

  function addHorarioRango() {
    setHorarioApertura(prev => [...prev, { id: nanoid(), desde: 'lunes', hasta: 'viernes', abre: '08:00', cierra: '22:00' }]);
  }

  function updateHorarioRango(id: string, field: keyof HorarioRango, value: string) {
    setHorarioApertura(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  }

  function removeHorarioRango(id: string) {
    setHorarioApertura(prev => prev.filter(h => h.id !== id));
  }

  // ── Equipo / invitaciones ─────────────────────────────────────────────────

  async function abrirInvitePanel() {
    setInvitePanel(true); setInviteLink(''); setInviteEmail('');
    const localId = getLocalId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !localId) return;
    setInviteLoading(true);
    const { data } = await supabase.from('invitations')
      .insert([{ local_id: localId, tipo: 'link', email: null, created_by: user.id }])
      .select().single();
    setInviteLoading(false);
    if (data) { setInviteLink(`${window.location.origin}/invite/${data.codigo}`); await loadTeam(); }
  }

  function copiarLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedId('new'); setTimeout(() => setCopiedId(null), 2500);
  }

  async function copiarLinkPendiente(codigo: string) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${codigo}`);
    setCopiedId(codigo); setTimeout(() => setCopiedId(null), 2500);
  }

  async function eliminarMiembro(memberId: string) {
    if (!confirm('¿Eliminar este miembro del local?')) return;
    await fetch('/api/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId, localId: getLocalId() }) });
    await loadTeam();
  }

  async function eliminarInvitacion(inviteId: string) {
    await supabase.from('invitations').update({ estado: 'expired' }).eq('id', inviteId);
    await loadTeam();
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  if (!local) return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</div>;

  const formatARS = (n?: number) => n != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
    : '—';

  const totalCostosFijos =
    (local.alquiler_mensual || 0) + (local.costo_luz || 0) + (local.costo_gas || 0) +
    (local.costo_agua || 0) + (local.costo_internet || 0) + (local.costo_seguro || 0);

  // Roles disponibles para el form de empleados
  const rolesDisponibles = Array.from(new Set([
    ...(local.roles_empleados || []).map(r => r.rol),
    ...empleados.map(e => e.rol).filter(Boolean),
  ]));

  // ── Eliminar local ────────────────────────────────────────────────────────

  async function handleDeleteLocal() {
    if (!local || deleteConfirmText !== local.nombre) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/locales/${local.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al eliminar el local');
        setDeleting(false);
        return;
      }
      // Clear selected local cookie
      document.cookie = 'selected_local=; path=/; max-age=0';
      router.push('/dashboard');
      router.refresh();
    } catch {
      alert('Error de conexion');
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Mi Local</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Datos operativos de {local.nombre}</p>
      </div>

      {/* ── Equipo y colaboradores ── */}
      <div id="equipo" style={{ ...cardStyle, padding: '20px', marginBottom: 16 }}>
        <h3 style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          Equipo y colaboradores
        </h3>

        {members.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={labelStyle}>Miembros</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map(m => (
                <div key={m.id} style={memberRowStyle}>
                  <div style={avatarStyle}>{m.email[0]?.toUpperCase()}</div>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.email} {m.isMe && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(vos)</span>}
                  </span>
                  <span style={{ ...rolBadgeStyle, background: m.rol === 'owner' ? '#f59e0b22' : 'var(--bg-tertiary)', color: m.rol === 'owner' ? '#b45309' : 'var(--text-muted)' }}>
                    {m.rol === 'owner' ? 'dueño' : 'miembro'}
                  </span>
                  {myRole === 'owner' && !m.isMe && m.rol !== 'owner' && (
                    <button onClick={() => eliminarMiembro(m.id)} style={removeBtnStyle}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!invitePanel ? (
          <button onClick={abrirInvitePanel} style={{ ...btnOutlineStyle, width: '100%', justifyContent: 'center', marginBottom: pendingInvites.length > 0 ? 14 : 0 }}>
            + Invitar colaborador
          </button>
        ) : (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: pendingInvites.length > 0 ? 14 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Nueva invitación</p>
              <button onClick={() => { setInvitePanel(false); setInviteLink(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input readOnly value={inviteLoading ? 'Generando...' : inviteLink} style={{ ...inputStyle, flex: 1, color: 'var(--text-muted)', fontSize: 12 }} />
              <button onClick={copiarLink} disabled={!inviteLink} style={{ ...btnOutlineStyle, flexShrink: 0 }}>
                {copiedId === 'new' ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <a href={inviteLink ? `https://wa.me/?text=${encodeURIComponent(`Te invito a unirte a mi local en Manolo Costeo: ${inviteLink}`)}` : '#'} target="_blank" rel="noopener noreferrer"
              onClick={e => !inviteLink && e.preventDefault()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', borderRadius: 'var(--radius-sm)', background: inviteLink ? '#25D366' : 'var(--border)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
              <WaIcon size={15} /> Compartir por WhatsApp
            </a>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>O enviá por email</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="email" placeholder="email@ejemplo.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 12 }} />
                <button disabled style={{ ...btnPrimaryStyle, opacity: 0.4, cursor: 'not-allowed' }}>Enviar</button>
              </div>
              <p style={hintStyle}>Envío por email próximamente.</p>
            </div>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div>
            <p style={{ ...labelStyle, marginTop: 14 }}>Pendientes ({pendingInvites.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email || 'Sin email'} · <span style={{ color: 'var(--text-muted)' }}>vence {new Date(inv.expires_at).toLocaleDateString('es-AR')}</span>
                  </span>
                  <button onClick={() => copiarLinkPendiente(inv.codigo)} style={{ ...btnOutlineStyle, fontSize: 11, padding: '3px 8px' }}>
                    {copiedId === inv.codigo ? '✓' : 'Copiar'}
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Te invito a unirte a mi local en Manolo Costeo: ${window.location.origin}/invite/${inv.codigo}`)}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: '#25D366', color: '#fff', flexShrink: 0 }}>
                    <WaIcon size={13} />
                  </a>
                  {myRole === 'owner' && <button onClick={() => eliminarInvitacion(inv.id)} style={removeBtnStyle}>×</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Datos básicos ── */}
      <SectionCard
        title="Datos básicos" icon={MapPin}
        isEditing={editingSection === 'datos'}
        saving={savingSection === 'datos'}
        saved={savedSection === 'datos'}
        onEdit={() => setEditingSection('datos')}
        onCancel={() => setEditingSection(null)}
        onSave={() => saveSection('datos')}
        viewContent={
          <div style={viewGridStyle}>
            <ViewItem label="Nombre" value={local.nombre} />
            <ViewItem label="Tipo" value={TIPO_LOCAL_LABEL[local.tipo_local || ''] || local.tipo_local} />
            <ViewItem label="Dirección" value={local.direccion} />
            <ViewItem label="Teléfono" value={local.telefono} />
            {local.ubicacion_url && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={labelStyle}>Ubicación</p>
                <a href={local.ubicacion_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                  Ver en Google Maps ↗
                </a>
              </div>
            )}
          </div>
        }
        editContent={
          <>
            <TwoCol>
              <Field label="Nombre del local">
                <input style={inputStyle} value={local.nombre || ''} onChange={e => update('nombre', e.target.value)} />
              </Field>
              <Field label="Tipo de local">
                <select style={inputStyle} value={local.tipo_local || 'cafe'} onChange={e => update('tipo_local', e.target.value)}>
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
                <input style={inputStyle} value={local.direccion || ''} onChange={e => update('direccion', e.target.value)} placeholder="Av. Corrientes 1234" />
              </Field>
              <Field label="Teléfono">
                <input style={inputStyle} value={local.telefono || ''} onChange={e => update('telefono', e.target.value)} placeholder="+54 11 1234-5678" />
              </Field>
            </TwoCol>
            <Field label="Link de Google Maps">
              <input style={inputStyle} value={local.ubicacion_url || ''} onChange={e => update('ubicacion_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
            </Field>
          </>
        }
      />

      {/* ── Espacio y capacidad ── */}
      <SectionCard
        title="Espacio y capacidad" icon={Building2}
        isEditing={editingSection === 'espacio'}
        saving={savingSection === 'espacio'}
        saved={savedSection === 'espacio'}
        onEdit={() => setEditingSection('espacio')}
        onCancel={() => setEditingSection(null)}
        onSave={() => saveSection('espacio')}
        viewContent={
          <div style={viewGridStyle}>
            <ViewItem label="Superficie" value={local.superficie ? `${local.superficie} m²` : undefined} />
            <ViewItem label="Mesas en salón" value={local.cantidad_mesas?.toString()} />
            <ViewItem label="Mesas en terraza" value={local.mesas_terraza?.toString()} />
            <ViewItem label="Capacidad total" value={local.capacidad_personas ? `${local.capacidad_personas} personas` : undefined} />
          </div>
        }
        editContent={
          <>
            <TwoCol>
              <Field label="Superficie (m²)">
                <input style={inputStyle} type="number" value={local.superficie ?? ''} onChange={e => updateNum('superficie', e.target.value)} placeholder="120" />
              </Field>
              <Field label="Mesas en salón">
                <input style={inputStyle} type="number" value={local.cantidad_mesas ?? ''} onChange={e => updateInt('cantidad_mesas', e.target.value)} placeholder="15" />
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Mesas en terraza">
                <input style={inputStyle} type="number" value={local.mesas_terraza ?? ''} onChange={e => updateInt('mesas_terraza', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Capacidad total (personas)">
                <input style={inputStyle} type="number" value={local.capacidad_personas ?? ''} onChange={e => updateInt('capacidad_personas', e.target.value)} placeholder="40" />
              </Field>
            </TwoCol>
          </>
        }
      />

      {/* ── Operaciones ── */}
      <SectionCard
        title="Operaciones" icon={Settings2}
        isEditing={editingSection === 'operaciones'}
        saving={savingSection === 'operaciones'}
        saved={savedSection === 'operaciones'}
        onEdit={() => setEditingSection('operaciones')}
        onCancel={() => setEditingSection(null)}
        onSave={() => saveSection('operaciones')}
        viewContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={viewGridStyle}>
              <ViewItem label="Turnos por día" value={local.cantidad_turnos?.toString()} />
              <ViewItem label="Empleados por turno" value={local.empleados_por_turno?.toString()} />
              <ViewItem label="Rotación de mesa" value={local.rotacion_mesa ? `${local.rotacion_mesa}x por turno` : undefined} />
            </div>
            {horarioApertura.length > 0 && (
              <div>
                <p style={labelStyle}>Horario de apertura</p>
                {horarioApertura.map(h => (
                  <p key={h.id} style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {DIA_FULL[h.desde]} → {DIA_FULL[h.hasta]} &nbsp; {h.abre} – {h.cierra}
                  </p>
                ))}
              </div>
            )}
          </div>
        }
        editContent={
          <>
            <TwoCol>
              <Field label="Turnos por día">
                <input style={inputStyle} type="number" value={local.cantidad_turnos ?? ''} onChange={e => updateInt('cantidad_turnos', e.target.value)} placeholder="2" />
              </Field>
              <Field label="Empleados por turno">
                <input style={inputStyle} type="number" value={local.empleados_por_turno ?? ''} onChange={e => updateInt('empleados_por_turno', e.target.value)} placeholder="3" />
              </Field>
            </TwoCol>
            <Field label="Rotación de mesa (veces por turno)">
              <input style={{ ...inputStyle, maxWidth: 160 }} type="number" step="0.5" value={local.rotacion_mesa ?? ''} onChange={e => updateNum('rotacion_mesa', e.target.value)} placeholder="1.5" />
            </Field>

            <div style={{ marginTop: 4 }}>
              <p style={labelStyle}>Horario de apertura</p>
              {horarioApertura.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Sin horarios definidos.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {horarioApertura.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>De</span>
                    <select value={h.desde} onChange={e => updateHorarioRango(h.id, 'desde', e.target.value as DiaSemana)} style={{ ...inputStyle, width: 110 }}>
                      {DIAS.map(d => <option key={d} value={d}>{DIA_FULL[d]}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>a</span>
                    <select value={h.hasta} onChange={e => updateHorarioRango(h.id, 'hasta', e.target.value as DiaSemana)} style={{ ...inputStyle, width: 110 }}>
                      {DIAS.map(d => <option key={d} value={d}>{DIA_FULL[d]}</option>)}
                    </select>
                    <input type="time" value={h.abre} onChange={e => updateHorarioRango(h.id, 'abre', e.target.value)} style={{ ...inputStyle, width: 110 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>–</span>
                    <input type="time" value={h.cierra} onChange={e => updateHorarioRango(h.id, 'cierra', e.target.value)} style={{ ...inputStyle, width: 110 }} />
                    <button onClick={() => removeHorarioRango(h.id)} style={removeBtnStyle}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={addHorarioRango} style={{ ...btnOutlineStyle, marginTop: 10, fontSize: 12 }}>+ Agregar rango</button>
            </div>
          </>
        }
      />

      {/* ── Empleados ── */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users2 size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            Empleados
          </h3>
          {!showEmpleadoForm && (
            <button onClick={startAddEmpleado} style={editBtnStyle}>+ Agregar</button>
          )}
        </div>

        {/* Lista de empleados */}
        {empleados.length === 0 && !showEmpleadoForm && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
            Sin empleados registrados. Agregá el primero.
          </p>
        )}
        {empleados.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showEmpleadoForm ? 16 : 0 }}>
            {empleados.map(emp => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ ...avatarStyle, background: emp.es_yo ? 'var(--accent)' : '#6b7280' }}>{emp.nombre[0]?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.nombre}</span>
                    {emp.es_yo && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>yo</span>}
                    {emp.rol && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.rol}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                    {emp.horas_jornada && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.horas_jornada}hs/día</span>}
                    {emp.sueldo_neto && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatARS(emp.sueldo_neto)}/mes</span>}
                    {emp.dias.length > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {emp.jornada !== 'personalizada'
                          ? emp.jornada === 'completa' ? 'Jornada completa' : 'Media jornada'
                          : emp.dias.map(d => DIA_SHORT[d]).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => startEditEmpleado(emp)} style={editBtnStyle}>Editar</button>
                  <button onClick={() => removeEmpleado(emp.id)} style={removeBtnStyle}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de empleado */}
        {showEmpleadoForm && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
              {editingEmpleadoId ? 'Editar empleado' : 'Nuevo empleado'}
            </p>
            <TwoCol>
              <Field label="Nombre">
                <input style={inputStyle} value={empleadoForm.nombre} onChange={e => setEmpleadoForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan Pérez" />
              </Field>
              <Field label="Rol">
                <input
                  style={inputStyle}
                  list="roles-list"
                  value={empleadoForm.rol}
                  onChange={e => setEmpleadoForm(p => ({ ...p, rol: e.target.value }))}
                  placeholder="Barista, Cajero..."
                />
                <datalist id="roles-list">
                  {rolesDisponibles.map(r => <option key={r} value={r} />)}
                </datalist>
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Sueldo neto ($)">
                <input style={inputStyle} type="number" value={empleadoForm.sueldo_neto ?? ''} onChange={e => setEmpleadoForm(p => ({ ...p, sueldo_neto: parseFloat(e.target.value) || undefined }))} placeholder="150000" />
              </Field>
              <Field label="Horas por jornada">
                <input style={inputStyle} type="number" value={empleadoForm.horas_jornada ?? ''} onChange={e => setEmpleadoForm(p => ({ ...p, horas_jornada: parseInt(e.target.value) || undefined }))} placeholder="8" />
              </Field>
            </TwoCol>

            <Field label="Jornada">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['completa', 'media', 'personalizada'] as const).map(j => (
                  <button
                    key={j}
                    onClick={() => setEmpleadoForm(p => ({ ...p, jornada: j }))}
                    style={{
                      padding: '7px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: empleadoForm.jornada === j ? 'var(--accent)' : 'var(--bg-primary)',
                      color: empleadoForm.jornada === j ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {j === 'completa' ? 'Completa' : j === 'media' ? 'Media' : 'Personalizada'}
                  </button>
                ))}
              </div>
            </Field>

            {empleadoForm.jornada === 'personalizada' && (
              <Field label="Días que trabaja">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DIAS.map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDiaEmpleado(d)}
                      style={{
                        padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer',
                        border: '1px solid var(--border)',
                        background: empleadoForm.dias.includes(d) ? 'var(--accent)' : 'var(--bg-primary)',
                        color: empleadoForm.dias.includes(d) ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {DIA_SHORT[d]}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input
                type="checkbox"
                id="es_yo"
                checked={empleadoForm.es_yo}
                onChange={e => setEmpleadoForm(p => ({ ...p, es_yo: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="es_yo" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Este empleado soy yo
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowEmpleadoForm(false); setEditingEmpleadoId(null); }} style={cancelBtnStyle}>Cancelar</button>
              <button onClick={confirmEmpleado} disabled={!empleadoForm.nombre.trim()} style={btnPrimaryStyle}>
                {editingEmpleadoId ? 'Guardar cambios' : 'Agregar empleado'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Costos fijos ── */}
      <SectionCard
        title="Costos fijos mensuales" icon={DollarSign}
        isEditing={editingSection === 'costos'}
        saving={savingSection === 'costos'}
        saved={savedSection === 'costos'}
        onEdit={() => setEditingSection('costos')}
        onCancel={() => setEditingSection(null)}
        onSave={() => saveSection('costos')}
        viewContent={
          <div>
            <div style={viewGridStyle}>
              <ViewItem label="Alquiler" value={formatARS(local.alquiler_mensual)} />
              <ViewItem label="Luz / electricidad" value={formatARS(local.costo_luz)} />
              <ViewItem label="Gas" value={formatARS(local.costo_gas)} />
              <ViewItem label="Agua" value={formatARS(local.costo_agua)} />
              <ViewItem label="Internet / telefonía" value={formatARS(local.costo_internet)} />
              <ViewItem label="Seguro" value={formatARS(local.costo_seguro)} />
              {local.costo_delivery_comision && <ViewItem label="Comisión delivery" value={`${local.costo_delivery_comision}%`} />}
            </div>
            {totalCostosFijos > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total mensual estimado</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{formatARS(totalCostosFijos)}</span>
              </div>
            )}
          </div>
        }
        editContent={
          <>
            <TwoCol>
              <Field label="Alquiler ($)"><input style={inputStyle} type="number" value={local.alquiler_mensual ?? ''} onChange={e => updateNum('alquiler_mensual', e.target.value)} placeholder="0" /></Field>
              <Field label="Luz / electricidad ($)"><input style={inputStyle} type="number" value={local.costo_luz ?? ''} onChange={e => updateNum('costo_luz', e.target.value)} placeholder="0" /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Gas ($)"><input style={inputStyle} type="number" value={local.costo_gas ?? ''} onChange={e => updateNum('costo_gas', e.target.value)} placeholder="0" /></Field>
              <Field label="Agua ($)"><input style={inputStyle} type="number" value={local.costo_agua ?? ''} onChange={e => updateNum('costo_agua', e.target.value)} placeholder="0" /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Internet / telefonía ($)"><input style={inputStyle} type="number" value={local.costo_internet ?? ''} onChange={e => updateNum('costo_internet', e.target.value)} placeholder="0" /></Field>
              <Field label="Seguro ($)"><input style={inputStyle} type="number" value={local.costo_seguro ?? ''} onChange={e => updateNum('costo_seguro', e.target.value)} placeholder="0" /></Field>
            </TwoCol>
            <Field label="Comisión plataformas delivery (%)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ ...inputStyle, maxWidth: 120 }} type="number" step="0.5" max="100" value={local.costo_delivery_comision ?? ''} onChange={e => updateNum('costo_delivery_comision', e.target.value)} placeholder="18" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>% por venta</span>
              </div>
            </Field>
          </>
        }
      />

      {/* ── Objetivos ── */}
      <SectionCard
        title="Objetivos del negocio" icon={Target}
        isEditing={editingSection === 'objetivos'}
        saving={savingSection === 'objetivos'}
        saved={savedSection === 'objetivos'}
        onEdit={() => setEditingSection('objetivos')}
        onCancel={() => setEditingSection(null)}
        onSave={() => saveSection('objetivos')}
        viewContent={
          <div style={viewGridStyle}>
            <ViewItem label="Ticket promedio" value={formatARS(local.ticket_promedio)} />
            <ViewItem label="Food cost objetivo" value={local.food_cost_objetivo ? `${local.food_cost_objetivo}%` : undefined} />
            <ViewItem label="Meta de ventas mensual" value={formatARS(local.meta_ventas_mensual)} />
          </div>
        }
        editContent={
          <>
            <TwoCol>
              <Field label="Ticket promedio ($)">
                <input style={inputStyle} type="number" value={local.ticket_promedio ?? ''} onChange={e => updateNum('ticket_promedio', e.target.value)} placeholder="2500" />
              </Field>
              <Field label="Food cost objetivo (%)">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} type="number" step="0.5" max="100" value={local.food_cost_objetivo ?? ''} onChange={e => updateNum('food_cost_objetivo', e.target.value)} placeholder="32" />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
                </div>
              </Field>
            </TwoCol>
            <Field label="Meta de ventas mensual ($)">
              <input style={{ ...inputStyle, maxWidth: 280 }} type="number" value={local.meta_ventas_mensual ?? ''} onChange={e => updateNum('meta_ventas_mensual', e.target.value)} placeholder="500000" />
            </Field>
          </>
        }
      />

      {/* ── Zona de peligro ── */}
      {myRole === 'owner' && (
        <div style={{ ...cardStyle, marginBottom: 16, borderColor: 'var(--danger, #ef4444)', borderWidth: 1 }}>
          <h3 style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger, #ef4444)' }}>
            <Trash2 size={16} style={{ flexShrink: 0 }} />
            Zona de peligro
          </h3>

          {!showDeleteConfirm ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Eliminar este local</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Se eliminan todos los gastos, recetas y datos asociados.</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: '1px solid var(--danger, #ef4444)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--danger, #ef4444)', cursor: 'pointer' }}
              >
                Eliminar local
              </button>
            </div>
          ) : (
            <div>
              <div style={{ padding: 14, background: '#ef44441a', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger, #ef4444)', marginBottom: 4 }}>
                  Esta accion no puede ser revertida
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Se van a eliminar permanentemente todos los gastos, recetas, proveedores, precios, miembros e invitaciones de <strong>{local.nombre}</strong>.
                </p>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Escribi <strong>{local.nombre}</strong> para confirmar:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={local.nombre}
                style={{ ...inputStyle, marginBottom: 12, borderColor: 'var(--danger, #ef4444)' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteLocal}
                  disabled={deleteConfirmText !== local.nombre || deleting}
                  style={{
                    padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)',
                    background: deleteConfirmText === local.nombre ? 'var(--danger, #ef4444)' : '#ccc',
                    color: '#fff', cursor: deleteConfirmText === local.nombre ? 'pointer' : 'not-allowed',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar permanentemente'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, isEditing, saving, saved, onEdit, onCancel, onSave, viewContent, editContent }: {
  title: string;
  icon?: LucideIcon;
  isEditing: boolean;
  saving: boolean;
  saved: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  viewContent: React.ReactNode;
  editContent: React.ReactNode;
}) {
  return (
    <div style={{ ...cardStyle, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          {title}
        </h3>
        {!isEditing && (
          <button onClick={onEdit} style={editBtnStyle}>
            {saved ? '✓ Guardado' : 'Editar'}
          </button>
        )}
      </div>
      {isEditing ? (
        <>
          {editContent}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={onCancel} style={cancelBtnStyle}>Cancelar</button>
            <button onClick={onSave} disabled={saving} style={btnPrimaryStyle}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </>
      ) : (
        viewContent
      )}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={labelStyle}>{label}</p>
      {children}
    </div>
  );
}

function ViewItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={labelStyle}>{label}</p>
      <p style={{ fontSize: 14, color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px 20px 16px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
};

const viewGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4px 24px',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
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
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '9px 18px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnOutlineStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
};

const editBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  flexShrink: 0,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 16px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  cursor: 'pointer',
};

const removeBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'var(--bg-primary)',
  color: 'var(--text-muted)',
  fontSize: 16,
  lineHeight: 1,
  cursor: 'pointer',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
};

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'var(--accent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
  flexShrink: 0,
};

const rolBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 10,
  flexShrink: 0,
};
