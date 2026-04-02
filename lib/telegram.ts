const TELEGRAM_API = 'https://api.telegram.org/bot';

export async function enviarMensaje(
  chatId: number,
  texto: string,
  replyToMessageId?: number,
  forceReply?: boolean
): Promise<{ result: { message_id: number } }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: texto,
    parse_mode: 'HTML',
    reply_to_message_id: replyToMessageId,
  };

  if (forceReply) {
    body.reply_markup = { force_reply: true, selective: true };
  }

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error enviando mensaje:', error);
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

export async function obtenerArchivo(fileId: string): Promise<{ url: string; buffer: Buffer }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  // Obtener file_path
  const fileResponse = await fetch(`${TELEGRAM_API}${token}/getFile?file_id=${fileId}`);
  const fileData = await fileResponse.json();
  
  if (!fileData.ok) {
    throw new Error('No se pudo obtener el archivo');
  }

  const filePath = fileData.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  // Descargar el archivo
  const downloadResponse = await fetch(fileUrl);
  const arrayBuffer = await downloadResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { url: fileUrl, buffer };
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
