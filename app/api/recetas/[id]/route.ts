import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const { data: receta, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', params.id)
      .eq('local_id', localId)
      .single();

    if (error) throw error;

    const { data: ingredientes } = await supabase
      .from('receta_ingredientes')
      .select('*')
      .eq('receta_id', params.id);

    return NextResponse.json({ receta, ingredientes: ingredientes || [] });
  } catch (error) {
    console.error('Error obteniendo receta:', error);
    return NextResponse.json({ error: 'Error obteniendo receta' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const body = await request.json();
    const { ingredientes, ...recetaData } = body;

    const { data: receta, error } = await supabase
      .from('recetas')
      .update({
        nombre: recetaData.nombre,
        descripcion: recetaData.descripcion || null,
        categoria: recetaData.categoria || null,
        porciones: recetaData.porciones || 1,
        precio_venta: recetaData.precio_venta || null,
      })
      .eq('id', params.id)
      .eq('local_id', localId)
      .select()
      .single();

    if (error) throw error;

    // Reemplazar ingredientes
    if (ingredientes) {
      await supabase.from('receta_ingredientes').delete().eq('receta_id', params.id);

      if (ingredientes.length > 0) {
        await supabase.from('receta_ingredientes').insert(
          ingredientes.map((ing: any) => ({
            receta_id: params.id,
            producto: ing.producto,
            cantidad: ing.cantidad,
            unidad: ing.unidad,
            costo_override: ing.costo_override || null,
          }))
        );
      }
    }

    return NextResponse.json({ receta });
  } catch (error) {
    console.error('Error actualizando receta:', error);
    return NextResponse.json({ error: 'Error actualizando receta' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const { error } = await supabase
      .from('recetas')
      .delete()
      .eq('id', params.id)
      .eq('local_id', localId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando receta:', error);
    return NextResponse.json({ error: 'Error eliminando receta' }, { status: 500 });
  }
}
