import Anthropic from '@anthropic-ai/sdk';
import { ClaudeGastoResponse, Categoria } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getSystemPrompt(timezone?: string) {
  const tz = timezone || 'America/Buenos_Aires';
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const diaSemana = new Date().toLocaleDateString('es-AR', { timeZone: tz, weekday: 'long' });
  return `Sos un asistente que ayuda a registrar gastos de un café/bar.
Tu trabajo es extraer información de gastos de mensajes de texto, fotos de facturas, o transcripciones de audio.

HOY es ${diaSemana} ${hoy}. Usa esta fecha para interpretar referencias como "ayer", "el lunes", "la semana pasada", etc.

CATEGORÍAS VÁLIDAS:
- insumos: café, leche, azúcar, medialunas, ingredientes, etc.
- servicios: luz, gas, agua, internet, teléfono
- sueldos: pagos a empleados, cargas sociales
- alquiler: alquiler del local, expensas
- impuestos: IIBB, monotributo, tasas municipales
- mantenimiento: reparaciones, limpieza, insumos de limpieza
- otros: todo lo que no entre en las anteriores

RESPONDE SIEMPRE EN JSON con este formato exacto:
{
  "descripcion": "descripción corta del gasto",
  "monto": 12345.00,
  "categoria": "insumos",
  "proveedor": "nombre del proveedor si se menciona",
  "fecha": "2024-01-15 si se menciona una fecha específica, sino null",
  "confianza": "alta/media/baja",
  "notas": "cualquier detalle adicional relevante",
  "cantidad": 5.0,
  "unidad": "kg",
  "tipo_gasto": "fijo o variable"
}

TIPO DE GASTO:
- "fijo": gastos recurrentes mensuales que no cambian mucho: alquiler, sueldos, servicios (luz, gas, internet), impuestos, seguros
- "variable": gastos que varían mes a mes: insumos, mantenimiento puntual, compras ocasionales
- Si la categoría es "alquiler", "sueldos", o "impuestos", es casi seguro "fijo"
- Si la categoría es "insumos", es casi seguro "variable"
- "servicios" puede ser fijo (abono internet) o variable (consumo de luz), usá tu criterio
- "mantenimiento" generalmente es "variable" salvo que sea un contrato mensual
- Si no estás seguro, poné "variable"

REGLAS:
- El monto SIEMPRE debe ser un número positivo
- Si no podés determinar el monto con certeza, poné confianza "baja"
- Si el mensaje no parece ser un gasto, respondé con monto: 0 y confianza: "baja"
- Usá tu mejor criterio para categorizar
- En "descripcion" sé conciso pero claro (máx 50 caracteres)
- "cantidad" y "unidad" son OPCIONALES: solo incluirlos si el dato está presente en el mensaje o factura
- Si se menciona "5kg de café", cantidad: 5, unidad: "kg"
- Si se menciona "20 litros de leche", cantidad: 20, unidad: "litros"
- Si se menciona "3 cajas de azúcar", cantidad: 3, unidad: "cajas"
- Si no se menciona cantidad, poné cantidad: null y unidad: null
- NO inventar cantidades, solo extraerlas si están explícitas

CAMPOS FALTANTES:
Agregá un campo "campos_faltantes" como array SOLO cuando falte información útil.
Solo UNA pregunta por vez (la más importante).

1. "cantidad_unidad": Si la categoría es "insumos" y NO se mencionó cantidad ni unidad.
   - SÍ preguntar: "Compré café $45.000" (falta cuánto), "Leche $18.000" (falta cuánta)
   - NO preguntar: "Pagué la luz", "Sueldo de Juan", "Alquiler marzo" (no son insumos)
   - Ejemplo de pregunta: "¿Cuánto compraste? (ej: 5kg, 20 litros, 3 cajas)"

2. "fecha": Si NO se mencionó ninguna fecha o referencia temporal (hoy, ayer, lunes, etc.)
   - Ejemplo de pregunta: "¿Esto fue hoy u otro día?"

Prioridad: cantidad_unidad > fecha.
Si la cantidad YA está en el mensaje, NO preguntar por ella.
Si no falta nada relevante, NO incluir campos_faltantes.

Formato del campo:
"campos_faltantes": [{"campo": "cantidad_unidad", "pregunta": "¿Cuántos kg/litros/unidades compraste?"}]`;
}

export async function procesarTexto(texto: string, timezone?: string): Promise<ClaudeGastoResponse> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: getSystemPrompt(timezone),
    messages: [
      {
        role: 'user',
        content: `Extraé el gasto de este mensaje:\n\n"${texto}"`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  try {
    // Limpiar el JSON de posibles backticks
    const jsonStr = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error parseando respuesta:', content.text);
    throw new Error('No pude entender el gasto');
  }
}

export async function procesarImagen(imageBuffer: Buffer, mimeType: string, caption?: string, timezone?: string): Promise<ClaudeGastoResponse> {
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: getSystemPrompt(timezone),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: caption 
              ? `Extraé el gasto de esta imagen. Contexto adicional: "${caption}"`
              : 'Extraé el gasto de esta imagen de factura/ticket.',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  try {
    const jsonStr = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error parseando respuesta:', content.text);
    throw new Error('No pude leer la factura');
  }
}

export async function procesarPDF(pdfBuffer: Buffer, filename?: string, timezone?: string): Promise<ClaudeGastoResponse> {
  const base64 = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: getSystemPrompt(timezone),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Extraé el gasto de este PDF${filename ? ` (${filename})` : ''}.`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  try {
    const jsonStr = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error parseando respuesta:', content.text);
    throw new Error('No pude leer el PDF');
  }
}

export async function procesarAudio(transcripcion: string, timezone?: string): Promise<ClaudeGastoResponse> {
  return procesarTexto(transcripcion, timezone);
}

export async function procesarRespuestaFollowUp(
  gastoOriginal: ClaudeGastoResponse,
  respuestaUsuario: string,
  campoEsperado: string,
  timezone?: string
): Promise<ClaudeGastoResponse> {
  const tz = timezone || 'America/Buenos_Aires';
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `Sos un asistente que actualiza datos de gastos de un café/bar.
Te dan un gasto ya parseado y la respuesta del usuario a una pregunta sobre un dato faltante.
HOY es ${hoy}. Si el usuario dice "hoy", usa esta fecha. Si dice "ayer", resta un dia.
Devolvé el JSON del gasto actualizado. Mismo formato. No cambies campos que ya tenían valor.
NO incluyas "campos_faltantes" en la respuesta.`,
    messages: [
      {
        role: 'user',
        content: `Gasto original:\n${JSON.stringify(gastoOriginal)}\n\nSe le preguntó por: ${campoEsperado}\nEl usuario respondió: "${respuestaUsuario}"\n\nDevolvé el JSON actualizado.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude');
  }

  try {
    const jsonStr = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error parseando respuesta follow-up:', content.text);
    throw new Error('No pude entender la respuesta');
  }
}

export async function transcribirAudio(audioBuffer: Buffer): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
  const file = new File([blob], 'audio.ogg', { type: 'audio/ogg' });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'es',
  });

  if (!transcription.text || transcription.text.trim().length === 0) {
    throw new Error('No se pudo transcribir el audio');
  }

  return transcription.text;
}
