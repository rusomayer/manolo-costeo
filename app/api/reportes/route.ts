import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'evolucion';

    // Obtener todos los gastos del último año
    const unAnioAtras = new Date();
    unAnioAtras.setFullYear(unAnioAtras.getFullYear() - 1);

    const { data: gastos, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('local_id', localId)
      .gte('fecha', unAnioAtras.toLocaleDateString('en-CA'))
      .order('fecha', { ascending: true });

    if (error) throw error;

    switch (tipo) {
      case 'evolucion': {
        // Agrupar por mes
        const porMes: Record<string, { total: number; fijo: number; variable: number; cantidad: number }> = {};
        for (const g of gastos || []) {
          const mes = g.fecha.substring(0, 7); // YYYY-MM
          if (!porMes[mes]) porMes[mes] = { total: 0, fijo: 0, variable: 0, cantidad: 0 };
          porMes[mes].total += Number(g.monto);
          porMes[mes].cantidad += 1;
          const tipo = g.tipo_gasto || 'variable';
          porMes[mes][tipo as 'fijo' | 'variable'] += Number(g.monto);
        }
        return NextResponse.json({ evolucion: porMes });
      }

      case 'categorias': {
        // Agrupar por categoría por mes
        const catPorMes: Record<string, Record<string, number>> = {};
        for (const g of gastos || []) {
          const mes = g.fecha.substring(0, 7);
          if (!catPorMes[mes]) catPorMes[mes] = {};
          catPorMes[mes][g.categoria] = (catPorMes[mes][g.categoria] || 0) + Number(g.monto);
        }
        return NextResponse.json({ categorias: catPorMes });
      }

      case 'proveedores': {
        // Top proveedores por monto
        const topProveedores: Record<string, { total: number; cantidad: number }> = {};
        for (const g of gastos || []) {
          const prov = g.proveedor || 'Sin proveedor';
          if (!topProveedores[prov]) topProveedores[prov] = { total: 0, cantidad: 0 };
          topProveedores[prov].total += Number(g.monto);
          topProveedores[prov].cantidad += 1;
        }
        const sorted = Object.entries(topProveedores)
          .map(([nombre, data]) => ({ nombre, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 15);
        return NextResponse.json({ proveedores: sorted });
      }

      case 'precios': {
        const producto = searchParams.get('producto');
        if (!producto) {
          // Devolver lista de productos con precios registrados
          const { data: productos } = await supabase
            .from('precios_productos')
            .select('producto')
            .eq('local_id', localId);
          const unicos = Array.from(new Set((productos || []).map(p => p.producto)));
          return NextResponse.json({ productos: unicos });
        }

        // Evolución de precio de un producto
        const { data: precios } = await supabase
          .from('precios_productos')
          .select('*')
          .eq('local_id', localId)
          .ilike('producto', `%${producto}%`)
          .order('fecha', { ascending: true });

        return NextResponse.json({ precios: precios || [] });
      }

      default:
        return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generando reporte:', error);
    return NextResponse.json({ error: 'Error generando reporte' }, { status: 500 });
  }
}
