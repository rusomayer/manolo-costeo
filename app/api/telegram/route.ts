import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, TelegramMessage } from '@/lib/types';
import { enviarMensaje, obtenerArchivo, formatearRespuesta, formatearError } from '@/lib/telegram';
import { procesarTexto, procesarImagen, procesarPDF, transcribirAudio, procesarAudio, procesarRespuestaFollowUp } from '@/lib/claude';
import { guardarGasto, guardarGastoPendiente, buscarGastoPendiente, buscarUltimoPendiente, eliminarGastoPendiente, limpiarPendientesExpirados } from '@/lib/supabase';
import { ClaudeGastoResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    
    // Solo procesamos mensajes (no ediciones, etc)
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    // Limpiar pendientes expirados
    await limpiarPendientesExpirados();

    // Verificar si es respuesta a una pregunta de follow-up
    // 1. Por reply explícito al mensaje del bot
    // 2. Por último pendiente del chat (si el mensaje es corto, probablemente es una respuesta)
    let pendiente = null;
    if (message.reply_to_message?.from?.is_bot) {
      pendiente = await buscarGastoPendiente(chatId, message.reply_to_message.message_id);
    }
    if (!pendiente && (message.text || message.voice)) {
      // Si hay un pendiente reciente y el mensaje parece una respuesta corta
      const ultimo = await buscarUltimoPendiente(chatId);
      if (ultimo && message.text && message.text.length < 50) {
        pendiente = ultimo;
      } else if (ultimo && message.voice) {
        pendiente = ultimo;
      }
    }

    if (pendiente) {
      try {
        let textoRespuesta = message.text;
        // Si respondió con audio, transcribirlo
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
          await guardarGasto({ ...merged, telegram_message_id: String(messageId) });
          await eliminarGastoPendiente(pendiente.id);
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
      // Procesar según el tipo de mensaje
      if (message.photo && message.photo.length > 0) {
        await procesarFoto(message, chatId, messageId);
      } else if (message.document) {
        await procesarDocumento(message, chatId, messageId);
      } else if (message.voice) {
        await procesarVoz(message, chatId, messageId);
      } else if (message.text) {
        await procesarMensajeTexto(message, chatId, messageId);
      } else {
        await enviarMensaje(
          chatId,
          '🤔 No entendí ese tipo de mensaje. Podés mandarme:\n\n• Texto con el gasto\n• Foto de una factura\n• PDF de una factura\n• Audio describiendo el gasto',
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

async function procesarMensajeTexto(message: TelegramMessage, chatId: number, messageId: number) {
  const texto = message.text!;
  
  // Comandos especiales
  if (texto === '/start') {
    await enviarMensaje(
      chatId,
      '☕ <b>¡Hola! Soy tu bot de gastos.</b>\n\n' +
      'Mandame tus gastos de cualquier forma:\n\n' +
      '📝 <b>Texto:</b> "Compré café 5kg a $45.000"\n' +
      '📸 <b>Foto:</b> De una factura o ticket\n' +
      '📄 <b>PDF:</b> Facturas digitales\n' +
      '🎤 <b>Audio:</b> Dictá el gasto\n\n' +
      'Yo me encargo de extraer los datos y guardarlos.',
      messageId
    );
    return;
  }

  if (texto === '/ayuda' || texto === '/help') {
    await enviarMensaje(
      chatId,
      '📖 <b>Cómo usar el bot</b>\n\n' +
      '<b>Registrar gastos:</b>\n' +
      '• Escribí el gasto: "Leche 20L $18.000"\n' +
      '• Mandá foto de factura\n' +
      '• Mandá PDF de factura\n\n' +
      '<b>Categorías:</b>\n' +
      '☕ Insumos\n' +
      '💡 Servicios\n' +
      '👤 Sueldos\n' +
      '🏠 Alquiler\n' +
      '📋 Impuestos\n' +
      '🔧 Mantenimiento\n' +
      '📦 Otros',
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
      'Probá con algo como:\n' +
      '• "Café 5kg $45.000"\n' +
      '• "Pagué la luz $28.500"\n' +
      '• "Sueldo Juan $150.000"',
      messageId
    );
    return;
  }

  // Preguntar si falta info antes de guardar
  if (await preguntarSiFalta(resultado, chatId, messageId)) return;

  await guardarGasto({
    ...resultado,
    telegram_message_id: String(messageId),
  });

  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarFoto(message: TelegramMessage, chatId: number, messageId: number) {
  // Telegram envía varias resoluciones, tomamos la más grande
  const fotos = message.photo!;
  const fotoGrande = fotos[fotos.length - 1];
  
  await enviarMensaje(chatId, '📸 Analizando la imagen...', messageId);
  
  const { buffer } = await obtenerArchivo(fotoGrande.file_id);
  const resultado = await procesarImagen(buffer, 'image/jpeg', message.caption);
  
  if (resultado.monto === 0) {
    await enviarMensaje(
      chatId,
      '🤔 No pude leer bien la factura. ¿Podés mandarla con mejor luz o escribir el monto?',
      messageId
    );
    return;
  }

  if (await preguntarSiFalta(resultado, chatId, messageId)) return;

  await guardarGasto({
    ...resultado,
    telegram_message_id: String(messageId),
  });

  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarDocumento(message: TelegramMessage, chatId: number, messageId: number) {
  const doc = message.document!;
  
  // Solo PDFs por ahora
  if (doc.mime_type !== 'application/pdf') {
    await enviarMensaje(
      chatId,
      '📄 Por ahora solo proceso PDFs. Probá mandando una foto o escribiendo el gasto.',
      messageId
    );
    return;
  }

  await enviarMensaje(chatId, '📄 Analizando el PDF...', messageId);
  
  const { buffer } = await obtenerArchivo(doc.file_id);
  const resultado = await procesarPDF(buffer, doc.file_name);
  
  if (resultado.monto === 0) {
    await enviarMensaje(
      chatId,
      '🤔 No pude extraer datos del PDF. ¿Podés escribir el monto manualmente?',
      messageId
    );
    return;
  }

  if (await preguntarSiFalta(resultado, chatId, messageId)) return;

  await guardarGasto({
    ...resultado,
    telegram_message_id: String(messageId),
  });

  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarVoz(message: TelegramMessage, chatId: number, messageId: number) {
  await enviarMensaje(chatId, '🎤 Transcribiendo audio...', messageId);

  const { buffer } = await obtenerArchivo(message.voice!.file_id);
  const transcripcion = await transcribirAudio(buffer);
  const resultado = await procesarAudio(transcripcion);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensaje(
      chatId,
      `🎤 Escuché: "<i>${transcripcion}</i>"\n\n🤔 No pude identificar un gasto claro. ¿Podés repetirlo o escribirlo?`,
      messageId
    );
    return;
  }

  if (await preguntarSiFalta(resultado, chatId, messageId)) return;

  await guardarGasto({
    ...resultado,
    telegram_message_id: String(messageId),
  });

  await enviarMensaje(
    chatId,
    `🎤 Escuché: "<i>${transcripcion}</i>"\n\n${formatearRespuesta(resultado)}`,
    messageId
  );
}

async function preguntarSiFalta(
  resultado: ClaudeGastoResponse,
  chatId: number,
  messageId: number
): Promise<boolean> {
  if (!resultado.campos_faltantes?.length) return false;

  const faltante = resultado.campos_faltantes[0];
  const sentMsg = await enviarMensaje(chatId, faltante.pregunta, messageId, true);
  await guardarGastoPendiente({
    chatId,
    botMessageId: sentMsg.result.message_id,
    gastoData: resultado,
    pregunta: faltante.pregunta,
    campoEsperado: faltante.campo,
  });
  return true;
}

// Verificación del webhook (GET request de Telegram)
export async function GET() {
  return NextResponse.json({ 
    status: 'Bot activo',
    timestamp: new Date().toISOString()
  });
}
