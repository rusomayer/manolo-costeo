const WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0';

export async function enviarMensajeWA(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  mensaje: string
): Promise<{ message_id: string }> {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: mensaje },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${error.error?.message}`);
  }

  const data = await response.json();
  return { message_id: data.messages[0].id };
}

export async function obtenerArchivoWA(
  accessToken: string,
  mediaId: string
): Promise<{ url: string; buffer: Buffer; mimeType: string }> {
  // Step 1: Get the media URL
  const infoResponse = await fetch(
    `${WHATSAPP_API_URL}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!infoResponse.ok) {
    throw new Error('No se pudo obtener info del archivo');
  }

  const mediaInfo = await infoResponse.json();
  const mediaUrl = mediaInfo.url;
  const mimeType = mediaInfo.mime_type || 'application/octet-stream';

  // Step 2: Download the file
  const downloadResponse = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadResponse.ok) {
    throw new Error('No se pudo descargar el archivo');
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { url: mediaUrl, buffer, mimeType };
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
  };
  document?: {
    id: string;
    mime_type: string;
    filename: string;
  };
  audio?: {
    id: string;
    mime_type: string;
  };
  video?: {
    id: string;
    mime_type: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export function parseWhatsAppMessage(payload: WhatsAppWebhookPayload): WhatsAppMessage | null {
  try {
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    return message || null;
  } catch {
    return null;
  }
}
