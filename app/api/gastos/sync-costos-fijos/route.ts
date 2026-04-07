import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface CostoFijoMapping {
  campo: string;
  descripcion: string;
  categoria: string;
  marcador: string;
}

const COSTOS_FIJOS: CostoFijoMapping[] = [
  { campo: 'alquiler_mensual', descripcion: 'Alquiler', categoria: 'alquiler', marcador: '[auto:alquiler]' },
  { campo: 'costo_luz', descripcion: 'Luz / electricidad', categoria: 'servicios', marcador: '[auto:luz]' },
  { campo: 'costo_gas', descripcion: 'Gas', categoria: 'servicios', marcador: '[auto:gas]' },
  { campo: 'costo_agua', descripcion: 'Agua', categoria: 'servicios', marcador: '[auto:agua]' },
  { campo: 'costo_internet', descripcion: 'Internet / telefonía', categoria: 'servicios', marcador: '[auto:internet]' },
  { campo: 'costo_seguro', descripcion: 'Seguro', categoria: 'servicios', marcador: '[auto:seguro]' },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) {
      return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });
    }

    // Verify membership
    const { data: member } = await supabase
      .from('local_members')
      .select('id')
      .eq('local_id', localId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const tipo: 'costos' | 'sueldos' = body.tipo;

    // Get local data
    const { data: local } = await supabase
      .from('locales')
      .select('*, timezone')
      .eq('id', localId)
      .single();

    if (!local) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    const tz = local.timezone || 'America/Buenos_Aires';
    const now = new Date();
    const fechaLocal = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const year = fechaLocal.getFullYear();
    const month = fechaLocal.getMonth();
    const primerDia = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const ultimoDia = new Date(year, month + 1, 0).getDate();
    const ultimaFecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    if (tipo === 'costos') {
      await syncCostosFijos(supabase, localId, local, primerDia, ultimaFecha);
    } else if (tipo === 'sueldos') {
      await syncSueldos(supabase, localId, local, primerDia, ultimaFecha);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error sincronizando costos fijos:', error);
    return NextResponse.json({ error: 'Error sincronizando costos' }, { status: 500 });
  }
}

async function syncCostosFijos(
  supabase: any,
  localId: string,
  local: any,
  primerDia: string,
  ultimaFecha: string
) {
  // Get existing auto-generated gastos for this month
  const { data: existentes } = await supabase
    .from('gastos')
    .select('id, notas, monto')
    .eq('local_id', localId)
    .gte('fecha', primerDia)
    .lte('fecha', ultimaFecha)
    .like('notas', '[auto:%');

  const existentesPorMarcador = new Map<string, { id: string; monto: number }>();
  for (const g of existentes || []) {
    const notas = g.notas || '';
    for (const cf of COSTOS_FIJOS) {
      if (notas.includes(cf.marcador)) {
        existentesPorMarcador.set(cf.marcador, { id: g.id, monto: Number(g.monto) });
      }
    }
  }

  for (const cf of COSTOS_FIJOS) {
    const monto = Number(local[cf.campo]) || 0;
    const existente = existentesPorMarcador.get(cf.marcador);

    if (existente && monto > 0 && existente.monto !== monto) {
      // Update
      await supabase
        .from('gastos')
        .update({ monto, descripcion: cf.descripcion })
        .eq('id', existente.id);
    } else if (existente && monto === 0) {
      // Delete
      await supabase.from('gastos').delete().eq('id', existente.id);
    } else if (!existente && monto > 0) {
      // Create
      await supabase.from('gastos').insert([{
        descripcion: cf.descripcion,
        monto,
        categoria: cf.categoria,
        tipo_gasto: 'fijo',
        fecha: primerDia,
        metodo_pago: 'transferencia',
        notas: cf.marcador,
        local_id: localId,
      }]);
    }
  }
}

async function syncSueldos(
  supabase: any,
  localId: string,
  local: any,
  primerDia: string,
  ultimaFecha: string
) {
  const empleados: any[] = local.empleados || [];

  // Get existing auto-generated sueldos for this month
  const { data: existentes } = await supabase
    .from('gastos')
    .select('id, notas, monto, descripcion')
    .eq('local_id', localId)
    .gte('fecha', primerDia)
    .lte('fecha', ultimaFecha)
    .like('notas', '[auto:sueldo:%');

  const existentesPorId = new Map<string, { id: string; monto: number; descripcion: string }>();
  for (const g of existentes || []) {
    const match = (g.notas || '').match(/\[auto:sueldo:(.+?)\]/);
    if (match) {
      existentesPorId.set(match[1], { id: g.id, monto: Number(g.monto), descripcion: g.descripcion });
    }
  }

  const empleadoIds = new Set<string>();

  for (const emp of empleados) {
    if (!emp.id || !emp.sueldo_neto || emp.sueldo_neto <= 0) continue;
    empleadoIds.add(emp.id);

    const marcador = `[auto:sueldo:${emp.id}]`;
    const descripcion = `Sueldo - ${emp.nombre}${emp.rol ? ` (${emp.rol})` : ''}`;
    const monto = emp.sueldo_neto;
    const existente = existentesPorId.get(emp.id);

    if (existente && (existente.monto !== monto || existente.descripcion !== descripcion)) {
      await supabase
        .from('gastos')
        .update({ monto, descripcion })
        .eq('id', existente.id);
    } else if (!existente) {
      await supabase.from('gastos').insert([{
        descripcion,
        monto,
        categoria: 'sueldos',
        tipo_gasto: 'fijo',
        fecha: primerDia,
        metodo_pago: 'transferencia',
        notas: marcador,
        local_id: localId,
      }]);
    }
  }

  // Delete gastos for employees that no longer exist or no longer have salary
  for (const [empId, existente] of existentesPorId) {
    if (!empleadoIds.has(empId)) {
      await supabase.from('gastos').delete().eq('id', existente.id);
    }
  }
}
