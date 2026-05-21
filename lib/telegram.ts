import { createTelegramClient } from "@rusomayer/integrations/telegram";

// Transporte Telegram: delega en @rusomayer/integrations/telegram (cliente
// compartido). enviarMensaje/obtenerArchivo son adapters finos que preservan
// la firma/contrato que esperan los call sites (incluido tirar en fallo, que
// el try/catch del route ya maneja). El formateo de gastos de abajo es de
// dominio y se queda acá.
const TELEGRAM_FILE_API = 'https://api.telegram.org/file/bot';
const tg = createTelegramClient();

export async function enviarMensaje(
  chatId: number,
  texto: string,
  replyToMessageId?: number,
  forceReply?: boolean
): Promise<{ result: { message_id: number } }> {
  const res = await tg.sendMessage(chatId, texto, {
    parseMode: 'HTML',
    replyToMessageId,
    replyMarkup: forceReply ? { force_reply: true, selective: true } : undefined,
  });
  if (!res.ok) throw new Error(`Telegram API error: ${res.error}`);
  return { result: { message_id: res.value.message_id } };
}

export async function obtenerArchivo(fileId: string): Promise<{ url: string; buffer: Buffer }> {
  const file = await tg.getFile(fileId);
  if (!file.ok || !file.value.file_path) {
    throw new Error('No se pudo obtener el archivo');
  }
  const downloaded = await tg.downloadFile(file.value.file_path);
  if (!downloaded.ok) {
    throw new Error(`No se pudo descargar el archivo: ${downloaded.error}`);
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileUrl = `${TELEGRAM_FILE_API}${token}/${file.value.file_path}`;
  return { url: fileUrl, buffer: Buffer.from(downloaded.value) };
}

export function formatearRespuesta(gasto: {
  descripcion: string;
  monto: number;
  categoria: string;
  proveedor?: string;
  confianza?: string;
  cantidad?: number;
  unidad?: string;
  fecha?: string;
}): string {
  const monto = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(gasto.monto);

  const categoriaEmoji: Record<string, string> = {
    insumos: '☕',
    servicios: '💡',
    sueldos: '👤',
    alquiler: '🏠',
    impuestos: '📋',
    mantenimiento: '🔧',
    otros: '📦',
  };

  const emoji = categoriaEmoji[gasto.categoria] || '📦';
  
  let respuesta = `✅ <b>Registrado</b>\n\n`;
  respuesta += `${emoji} ${gasto.descripcion}\n`;
  respuesta += `💰 ${monto}\n`;
  respuesta += `📁 ${gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}`;

  if (gasto.fecha) {
    const [y, m, d] = gasto.fecha.split('-').map(Number);
    const fechaStr = new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    respuesta += `\n📅 ${fechaStr}`;
  }
  
  if (gasto.cantidad && gasto.unidad) {
    respuesta += `\n📦 ${gasto.cantidad} ${gasto.unidad}`;
  }

  if (gasto.proveedor) {
    respuesta += `\n🏪 ${gasto.proveedor}`;
  }

  if (gasto.confianza === 'baja') {
    respuesta += `\n\n⚠️ <i>No estoy 100% seguro de estos datos. Revisalos en el dashboard.</i>`;
  }

  return respuesta;
}

export function formatearRespuestaMultiple(gastos: {
  descripcion: string;
  monto: number;
  categoria: string;
  proveedor?: string;
  cantidad?: number;
  unidad?: string;
}[], totalMonto: number): string {
  const categoriaEmoji: Record<string, string> = {
    insumos: '☕', servicios: '💡', sueldos: '👤', alquiler: '🏠',
    impuestos: '📋', mantenimiento: '🔧', otros: '📦',
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(n);

  let respuesta = `✅ <b>${gastos.length} items registrados</b>\n`;
  if (gastos[0]?.proveedor) {
    respuesta += `🏪 ${gastos[0].proveedor}\n`;
  }
  respuesta += `\n`;

  for (const g of gastos) {
    const emoji = categoriaEmoji[g.categoria] || '📦';
    const cant = g.cantidad && g.unidad ? ` (${g.cantidad} ${g.unidad})` : '';
    respuesta += `${emoji} ${g.descripcion}${cant} — ${fmt(g.monto)}\n`;
  }

  respuesta += `\n💰 <b>Total: ${fmt(totalMonto)}</b>`;
  return respuesta;
}

export function formatearError(mensaje: string): string {
  return `❌ <b>Error</b>\n\n${mensaje}\n\n<i>Probá de nuevo o escribí el gasto de otra forma.</i>`;
}
