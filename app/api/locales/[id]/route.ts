import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const localId = params.id;
  const db = createServiceClient();

  // Verify user is owner of this local
  const { data: member } = await db
    .from('local_members')
    .select('rol')
    .eq('local_id', localId)
    .eq('user_id', user.id)
    .single();

  if (!member || member.rol !== 'owner') {
    return NextResponse.json({ error: 'Solo el dueño puede eliminar el local' }, { status: 403 });
  }

  // Delete related data (cascades should handle most, but be explicit)
  await db.from('gastos_pendientes').delete().eq('local_id', localId);
  await db.from('invitations').delete().eq('local_id', localId);
  await db.from('local_members').delete().eq('local_id', localId);

  // Delete the local itself (CASCADE should delete gastos, recetas, proveedores, precios)
  const { error } = await db
    .from('locales')
    .delete()
    .eq('id', localId);

  if (error) {
    console.error('Error eliminando local:', error);
    return NextResponse.json({ error: 'Error al eliminar el local' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
