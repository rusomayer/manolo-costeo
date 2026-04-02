import { NextRequest, NextResponse } from 'next/server';
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

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER!; // twilio sandbox number

// Helper: enviar mensaje por Twilio
async function enviarMensajeTwilio(to: string, body: string): Promise<void> {
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      To: `whatsapp:${to}`,
      Body: body,
    }).toString(),
  });
}

export async function POST(request: NextRequest) {
  const db = createServiceClient();

  try {
    const formData = await request.formData();

    // Parse Twilio webhook data
    const from = formData.get('From') as string; // whatsapp:+5491123456789
    const messageBody = formData.get('Body') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string) || 0;

    // Extract phone number (remove "whatsapp:" prefix)
    const phoneNumber = from.replace('whatsapp:', '');

    await limpiarPendientesExpirados(db);

    // Check for follow-up
    let pendiente = null;
    if (messageBody && messageBody.length < 50) {
      const ultimo = await buscarUltimoPendienteTwilio(db, phoneNumber);
      if (ultimo) pendiente = ultimo;
    }

    if (pendiente) {
      try {
        const info = await obtenerLocalInfoTwilio(db, phoneNumber);
        if (!info) {
          await enviarMensajeTwilio(phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
          return NextResponse.json({ ok: true });
        }

        const merged = await procesarRespuestaFollowUp(
          pendiente.gasto_data,
          messageBody,
          pendiente.campo_esperado,
          info.timezone
        );

        const gastoGuardado = await guardarGasto(db, { ...merged }, info.localId, info.timezone);
        await autoRegistrarPrecio(
          db,
          { ...merged, fecha: gastoGuardado.fecha, categoria: merged.categoria },
          info.localId
        );
        await eliminarGastoPendiente(db, pendiente.id);
        await enviarMensajeTwilio(phoneNumber, formatearRespuesta(merged));
        return NextResponse.json({ ok: true });
      } catch (error) {
        console.error('Error procesando follow-up:', error);
        await enviarMensajeTwilio(phoneNumber, '❌ Error procesando respuesta');
        return NextResponse.json({ ok: true });
      }
    }

    // Procesar mensaje nuevo
    try {
      if (messageBody) {
        // Verificar si es comando /link
        if (messageBody.toLowerCase().startsWith('/link ')) {
          const codigo = messageBody.slice(6).trim();
          await procesarComandoLink(db, phoneNumber, codigo);
        } else if (messageBody === '/help' || messageBody === '/ayuda') {
          await enviarMensajeTwilio(phoneNumber, '📖 <b>Como usar Manolo</b>\n\n<b>Registrar gastos:</b>\n- "Leche 20L $18.000"\n- "Pagué la luz $28.500"\n\n<b>Hacer preguntas:</b>\n- "¿Cuánto gasté este mes?"\n- "¿Cuál es mi gasto fijo?"\n\n<b>Vincularse a un local:</b>\n- /link CODIGO_DEL_LOCAL');
        } else {
          await procesarMensajeTextoTwilio(db, messageBody, phoneNumber);
        }
      } else if (numMedia > 0) {
        const mediaUrl = formData.get('MediaUrl0') as string;
        const mediaContentType = (formData.get('MediaContentType0') as string) || '';
        const caption = messageBody || undefined;

        if (mediaContentType.startsWith('image/')) {
          await procesarImagenTwilio(db, mediaUrl, mediaContentType, caption, phoneNumber);
        } else if (mediaContentType === 'application/pdf') {
          await procesarPDFTwilio(db, mediaUrl, phoneNumber);
        } else if (mediaContentType.startsWith('audio/')) {
          await procesarVozTwilio(db, mediaUrl, phoneNumber);
        } else {
          await enviarMensajeTwilio(phoneNumber, '🤔 No entendí ese tipo de archivo. Podés mandar texto, foto de factura, PDF o audio.');
        }
      } else {
        await enviarMensajeTwilio(phoneNumber, '🤔 No entendí ese tipo de mensaje.');
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      await enviarMensajeTwilio(phoneNumber, '❌ Error procesando tu mensaje. Intentá de nuevo.');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook Twilio:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function procesarComandoLink(db: DB, phoneNumber: string, codigo: string) {
  try {
    // Buscar el local por twilio_code
    const { data: local, error } = await db
      .from('locales')
      .select('id, nombre, timezone')
      .eq('twilio_code', codigo)
      .maybeSingle();

    if (error || !local) {
      await enviarMensajeTwilio(phoneNumber, '❌ Código inválido. Verifica que esté correcto.');
      return;
    }

    // Vincular el número al local
    await db.from('twilio_links').upsert(
      { phone_number: phoneNumber, local_id: local.id },
      { onConflict: 'phone_number' }
    );

    await enviarMensajeTwilio(
      phoneNumber,
      `✅ <b>Vinculado a "${local.nombre}"</b>\n\nTodos tus mensajes desde aquí se guardarán en este local.\n\nAhora puedes:\n- Escribir gastos: "Leche 20L $18.000"\n- Hacer preguntas: "¿Cuánto gasté este mes?"\n\nEscribe /help para más info.`
    );
  } catch (error) {
    console.error('Error en /link:', error);
    await enviarMensajeTwilio(phoneNumber, '❌ Error vinculando. Intentá de nuevo más tarde.');
  }
}

async function obtenerLocalInfoTwilio(db: DB, phoneNumber: string) {
  // Para testing con Twilio, vamos a asumir que el local está vinculado
  // En producción, tendrías una tabla twilio_links similar a whatsapp_links
  const { data } = await db
    .from('twilio_links')
    .select('local_id, locales(timezone)')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (data) {
    return {
      localId: data.local_id,
      timezone: (data as any).locales?.timezone || 'America/Buenos_Aires',
    };
  }

  // Fallback para testing: usar el primer local del usuario
  // En producción esto NO es seguro
  const { data: firstLocal } = await db
    .from('locales')
    .select('id, timezone')
    .limit(1)
    .single();

  if (firstLocal) {
    // Auto-guardar esta vinculación
    await db.from('twilio_links').upsert(
      { phone_number: phoneNumber, local_id: firstLocal.id },
      { onConflict: 'phone_number' }
    );

    return {
      localId: firstLocal.id,
      timezone: firstLocal.timezone || 'America/Buenos_Aires',
    };
  }

  return null;
}

async function buscarUltimoPendienteTwilio(db: DB, phoneNumber: string) {
  const { data } = await db
    .from('gastos_pendientes')
    .select('*')
    .eq('twilio_phone_number', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function procesarMensajeTextoTwilio(db: DB, texto: string, phoneNumber: string) {
  const info = await obtenerLocalInfoTwilio(db, phoneNumber);
  if (!info) {
    await enviarMensajeTwilio(phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  // Clasificar intención
  const intencion = await clasificarIntencion(texto);

  if (intencion === 'consulta') {
    await enviarMensajeTwilio(phoneNumber, '🤔 Consultando...');
    const respuesta = await consultaManolo(db, info.localId, texto);
    await enviarMensajeTwilio(phoneNumber, `🤖 Manolo dice:\n\n${respuesta}`);
    return;
  }

  // Procesar como gasto
  const resultado = await procesarTexto(texto, info.timezone);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensajeTwilio(
      phoneNumber,
      '🤔 No estoy seguro. Probá así:\n"Cafe 5kg $45.000"\n"Pagué la luz $28.500"'
    );
    return;
  }

  if (await preguntarSiFaltaTwilio(db, resultado, phoneNumber, info.localId)) return;

  const gastoGuardado = await guardarGasto(db, { ...resultado }, info.localId, info.timezone);
  await autoRegistrarPrecio(
    db,
    { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria },
    info.localId
  );
  await enviarMensajeTwilio(phoneNumber, formatearRespuesta(resultado));
}

async function preguntarSiFaltaTwilio(
  db: DB,
  resultado: any,
  phoneNumber: string,
  localId: string
): Promise<boolean> {
  if (!resultado.campos_faltantes?.length) return false;

  const faltante = resultado.campos_faltantes[0];
  await enviarMensajeTwilio(phoneNumber, faltante.pregunta);

  // Guardar pendiente
  await db.from('gastos_pendientes').insert({
    twilio_phone_number: phoneNumber,
    gasto_data: resultado,
    pregunta: faltante.pregunta,
    campo_esperado: faltante.campo,
    local_id: localId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return true;
}

async function descargarMediaTwilio(mediaUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(mediaUrl, {
    headers: { 'Authorization': `Basic ${auth}` },
  });
  if (!response.ok) throw new Error(`Error descargando media: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

async function procesarImagenTwilio(
  db: DB,
  mediaUrl: string,
  mediaContentType: string,
  caption: string | undefined,
  phoneNumber: string
) {
  const info = await obtenerLocalInfoTwilio(db, phoneNumber);
  if (!info) {
    await enviarMensajeTwilio(phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  await enviarMensajeTwilio(phoneNumber, '📸 Analizando la imagen...');

  const { buffer } = await descargarMediaTwilio(mediaUrl);
  const mimeType = mediaContentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  const resultados = await procesarImagen(buffer, mimeType, caption, info.timezone);

  const validResults = resultados.filter(r => r.monto > 0);

  if (validResults.length === 0) {
    await enviarMensajeTwilio(phoneNumber, '🤔 No pude leer bien la factura. ¿Podés mandarla con mejor luz o escribir el monto?');
    return;
  }

  if (validResults.length === 1) {
    const resultado = validResults[0];
    if (await preguntarSiFaltaTwilio(db, resultado, phoneNumber, info.localId)) return;
    const gastoGuardado = await guardarGasto(db, { ...resultado }, info.localId, info.timezone);
    await autoRegistrarPrecio(db, { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria }, info.localId);
    await enviarMensajeTwilio(phoneNumber, formatearRespuesta(resultado));
    return;
  }

  let totalMonto = 0;
  for (const resultado of validResults) {
    const gastoGuardado = await guardarGasto(db, { ...resultado }, info.localId, info.timezone);
    await autoRegistrarPrecio(db, { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria }, info.localId);
    totalMonto += resultado.monto;
  }
  await enviarMensajeTwilio(phoneNumber, formatearRespuestaMultiple(validResults, totalMonto));
}

async function procesarPDFTwilio(db: DB, mediaUrl: string, phoneNumber: string) {
  const info = await obtenerLocalInfoTwilio(db, phoneNumber);
  if (!info) {
    await enviarMensajeTwilio(phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  await enviarMensajeTwilio(phoneNumber, '📄 Analizando el PDF...');

  const { buffer } = await descargarMediaTwilio(mediaUrl);
  const resultados = await procesarPDF(buffer, undefined, info.timezone);

  const validResults = resultados.filter(r => r.monto > 0);

  if (validResults.length === 0) {
    await enviarMensajeTwilio(phoneNumber, '🤔 No pude extraer datos del PDF. ¿Podés escribir el monto manualmente?');
    return;
  }

  if (validResults.length === 1) {
    const resultado = validResults[0];
    if (await preguntarSiFaltaTwilio(db, resultado, phoneNumber, info.localId)) return;
    const gastoGuardado = await guardarGasto(db, { ...resultado }, info.localId, info.timezone);
    await autoRegistrarPrecio(db, { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria }, info.localId);
    await enviarMensajeTwilio(phoneNumber, formatearRespuesta(resultado));
    return;
  }

  let totalMonto = 0;
  for (const resultado of validResults) {
    const gastoGuardado = await guardarGasto(db, { ...resultado }, info.localId, info.timezone);
    await autoRegistrarPrecio(db, { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria }, info.localId);
    totalMonto += resultado.monto;
  }
  await enviarMensajeTwilio(phoneNumber, formatearRespuestaMultiple(validResults, totalMonto));
}

async function procesarVozTwilio(db: DB, mediaUrl: string, phoneNumber: string) {
  const info = await obtenerLocalInfoTwilio(db, phoneNumber);
  if (!info) {
    await enviarMensajeTwilio(phoneNumber, '⚠️ Este número no está vinculado a ningún local.');
    return;
  }

  await enviarMensajeTwilio(phoneNumber, '🎤 Transcribiendo audio...');

  const { buffer } = await descargarMediaTwilio(mediaUrl);
  const transcripcion = await transcribirAudio(buffer);

  const intencion = await clasificarIntencion(transcripcion);

  if (intencion === 'consulta') {
    const respuesta = await consultaManolo(db, info.localId, transcripcion);
    await enviarMensajeTwilio(phoneNumber, `🎤 Escuché: "${transcripcion}"\n\n🤖 Manolo dice:\n\n${respuesta}`);
    return;
  }

  const resultado = await procesarAudio(transcripcion, info.timezone);

  if (resultado.monto === 0 || resultado.confianza === 'baja') {
    await enviarMensajeTwilio(phoneNumber, `🎤 Escuché: "${transcripcion}"\n\n🤔 No pude identificar un gasto claro. ¿Podés repetirlo o escribirlo?`);
    return;
  }

  if (await preguntarSiFaltaTwilio(db, resultado, phoneNumber, info.localId)) return;

  const gastoGuardado = await guardarGasto(db, { ...resultado }, info.localId, info.timezone);
  await autoRegistrarPrecio(db, { ...resultado, fecha: gastoGuardado.fecha, categoria: resultado.categoria }, info.localId);
  await enviarMensajeTwilio(phoneNumber, `🎤 Escuché: "${transcripcion}"\n\n${formatearRespuesta(resultado)}`);
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

  let respuesta = `✅ Registrado\n\n`;
  respuesta += `${emoji} ${gasto.descripcion}\n`;
  respuesta += `💰 ${monto}\n`;
  respuesta += `📁 ${gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}`;

  if (gasto.fecha) {
    const [y, m, d] = gasto.fecha.split('-').map(Number);
    const fechaStr = new Date(y, m - 1, d).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
    });
    respuesta += `\n📅 ${fechaStr}`;
  }

  if (gasto.cantidad && gasto.unidad) {
    respuesta += `\n📦 ${gasto.cantidad} ${gasto.unidad}`;
  }

  if (gasto.proveedor) {
    respuesta += `\n🏪 ${gasto.proveedor}`;
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

  let respuesta = `✅ ${gastos.length} items registrados\n`;
  if (gastos[0]?.proveedor) {
    respuesta += `🏪 ${gastos[0].proveedor}\n`;
  }
  respuesta += `\n`;

  for (const g of gastos) {
    const emoji = categoriaEmoji[g.categoria] || '📦';
    const cant = g.cantidad && g.unidad ? ` (${g.cantidad} ${g.unidad})` : '';
    respuesta += `${emoji} ${g.descripcion}${cant} — ${fmt(g.monto)}\n`;
  }

  respuesta += `\n💰 Total: ${fmt(totalMonto)}`;
  return respuesta;
}
