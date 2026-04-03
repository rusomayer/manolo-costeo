import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { actualizarGasto, eliminarGasto } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verificarAcceso(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const localId = request.cookies.get('selected_local')?.value;
  if (!localId) {
    return { error: NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 }) };
  }

  const { data: member } = await supabase
    .from('local_members')
    .select('id')
    .eq('local_id', localId)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }

  return { supabase, localId };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const acceso = await verificarAcceso(request);
    if ('error' in acceso && acceso.error) return acceso.error;
    const { supabase, localId } = acceso as { supabase: any; localId: string };

    const body = await request.json();
    const gasto = await actualizarGasto(supabase, params.id, localId, body);

    return NextResponse.json({ gasto });
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    return NextResponse.json(
      { error: 'Error actualizando gasto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const acceso = await verificarAcceso(request);
    if ('error' in acceso && acceso.error) return acceso.error;
    const { localId } = acceso as { supabase: any; localId: string };

    // Use service client to bypass RLS for delete
    const db = createServiceClient();
    await eliminarGasto(db, params.id, localId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    return NextResponse.json(
      { error: 'Error eliminando gasto' },
      { status: 500 }
    );
  }
}
