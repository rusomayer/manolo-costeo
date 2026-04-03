'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function generarCodigo(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export async function crearLocal(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const nombre = formData.get('nombre') as string;
  const direccion = formData.get('direccion') as string;
  const timezone = formData.get('timezone') as string || 'America/Buenos_Aires';

  // Use service client to bypass RLS (user is validated above)
  const db = createServiceClient();
  const { data, error } = await db
    .from('locales')
    .insert([{
      nombre,
      direccion,
      owner_id: user.id,
      timezone,
      telegram_code: generarCodigo('tg'),
      twilio_code: generarCodigo('tw'),
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Add creator as owner member
  await db
    .from('local_members')
    .insert([{ local_id: data.id, user_id: user.id, rol: 'owner' }]);

  // Set selected local cookie
  const cookieStore = cookies();
  cookieStore.set('selected_local', data.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect('/dashboard');
}

export async function seleccionarLocal(localId: string) {
  const cookieStore = cookies();
  cookieStore.set('selected_local', localId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect('/dashboard');
}

export async function crearInvitacion(localId: string, tipo: 'link' | 'email', email?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const db = createServiceClient();
  const { data, error } = await db
    .from('invitations')
    .insert([{
      local_id: localId,
      tipo,
      email: email || null,
      created_by: user.id,
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data.codigo;
}

export async function aceptarInvitacion(codigo: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const db = createServiceClient();

  // Find invitation
  const { data: invitation, error: findError } = await db
    .from('invitations')
    .select('*')
    .eq('codigo', codigo)
    .eq('estado', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (findError || !invitation) throw new Error('Invitacion invalida o expirada');

  // Add user as member
  const { error: memberError } = await db
    .from('local_members')
    .insert([{
      local_id: invitation.local_id,
      user_id: user.id,
      rol: 'miembro',
    }]);

  if (memberError && memberError.code !== '23505') {
    throw new Error(memberError.message);
  }

  // Mark invitation as accepted
  await db
    .from('invitations')
    .update({ estado: 'accepted' })
    .eq('id', invitation.id);

  // Set selected local
  const cookieStore = cookies();
  cookieStore.set('selected_local', invitation.local_id, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
