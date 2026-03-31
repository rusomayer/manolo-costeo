'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function crearLocal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const nombre = formData.get('nombre') as string;
  const direccion = formData.get('direccion') as string;

  const { data, error } = await supabase
    .from('locales')
    .insert([{ nombre, direccion, owner_id: user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Set selected local cookie
  const cookieStore = await cookies();
  cookieStore.set('selected_local', data.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect('/dashboard');
}

export async function seleccionarLocal(localId: string) {
  const cookieStore = await cookies();
  cookieStore.set('selected_local', localId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect('/dashboard');
}

export async function crearInvitacion(localId: string, tipo: 'link' | 'email', email?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  // Find invitation
  const { data: invitation, error: findError } = await supabase
    .from('invitations')
    .select('*')
    .eq('codigo', codigo)
    .eq('estado', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (findError || !invitation) throw new Error('Invitacion invalida o expirada');

  // Add user as member
  const { error: memberError } = await supabase
    .from('local_members')
    .insert([{
      local_id: invitation.local_id,
      user_id: user.id,
      rol: 'miembro',
    }]);

  if (memberError && memberError.code !== '23505') {
    // 23505 = unique violation (already a member)
    throw new Error(memberError.message);
  }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ estado: 'accepted' })
    .eq('id', invitation.id);

  // Set selected local
  const cookieStore = await cookies();
  cookieStore.set('selected_local', invitation.local_id, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
