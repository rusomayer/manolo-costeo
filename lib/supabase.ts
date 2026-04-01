import { SupabaseClient } from '@supabase/supabase-js';
import { Gasto, GastoInput, ClaudeGastoResponse, TipoGasto } from './types';

function fechaLocal(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

export async function guardarGasto(
  client: SupabaseClient,
  gasto: GastoInput & { telegram_message_id?: string },
  localId: string,
  timezone?: string
): Promise<Gasto> {
  const { data, error } = await client
    .from('gastos')
    .insert([{
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      categoria: gasto.categoria,
      proveedor: gasto.proveedor || null,
      metodo_pago: gasto.metodo_pago || 'efectivo',
      notas: gasto.notas || null,
      fecha: gasto.fecha || fechaLocal(timezone || 'America/Buenos_Aires'),
      cantidad: gasto.cantidad || null,
      unidad: gasto.unidad || null,
      telegram_message_id: gasto.telegram_message_id || null,
      tipo_gasto: gasto.tipo_gasto || 'variable',
      local_id: localId,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error guardando gasto:', error);
    throw error;
  }

  return data;
}

export async function obtenerGastos(
  client: SupabaseClient,
  localId: string,
  filtros?: {
    desde?: string;
    hasta?: string;
    categoria?: string;
  }
): Promise<Gasto[]> {
  let query = client
    .from('gastos')
    .select('*')
    .eq('local_id', localId)
    .order('fecha', { ascending: false });

  if (filtros?.desde) {
    query = query.gte('fecha', filtros.desde);
  }
  if (filtros?.hasta) {
    query = query.lte('fecha', filtros.hasta);
  }
  if (filtros?.categoria) {
    query = query.eq('categoria', filtros.categoria);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error obteniendo gastos:', error);
    throw error;
  }

  return data || [];
}

export async function obtenerResumen(
  client: SupabaseClient,
  localId: string,
  filtros?: { desde?: string; hasta?: string; categoria?: string }
): Promise<{
  total: number;
  porCategoria: Record<string, number>;
  porTipo: Record<string, number>;
  cantidad: number;
}> {
  const gastos = await obtenerGastos(client, localId, filtros);

  const porCategoria: Record<string, number> = {};
  const porTipo: Record<string, number> = { fijo: 0, variable: 0 };
  let total = 0;

  for (const gasto of gastos) {
    total += Number(gasto.monto);
    porCategoria[gasto.categoria] = (porCategoria[gasto.categoria] || 0) + Number(gasto.monto);
    const tipo = gasto.tipo_gasto || 'variable';
    porTipo[tipo] = (porTipo[tipo] || 0) + Number(gasto.monto);
  }

  return {
    total,
    porCategoria,
    porTipo,
    cantidad: gastos.length,
  };
}

export async function actualizarGasto(
  client: SupabaseClient,
  gastoId: string,
  localId: string,
  updates: Partial<GastoInput & { tipo_gasto?: TipoGasto }>
): Promise<Gasto> {
  const { data, error } = await client
    .from('gastos')
    .update(updates)
    .eq('id', gastoId)
    .eq('local_id', localId)
    .select()
    .single();

  if (error) {
    console.error('Error actualizando gasto:', error);
    throw error;
  }

  return data;
}

export async function eliminarGasto(
  client: SupabaseClient,
  gastoId: string,
  localId: string
): Promise<void> {
  const { error } = await client
    .from('gastos')
    .delete()
    .eq('id', gastoId)
    .eq('local_id', localId);

  if (error) {
    console.error('Error eliminando gasto:', error);
    throw error;
  }
}

// --- Gastos pendientes (follow-up questions) ---

export async function guardarGastoPendiente(
  client: SupabaseClient,
  params: {
    chatId: number;
    botMessageId: number;
    gastoData: ClaudeGastoResponse;
    pregunta: string;
    campoEsperado: string;
    localId: string;
  }
) {
  const { error } = await client.from('gastos_pendientes').insert([{
    chat_id: params.chatId,
    bot_message_id: params.botMessageId,
    gasto_data: params.gastoData,
    pregunta: params.pregunta,
    campo_esperado: params.campoEsperado,
    local_id: params.localId,
  }]);

  if (error) {
    console.error('Error guardando gasto pendiente:', error);
    throw error;
  }
}

export async function buscarGastoPendiente(client: SupabaseClient, chatId: number, botMessageId: number) {
  const { data, error } = await client
    .from('gastos_pendientes')
    .select('*')
    .eq('chat_id', chatId)
    .eq('bot_message_id', botMessageId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error buscando gasto pendiente:', error);
  }

  return data as {
    id: string;
    gasto_data: ClaudeGastoResponse;
    campo_esperado: string;
    local_id: string;
  } | null;
}

export async function buscarUltimoPendiente(client: SupabaseClient, chatId: number) {
  const { data, error } = await client
    .from('gastos_pendientes')
    .select('*')
    .eq('chat_id', chatId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error buscando ultimo pendiente:', error);
  }

  return data as {
    id: string;
    gasto_data: ClaudeGastoResponse;
    campo_esperado: string;
    local_id: string;
  } | null;
}

export async function eliminarGastoPendiente(client: SupabaseClient, id: string) {
  await client.from('gastos_pendientes').delete().eq('id', id);
}

export async function limpiarPendientesExpirados(client: SupabaseClient) {
  await client
    .from('gastos_pendientes')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
