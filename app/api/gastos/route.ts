import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { obtenerGastos, obtenerResumen } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const categoria = searchParams.get('categoria');
    const localId = searchParams.get('localId') || request.cookies.get('selected_local')?.value;

    if (!localId) {
      return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });
    }

    // Calculate month dates
    let desde: string | undefined;
    let hasta: string | undefined;

    if (mes) {
      desde = `${mes}-01`;
      const [year, month] = mes.split('-').map(Number);
      const ultimoDia = new Date(year, month, 0).getDate();
      hasta = `${mes}-${ultimoDia}`;
    }

    const [gastos, resumen] = await Promise.all([
      obtenerGastos(supabase, localId, {
        desde,
        hasta,
        categoria: categoria || undefined,
      }),
      obtenerResumen(supabase, localId, mes || undefined),
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
