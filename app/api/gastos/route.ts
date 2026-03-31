import { NextRequest, NextResponse } from 'next/server';
import { obtenerGastos, obtenerResumen } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const categoria = searchParams.get('categoria');

    // Calcular fechas del mes
    let desde: string | undefined;
    let hasta: string | undefined;

    if (mes) {
      desde = `${mes}-01`;
      // Último día del mes
      const [year, month] = mes.split('-').map(Number);
      const ultimoDia = new Date(year, month, 0).getDate();
      hasta = `${mes}-${ultimoDia}`;
    }

    const [gastos, resumen] = await Promise.all([
      obtenerGastos({ 
        desde, 
        hasta, 
        categoria: categoria || undefined 
      }),
      obtenerResumen(mes || undefined),
    ]);

    return NextResponse.json({
      gastos,
      resumen,
    });
  } catch (error) {
    console.error('Error obteniendo gastos:', error);
    return NextResponse.json(
      { error: 'Error obteniendo gastos' },
      { status: 500 }
    );
  }
}
