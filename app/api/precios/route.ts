import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { obtenerPrecios, guardarPrecio } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const producto = searchParams.get('producto') || undefined;
    const proveedor_id = searchParams.get('proveedor_id') || undefined;

    const precios = await obtenerPrecios(supabase, localId, { producto, proveedor_id });
    return NextResponse.json({ precios });
  } catch (error) {
    console.error('Error obteniendo precios:', error);
    return NextResponse.json({ error: 'Error obteniendo precios' }, { status: 500 });
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

    const body = await request.json();
    const precio = await guardarPrecio(supabase, body, localId);

    return NextResponse.json({ precio }, { status: 201 });
  } catch (error) {
    console.error('Error guardando precio:', error);
    return NextResponse.json({ error: 'Error guardando precio' }, { status: 500 });
  }
}
