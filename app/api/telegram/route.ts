import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, TelegramMessage, ClaudeGastoResponse } from '@/lib/types';
import { enviarMensaje, obtenerArchivo, formatearRespuesta, formatearError } from '@/lib/telegram';
import { procesarTexto, procesarImagen, procesarPDF, transcribirAudio, procesarAudio, procesarRespuestaFollowUp } from '@/lib/claude';
import { guardarGasto, guardarGastoPendiente, buscarGastoPendiente, buscarUltimoPendiente, eliminarGastoPendiente, limpiarPendientesExpirados } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const db = createServiceClient();

  try {
    const update: TelegramUpdate = await request.json();

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    // Limpiar pendientes expirados
    await limpiarPendientesExpirados(db);

    // Verificar si es respuesta a una pregunta de follow-up
    let pendiente = null;
    if (message.reply_to_message?.from?.is_bot) {
      pendiente = await buscarGastoPendiente(db, chatId, message.reply_to_message.message_id);
    }
    if (!pendiente && (message.text || message.voice)) {
      const ultimo = await buscarUltimoPendiente(db, chatId);
      if (ultimo && message.text && message.text.length < 50) {
        pendiente = ultimo;
      } else if (ultimo && message.voice) {
        pendiente = ultimo;
      }
    }

    if (pendiente) {
      try {
        let textoRespuesta = message.text;
        if (!textoRespuesta && message.voice) {
          const { buffer } = await obtenerArchivo(message.voice.file_id);
          textoRespuesta = await transcribirAudio(buffer);
        }
        if (textoRespuesta) {
          const merged = await procesarRespuestaFollowUp(
            pendiente.gasto_data,
            textoRespuesta,
            pendiente.campo_esperado
          );
          await guardarGasto(db, { ...merged, telegram_message_id: String(messageId) }, pendiente.local_id);
          await eliminarGastoPendiente(db, pendiente.id);
          await enviarMensaje(chatId, formatearRespuesta(merged), messageId);
          return NextResponse.json({ ok: true });
        }
      } catch (error) {
        console.error('Error procesando follow-up:', error);
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        await enviarMensaje(chatId, formatearError(errorMsg), messageId);
        return NextResponse.json({ ok: true });
      }
    }

    try {
      if (message.photo && message.photo.length > 0) {
        await procesarFoto(db, message, chatId, messageId);
      } else if (message.document) {
        await procesarDocumento(db, message, chatId, messageId);
      } else if (message.voice) {
        await procesarVoz(db, message, chatId, messageId);
      } else if (message.text) {
        await procesarMensajeTexto(db, message, chatId, messageId);
      } else {
        await enviarMensaje(
          chatId,
          '🤔 No entendi ese tipo de mensaje. Podes mandarme:\n\n- Texto con el gasto\n- Foto de una factura\n- PDF de una factura\n- Audio describiendo el gasto',
          messageId
        );
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      await enviarMensaje(chatId, formatearError(errorMsg), messageId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// Buscar el local_id vinculado a este chat
async function obtenerLocalId(db: ReturnType<typeof createServiceClient>, chatId: number): Promise<string | null> {
  const { data } = await db
    .from('telegram_links')
    .select('local_id')
    .eq('chat_id', chatId)
    .single();
  return data?.local_id || null;
}

async function procesarMensajeTexto(
  db: ReturnType<typeof createServiceClient>,
  message: TelegramMessage,
  chatId: number,
  messageId: number
) {
  const texto = message.text!;

  // /start con codigo de local
  if (texto.startsWith('/start')) {
    const code = texto.split(' ')[1];
    if (code) {
      const { data: local } = await db
        .from('locales')
        .select('id, nombre')
        .eq('telegram_code', code)
        .single();

      if (local) {
        await db
          .from('telegram_links')
          .upsert({ chat_id: chatId, local_id: local.id }, { onConflict: 'chat_id' });
        await enviarMensaje(
          chatId,
          `✅ <b>Vinculado a "${local.nombre}"</b>\n\nTodos los gastos que mandes desde este chat se guardan ahi.`,
          messageId
        );
      } else {
        await enviarMensaje(chatId, '❌ Codigo invalido. Revisa el link de vinculacion.', messageId);
      }
      return;
    }

    // /start sin codigo
    await enviarMensaje(
      chatId,
      '☕ <b>Hola! Soy tu bot de gastos.</b>\n\n' +
      'Para empezar, necesitas vincular este chat a un local.\n' +
      'Usa el link de vinculacion que encontras en la configuracion del dashboard.',
      messageId
    );
    return;
  }

  if (texto === '/ayuda' || texto === '/help') {
    await enviarMensaje(
      chatId,
      '📖 <b>Como usar el bot</b>\n\n' +
      '<b>Registrar gastos:</b>\n' +
      '- Escribi el gasto: "Leche 20L $18.000"\n' +
      '- Manda foto de factura\n' +
      '- Manda PDF de factura\n' +
      '- Graba un audio\n\n' +
      '<b>Categorias:</b>\n' +
      '☕ Insumos | 💡 Servicios | 👤 Sueldos\n' +
      '🏠 Alquiler | 📋 Impuestos | 🔧 Mantenimiento | 📦 Otros',
      messageId
    );
    return;
  }

  // Verificar vinculacion
  const localId = await obtenerLocalId(db, chatId);
  if (!localId) {
    await enviarMensaje(
      chatId,
      '⚠️ Este chat no esta vinculado a ningun local.\n\nUsa el link de vinculacion desde el dashboard (Configuracion > Telegram).',
      messageId
    );
    return;
  }

  // Procesar como gasto
  const resultado = await procesarTexto(texto);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensaje(
      chatId,
      '🤔 No estoy seguro de entender el gasto.\n\n' +
      'Proba con algo como:\n' +
      '- "Cafe 5kg $45.000"\n' +
      '- "Pague la luz $28.500"\n' +
      '- "Sueldo Juan $150.000"',
      messageId
    );
    return;
  }

  if (await preguntarSiFalta(db, resultado, chatId, messageId, localId)) return;

  await guardarGasto(db, { ...resultado, telegram_message_id: String(messageId) }, localId);
  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarFoto(
  db: ReturnType<typeof createServiceClient>,
  message: TelegramMessage,
  chatId: number,
  messageId: number
) {
  const localId = await obtenerLocalId(db, chatId);
  if (!localId) {
    await enviarMensaje(chatId, '⚠️ Este chat no esta vinculado a ningun local.', messageId);
    return;
  }

  const fotos = message.photo!;
  const fotoGrande = fotos[fotos.length - 1];

  await enviarMensaje(chatId, '📸 Analizando la imagen...', messageId);

  const { buffer } = await obtenerArchivo(fotoGrande.file_id);
  const resultado = await procesarImagen(buffer, 'image/jpeg', message.caption);

  if (resultado.monto === 0) {
    await enviarMensaje(chatId, '🤔 No pude leer bien la factura. Podes mandarla con mejor luz o escribir el monto?', messageId);
    return;
  }

  if (await preguntarSiFalta(db, resultado, chatId, messageId, localId)) return;

  await guardarGasto(db, { ...resultado, telegram_message_id: String(messageId) }, localId);
  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarDocumento(
  db: ReturnType<typeof createServiceClient>,
  message: TelegramMessage,
  chatId: number,
  messageId: number
) {
  const doc = message.document!;

  if (doc.mime_type !== 'application/pdf') {
    await enviarMensaje(chatId, '📄 Por ahora solo proceso PDFs. Proba mandando una foto o escribiendo el gasto.', messageId);
    return;
  }

  const localId = await obtenerLocalId(db, chatId);
  if (!localId) {
    await enviarMensaje(chatId, '⚠️ Este chat no esta vinculado a ningun local.', messageId);
    return;
  }

  await enviarMensaje(chatId, '📄 Analizando el PDF...', messageId);

  const { buffer } = await obtenerArchivo(doc.file_id);
  const resultado = await procesarPDF(buffer, doc.file_name);

  if (resultado.monto === 0) {
    await enviarMensaje(chatId, '🤔 No pude extraer datos del PDF. Podes escribir el monto manualmente?', messageId);
    return;
  }

  if (await preguntarSiFalta(db, resultado, chatId, messageId, localId)) return;

  await guardarGasto(db, { ...resultado, telegram_message_id: String(messageId) }, localId);
  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarVoz(
  db: ReturnType<typeof createServiceClient>,
  message: TelegramMessage,
  chatId: number,
  messageId: number
) {
  const localId = await obtenerLocalId(db, chatId);
  if (!localId) {
    await enviarMensaje(chatId, '⚠️ Este chat no esta vinculado a ningun local.', messageId);
    return;
  }

  await enviarMensaje(chatId, '🎤 Transcribiendo audio...', messageId);

  const { buffer } = await obtenerArchivo(message.voice!.file_id);
  const transcripcion = await transcribirAudio(buffer);
  const resultado = await procesarAudio(transcripcion);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensaje(
      chatId,
      `🎤 Escuche: "<i>${transcripcion}</i>"\n\n🤔 No pude identificar un gasto claro. Podes repetirlo o escribirlo?`,
      messageId
    );
    return;
  }

  if (await preguntarSiFalta(db, resultado, chatId, messageId, localId)) return;

  await guardarGasto(db, { ...resultado, telegram_message_id: String(messageId) }, localId);
  await enviarMensaje(chatId, `🎤 Escuche: "<i>${transcripcion}</i>"\n\n${formatearRespuesta(resultado)}`, messageId);
}

async function preguntarSiFalta(
  db: ReturnType<typeof createServiceClient>,
  resultado: ClaudeGastoResponse,
  chatId: number,
  messageId: number,
  localId: string
): Promise<boolean> {
  if (!resultado.campos_faltantes?.length) return false;

  const faltante = resultado.campos_faltantes[0];
  const sentMsg = await enviarMensaje(chatId, faltante.pregunta, messageId, true);
  await guardarGastoPendiente(db, {
    chatId,
    botMessageId: sentMsg.result.message_id,
    gastoData: resultado,
    pregunta: faltante.pregunta,
    campoEsperado: faltante.campo,
    localId,
  });
  return true;
}

export async function GET() {
  return NextResponse.json({
    status: 'Bot activo',
    timestamp: new Date().toISOString(),
  });
}
