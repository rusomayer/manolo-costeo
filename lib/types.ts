export type Categoria = 
  | 'insumos'
  | 'servicios'
  | 'sueldos'
  | 'alquiler'
  | 'impuestos'
  | 'mantenimiento'
  | 'otros';

export interface Gasto {
  id: string;
  created_at: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: Categoria;
  proveedor?: string;
  metodo_pago: string;
  notas?: string;
  telegram_message_id?: string;
  archivo_url?: string;
}

export interface GastoInput {
  descripcion: string;
  monto: number;
  categoria: Categoria;
  proveedor?: string;
  metodo_pago?: string;
  notas?: string;
  fecha?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: TelegramPhoto[];
  voice?: TelegramVoice;
  document?: TelegramDocument;
  caption?: string;
}

export interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface ClaudeGastoResponse {
  descripcion: string;
  monto: number;
  categoria: Categoria;
  proveedor?: string;
  fecha?: string;
  confianza: 'alta' | 'media' | 'baja';
  notas?: string;
}
