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

    const { data: recetas, error } = await supabase
      .from('recetas')
      .select('*, receta_ingredientes(count)')
      .eq('local_id', localId)
      .order('nombre', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ recetas: recetas || [] });
  } catch (error) {
    console.error('Error obteniendo recetas:', error);
    return NextResponse.json({ error: 'Error obteniendo recetas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const { data: member } = await supabase
      .from('local_members')
      .select('id')
      .eq('local_id', localId)
      .eq('user_id', user.id)
      .single();
    if (!member) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const body = await request.json();
    const { ingredientes, ...recetaData } = body;

    const { data: receta, error } = await supabase
      .from('recetas')
      .insert([{
        nombre: recetaData.nombre,
        descripcion: recetaData.descripcion || null,
        categoria: recetaData.categoria || null,
        porciones: recetaData.porciones || 1,
        precio_venta: recetaData.precio_venta || null,
        local_id: localId,
      }])
      .select()
      .single();

    if (error) throw error;

    // Insertar ingredientes si se envían
    if (ingredientes?.length > 0) {
      const { error: ingError } = await supabase
        .from('receta_ingredientes')
        .insert(ingredientes.map((ing: any) => ({
          receta_id: receta.id,
          producto: ing.producto,
          cantidad: ing.cantidad,
          unidad: ing.unidad,
          costo_override: ing.costo_override || null,
        })));
      if (ingError) console.error('Error guardando ingredientes:', ingError);
    }

    return NextResponse.json({ receta }, { status: 201 });
  } catch (error) {
    console.error('Error creando receta:', error);
    return NextResponse.json({ error: 'Error creando receta' }, { status: 500 });
  }
}
