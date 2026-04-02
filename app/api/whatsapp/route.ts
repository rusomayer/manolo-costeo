import { NextRequest, NextResponse } from 'next/server';
import {
  WhatsAppMessage,
  WhatsAppWebhookPayload,
  parseWhatsAppMessage,
  enviarMensajeWA,
  obtenerArchivoWA,
} from '@/lib/whatsapp';
import { enviarMensaje } from '@/lib/telegram'; // Reutilizamos la función de formateo
import {
  procesarTexto,
  procesarImagen,
  procesarPDF,
  procesarAudio,
  transcribirAudio,
  clasificarIntencion,
  procesarRespuestaFollowUp,
} from '@/lib/claude';
import { consultaManolo } from '@/lib/asistente';
import {
  guardarGasto,
  guardarGastoPendiente,
  buscarGastoPendiente,
  buscarUltimoPendiente,
  eliminarGastoPendiente,
  limpiarPendientesExpirados,
  autoRegistrarPrecio,
} from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase/service';

type DB = ReturnType<typeof createServiceClient>;

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!;

export async function GET(request: NextRequest) {
  // Webhook verification from Meta
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json(challenge);
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const db = createServiceClient();

  try {
    const payload: WhatsAppWebhookPayload = await request.json();

    // Parse message
    const message = parseWhatsAppMessage(payload);
    if (!message) {
      return NextResponse.json({ ok: true }); // Ignore non-message events
    }

    const phoneNumber = message.from; // +5491123456789
    const messageId = message.id;
    const messageTimestamp = message.timestamp;

    await limpiarPendientesExpirados(db);

    // Check for follow-up (reply to bot message)
    // Note: WhatsApp doesn't have native reply_to_message like Telegram,
    // so we use the same heuristic: check if there's a recent pending message
    let pendiente = null;
    if (message.text && message.text.body.length < 50) {
      const ultimo = await buscarUltimoPendienteWA(db, phoneNumber);
      if (ultimo) pendiente = ultimo;
    }

    if (pendiente) {
      try {
        let textoRespuesta = message.text?.body;
        if (!textoRespuesta && message.audio) {
          const { buffer } = await obtenerArchivoWA(ACCESS_TOKEN, message.audio.id);
          textoRespuesta = await transcribirAudio(buffer);
        }

        if (textoRespuesta) {
          const info = await obtenerLocalInfoWA(db, phoneNumber);
          const merged = await procesarRespuestaFollowUp(
            pendiente.gasto_data,
            textoRespuesta,
            pendiente.campo_esperado,
            info?.timezone
          );
          const gastoGuardado = await guardarGasto(
            db,
            { ...merged, telegram_message_id: messageId },
            pendiente.local_id,
            info?.timezone
          );
          await autoRegistrarPrecio(
            db,
            { ...merged, fecha: gastoGuardado.fecha, categoria: merged.categoria },
            pendiente.local_id
          );
          await eliminarGastoPendiente(db, pendiente.id);
          await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, formatearRespuesta(merged));
          return NextResponse.json({ ok: true });
        }
      } catch (error) {
        console.error('Error procesando follow-up:', error);
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, `❌ Error: ${errorMsg}`);
        return NextResponse.json({ ok: true });
      }
    }

    try {
      if (message.image) {
        await procesarFotoWA(db, message, phoneNumber);
      } else if (message.document) {
        await procesarDocumentoWA(db, message, phoneNumber);
      } else if (message.audio) {
        await procesarVozWA(db, message, phoneNumber);
      } else if (message.text) {
        await procesarMensajeTextoWA(db, message, phoneNumber);
      } else {
        await enviarMensajeWA(
          PHONE_NUMBER_ID,
          ACCESS_TOKEN,
          phoneNumber,
          '🤔 No entendí ese tipo de mensaje. Podés mandarme:\n\n- Texto con el gasto\n- Foto de una factura\n- PDF de una factura\n- Audio describiendo el gasto'
        );
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, `❌ Error: ${errorMsg}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

async function obtenerLocalInfoWA(
  db: DB,
  phoneNumber: string
): Promise<{ localId: string; timezone: string } | null> {
  const { data } = await db
    .from('whatsapp_links')
    .select('local_id, locales(timezone)')
    .eq('phone_number', phoneNumber)
    .single();

  if (!data) return null;
  return {
    localId: data.local_id,
    timezone: (data as any).locales?.timezone || 'America/Buenos_Aires',
  };
}

async function buscarUltimoPendienteWA(db: DB, phoneNumber: string) {
  const { data } = await db
    .from('gastos_pendientes')
    .select('*')
    .eq('wa_phone_number', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function procesarMensajeTextoWA(db: DB, message: WhatsAppMessage, phoneNumber: string) {
  const texto = message.text!.body;

  const info = await obtenerLocalInfoWA(db, phoneNumber);
  if (!info) {
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      '⚠️ Este número no está vinculado a ningún local.\n\nUsa el link de vinculación desde el dashboard.'
    );
    return;
  }

  // Classify intent
  const intencion = await clasificarIntencion(texto);

  if (intencion === 'consulta') {
    await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '🤔 Consultando...');
    const respuesta = await consultaManolo(db, info.localId, texto);
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      `🤖 <b>Manolo dice:</b>\n\n${respuesta}`
    );
    return;
  }

  // Process as expense
  const resultado = await procesarTexto(texto, info.timezone);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      '🤔 No estoy seguro de entender el gasto.\n\nProbá con algo como:\n- "Cafe 5kg $45.000"\n- "Pagué la luz $28.500"\n- "Sueldo Juan $150.000"'
    );
    return;
  }

  if (await preguntarSiFaltaWA(db, resultado, phoneNumber, info.localId)) return;

  const gastoGuardado = await guardarGasto(
    db,
    { ...resultado, telegram_message_id: message.id },
    info.localId,
    info.timezone
  );
  await autoRegistrarPrecio(
    db,
    { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria },
    info.localId
  );
  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, formatearRespuesta(resultado));
}

async function procesarFotoWA(db: DB, message: WhatsAppMessage, phoneNumber: string) {
  const info = await obtenerLocalInfoWA(db, phoneNumber);
  if (!info) {
    await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '📸 Analizando la imagen...');

  const { buffer, mimeType } = await obtenerArchivoWA(ACCESS_TOKEN, message.image!.id);
  const resultados = await procesarImagen(
    buffer,
    mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    undefined,
    info.timezone
  );

  const validResults = resultados.filter(r => r.monto > 0);

  if (validResults.length === 0) {
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      '🤔 No pude leer bien la factura. ¿Podés mandarla con mejor luz o escribir el monto?'
    );
    return;
  }

  if (validResults.length === 1) {
    const resultado = validResults[0];
    if (await preguntarSiFaltaWA(db, resultado, phoneNumber, info.localId)) return;
    const gastoGuardado = await guardarGasto(
      db,
      { ...resultado, telegram_message_id: message.id },
      info.localId,
      info.timezone
    );
    await autoRegistrarPrecio(
      db,
      { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria },
      info.localId
    );
    await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, formatearRespuesta(resultado));
    return;
  }

  let totalMonto = 0;
  for (const resultado of validResults) {
    const gastoGuardado = await guardarGasto(
      db,
      { ...resultado, telegram_message_id: message.id },
      info.localId,
      info.timezone
    );
    await autoRegistrarPrecio(
      db,
      { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria },
      info.localId
    );
    totalMonto += resultado.monto;
  }

  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, formatearRespuestaMultiple(validResults, totalMonto));
}

async function procesarDocumentoWA(db: DB, message: WhatsAppMessage, phoneNumber: string) {
  const doc = message.document!;
  if (!doc.mime_type?.includes('pdf')) {
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      '📄 Por ahora solo proceso PDFs. Probá mandando una foto o escribiendo el gasto.'
    );
    return;
  }

  const info = await obtenerLocalInfoWA(db, phoneNumber);
  if (!info) {
    await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '📄 Analizando el PDF...');

  const { buffer } = await obtenerArchivoWA(ACCESS_TOKEN, doc.id);
  const resultados = await procesarPDF(buffer, doc.filename, info.timezone);

  const validResults = resultados.filter(r => r.monto > 0);

  if (validResults.length === 0) {
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      '🤔 No pude extraer datos del PDF. ¿Podés escribir el monto manualmente?'
    );
    return;
  }

  if (validResults.length === 1) {
    const resultado = validResults[0];
    if (await preguntarSiFaltaWA(db, resultado, phoneNumber, info.localId)) return;
    const gastoGuardado = await guardarGasto(
      db,
      { ...resultado, telegram_message_id: message.id },
      info.localId,
      info.timezone
    );
    await autoRegistrarPrecio(
      db,
      { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria },
      info.localId
    );
    await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, formatearRespuesta(resultado));
    return;
  }

  let totalMonto = 0;
  for (const resultado of validResults) {
    const gastoGuardado = await guardarGasto(
      db,
      { ...resultado, telegram_message_id: message.id },
      info.localId,
      info.timezone
    );
    await autoRegistrarPrecio(
      db,
      { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria },
      info.localId
    );
    totalMonto += resultado.monto;
  }

  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, formatearRespuestaMultiple(validResults, totalMonto));
}

async function procesarVozWA(db: DB, message: WhatsAppMessage, phoneNumber: string) {
  const info = await obtenerLocalInfoWA(db, phoneNumber);
  if (!info) {
    await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, '🎤 Transcribiendo audio...');

  const { buffer } = await obtenerArchivoWA(ACCESS_TOKEN, message.audio!.id);
  const transcripcion = await transcribirAudio(buffer);

  // Classify intent from transcription
  const intencion = await clasificarIntencion(transcripcion);

  if (intencion === 'consulta') {
    const respuesta = await consultaManolo(db, info.localId, transcripcion);
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      `🎤 Escuché: "${transcripcion}"\n\n🤖 <b>Manolo dice:</b>\n\n${respuesta}`
    );
    return;
  }

  const resultado = await procesarAudio(transcripcion, info.timezone);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensajeWA(
      PHONE_NUMBER_ID,
      ACCESS_TOKEN,
      phoneNumber,
      `🎤 Escuché: "${transcripcion}"\n\n🤔 No pude identificar un gasto claro. ¿Podés repetirlo o escribirlo?`
    );
    return;
  }

  if (await preguntarSiFaltaWA(db, resultado, phoneNumber, info.localId)) return;

  await guardarGasto(db, { ...resultado, telegram_message_id: message.id }, info.localId, info.timezone);
  await enviarMensajeWA(
    PHONE_NUMBER_ID,
    ACCESS_TOKEN,
    phoneNumber,
    `🎤 Escuché: "${transcripcion}"\n\n${formatearRespuesta(resultado)}`
  );
}

async function preguntarSiFaltaWA(
  db: DB,
  resultado: any,
  phoneNumber: string,
  localId: string
): Promise<boolean> {
  if (!resultado.campos_faltantes?.length) return false;

  const faltante = resultado.campos_faltantes[0];
  await enviarMensajeWA(PHONE_NUMBER_ID, ACCESS_TOKEN, phoneNumber, faltante.pregunta);

  // Store pending (using wa_phone_number instead of chat_id)
  await db.from('gastos_pendientes').insert({
    wa_phone_number: phoneNumber,
    gasto_data: resultado,
    pregunta: faltante.pregunta,
    campo_esperado: faltante.campo,
    local_id: localId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return true;
}

function formatearRespuesta(gasto: {
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
    const fechaStr = new Date(y, m - 1, d).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

function formatearRespuestaMultiple(gastos: {
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

  let respuesta = `✅ *${gastos.length} items registrados*\n`;
  if (gastos[0]?.proveedor) {
    respuesta += `🏪 ${gastos[0].proveedor}\n`;
  }
  respuesta += `\n`;

  for (const g of gastos) {
    const emoji = categoriaEmoji[g.categoria] || '📦';
    const cant = g.cantidad && g.unidad ? ` (${g.cantidad} ${g.unidad})` : '';
    respuesta += `${emoji} ${g.descripcion}${cant} — ${fmt(g.monto)}\n`;
  }

  respuesta += `\n💰 *Total: ${fmt(totalMonto)}*`;
  return respuesta;
}
