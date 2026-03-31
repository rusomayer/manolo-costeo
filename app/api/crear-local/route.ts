import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const formData = await request.formData();
  const nombre = formData.get('nombre') as string;
  const direccion = formData.get('direccion') as string;
  const timezone = formData.get('timezone') as string || 'America/Buenos_Aires';

  const db = createServiceClient();
  const { data, error } = await db
    .from('locales')
    .insert([{ nombre, direccion, owner_id: user.id, timezone }])
    .select()
    .single();

  if (error) {
    return NextResponse.redirect(new URL('/crear-local?error=1', request.url));
  }

  const cookieStore = cookies();
  cookieStore.set('selected_local', data.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
