import Anthropic from '@anthropic-ai/sdk';
import { ClaudeGastoResponse, Categoria } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Sos un asistente que ayuda a registrar gastos de un café/bar.
Tu trabajo es extraer información de gastos de mensajes de texto, fotos de facturas, o transcripciones de audio.

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
  "notas": "cualquier detalle adicional relevante"
}

REGLAS:
- El monto SIEMPRE debe ser un número positivo
- Si no podés determinar el monto con certeza, poné confianza "baja"
- Si el mensaje no parece ser un gasto, respondé con monto: 0 y confianza: "baja"
- Usá tu mejor criterio para categorizar
- En "descripcion" sé conciso pero claro (máx 50 caracteres)`;

export async function procesarTexto(texto: string): Promise<ClaudeGastoResponse> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
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

export async function procesarImagen(imageBuffer: Buffer, mimeType: string, caption?: string): Promise<ClaudeGastoResponse> {
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
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

export async function procesarPDF(pdfBuffer: Buffer, filename?: string): Promise<ClaudeGastoResponse> {
  const base64 = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
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

export async function procesarAudio(transcripcion: string): Promise<ClaudeGastoResponse> {
  // Por ahora usamos el texto directamente
  // En producción podrías usar Whisper para transcribir
  return procesarTexto(transcripcion);
}

// Transcribir audio usando la descripción que da Telegram o un servicio externo
export async function transcribirAudio(audioBuffer: Buffer): Promise<string> {
  // Nota: Claude no puede procesar audio directamente
  // Opciones:
  // 1. Usar OpenAI Whisper API
  // 2. Usar Google Speech-to-Text
  // 3. Usar AssemblyAI
  // Por ahora retornamos un mensaje pidiendo texto
  throw new Error('AUDIO_NOT_SUPPORTED');
}
