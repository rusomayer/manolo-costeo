import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const nombre = body.nombre as string;
  const direccion = body.direccion as string;
  const timezone = body.timezone || 'America/Buenos_Aires';

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from('locales')
    .insert([{ nombre, direccion, owner_id: user.id, timezone }])
    .select()
    .single();

  if (error) {
    console.error('Error creando local:', error);
    return NextResponse.json({ error: 'Error al crear el local' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, id: data.id });
  response.cookies.set('selected_local', data.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  return response;
}
