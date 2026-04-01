import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { obtenerProveedores, guardarProveedor } from '@/lib/supabase';

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

    const proveedores = await obtenerProveedores(supabase, localId);
    return NextResponse.json({ proveedores });
  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    return NextResponse.json({ error: 'Error obteniendo proveedores' }, { status: 500 });
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
    const proveedor = await guardarProveedor(supabase, body, localId);

    return NextResponse.json({ proveedor }, { status: 201 });
  } catch (error) {
    console.error('Error creando proveedor:', error);
    return NextResponse.json({ error: 'Error creando proveedor' }, { status: 500 });
  }
}
