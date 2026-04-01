import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { actualizarProveedor, eliminarProveedor } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const proveedor = await actualizarProveedor(supabase, params.id, localId, body);

    return NextResponse.json({ proveedor });
  } catch (error) {
    console.error('Error actualizando proveedor:', error);
    return NextResponse.json({ error: 'Error actualizando proveedor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await eliminarProveedor(supabase, params.id, localId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando proveedor:', error);
    return NextResponse.json({ error: 'Error eliminando proveedor' }, { status: 500 });
  }
}
