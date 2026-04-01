import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { obtenerGastos, obtenerResumen, guardarGasto } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const localId = searchParams.get('localId') || request.cookies.get('selected_local')?.value;

    if (!localId) {
      return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });
    }

    // Accept desde/hasta directly, or fall back to mes param
    let desde = searchParams.get('desde') || undefined;
    let hasta = searchParams.get('hasta') || undefined;
    const mes = searchParams.get('mes');

    if (!desde && !hasta && mes) {
      desde = `${mes}-01`;
      const [year, month] = mes.split('-').map(Number);
      const ultimoDia = new Date(year, month, 0).getDate();
      hasta = `${mes}-${ultimoDia}`;
    }

    const filtros = {
      desde,
      hasta,
      categoria: categoria || undefined,
    };

    const [gastos, resumen] = await Promise.all([
      obtenerGastos(supabase, localId, filtros),
      obtenerResumen(supabase, localId, filtros),
    ]);

    return NextResponse.json({ gastos, resumen });
  } catch (error) {
    console.error('Error obteniendo gastos:', error);
    return NextResponse.json(
      { error: 'Error obteniendo gastos' },
      { status: 500 }
    );
  }
}

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

    // Verify user is member of this local
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

    // Get local timezone
    const { data: local } = await supabase
      .from('locales')
      .select('timezone')
      .eq('id', localId)
      .single();

    const gasto = await guardarGasto(supabase, body, localId, local?.timezone);

    return NextResponse.json({ gasto }, { status: 201 });
  } catch (error) {
    console.error('Error creando gasto:', error);
    return NextResponse.json(
      { error: 'Error creando gasto' },
      { status: 500 }
    );
  }
}
