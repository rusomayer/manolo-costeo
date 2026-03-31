import { createClient } from '@supabase/supabase-js';
import { Gasto, GastoInput, ClaudeGastoResponse } from './types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function guardarGasto(gasto: GastoInput & { telegram_message_id?: string }): Promise<Gasto> {
  const { data, error } = await supabase
    .from('gastos')
    .insert([{
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      categoria: gasto.categoria,
      proveedor: gasto.proveedor || null,
      metodo_pago: gasto.metodo_pago || 'efectivo',
      notas: gasto.notas || null,
      fecha: gasto.fecha || new Date().toISOString().split('T')[0],
      cantidad: gasto.cantidad || null,
      unidad: gasto.unidad || null,
      telegram_message_id: gasto.telegram_message_id || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error guardando gasto:', error);
    throw error;
  }

  return data;
}

export async function obtenerGastos(filtros?: {
  desde?: string;
  hasta?: string;
  categoria?: string;
}): Promise<Gasto[]> {
  let query = supabase
    .from('gastos')
    .select('*')
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

export async function obtenerResumen(mes?: string): Promise<{
  total: number;
  porCategoria: Record<string, number>;
  cantidad: number;
}> {
  const ahora = new Date();
  const mesActual = mes || `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  
  const desde = `${mesActual}-01`;
  const hasta = `${mesActual}-31`;

  const gastos = await obtenerGastos({ desde, hasta });

  const porCategoria: Record<string, number> = {};
  let total = 0;

  for (const gasto of gastos) {
    total += Number(gasto.monto);
    porCategoria[gasto.categoria] = (porCategoria[gasto.categoria] || 0) + Number(gasto.monto);
  }

  return {
    total,
    porCategoria,
    cantidad: gastos.length,
  };
}

// --- Gastos pendientes (follow-up questions) ---

export async function guardarGastoPendiente(params: {
  chatId: number;
  botMessageId: number;
  gastoData: ClaudeGastoResponse;
  pregunta: string;
  campoEsperado: string;
}) {
  const { error } = await supabase.from('gastos_pendientes').insert([{
    chat_id: params.chatId,
    bot_message_id: params.botMessageId,
    gasto_data: params.gastoData,
    pregunta: params.pregunta,
    campo_esperado: params.campoEsperado,
  }]);

  if (error) {
    console.error('Error guardando gasto pendiente:', error);
    throw error;
  }
}

export async function buscarGastoPendiente(chatId: number, botMessageId: number) {
  const { data, error } = await supabase
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
  } | null;
}

export async function eliminarGastoPendiente(id: string) {
  await supabase.from('gastos_pendientes').delete().eq('id', id);
}

export async function limpiarPendientesExpirados() {
  await supabase
    .from('gastos_pendientes')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
