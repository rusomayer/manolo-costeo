import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, TelegramMessage } from '@/lib/types';
import { enviarMensaje, obtenerArchivo, formatearRespuesta, formatearError } from '@/lib/telegram';
import { procesarTexto, procesarImagen, procesarPDF } from '@/lib/claude';
import { guardarGasto } from '@/lib/supabase';

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

  // Guardar en la base de datos
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

  await guardarGasto({
    ...resultado,
    telegram_message_id: String(messageId),
  });

  await enviarMensaje(chatId, formatearRespuesta(resultado), messageId);
}

async function procesarVoz(message: TelegramMessage, chatId: number, messageId: number) {
  // Por ahora, pedimos que escriban porque Claude no procesa audio directamente
  // En producción: usar Whisper o similar para transcribir
  await enviarMensaje(
    chatId,
    '🎤 Por ahora no puedo procesar audios directamente.\n\n' +
    '¿Podés escribir el gasto? Por ejemplo:\n' +
    '"Compré 5kg de café a $45.000"',
    messageId
  );
}

// Verificación del webhook (GET request de Telegram)
export async function GET() {
  return NextResponse.json({ 
    status: 'Bot activo',
    timestamp: new Date().toISOString()
  });
}
