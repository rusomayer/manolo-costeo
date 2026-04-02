import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const localId = req.nextUrl.searchParams.get('local_id');
  if (!localId) return NextResponse.json({ error: 'No local_id' }, { status: 400 });

  const db = createServiceClient();

  // Verify requesting user belongs to this local
  const { data: myMembership } = await db
    .from('local_members')
    .select('rol')
    .eq('local_id', localId)
    .eq('user_id', user.id)
    .single();

  if (!myMembership) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const { data: members } = await db
    .from('local_members')
    .select('id, user_id, rol, created_at')
    .eq('local_id', localId);

  if (!members?.length) return NextResponse.json({ members: [] });

  // Get emails from auth.admin
  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  for (const u of users) emailMap[u.id] = u.email ?? '';

  const result = members.map(m => ({
    id: m.id,
    user_id: m.user_id,
    rol: m.rol,
    email: emailMap[m.user_id] || 'Usuario',
    created_at: m.created_at,
    isMe: m.user_id === user.id,
  }));

  return NextResponse.json({ members: result, myRole: myMembership.rol });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { memberId, localId } = await req.json();
  if (!memberId || !localId) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });

  const db = createServiceClient();

  // Verify requesting user is owner
  const { data: myMembership } = await db
    .from('local_members')
    .select('rol')
    .eq('local_id', localId)
    .eq('user_id', user.id)
    .single();

  if (myMembership?.rol !== 'owner') {
    return NextResponse.json({ error: 'Solo el owner puede eliminar miembros' }, { status: 403 });
  }

  // Prevent deleting the owner
  const { data: target } = await db
    .from('local_members')
    .select('rol')
    .eq('id', memberId)
    .single();

  if (target?.rol === 'owner') {
    return NextResponse.json({ error: 'No podés eliminar al owner' }, { status: 400 });
  }

  await db.from('local_members').delete().eq('id', memberId);
  return NextResponse.json({ ok: true });
}
