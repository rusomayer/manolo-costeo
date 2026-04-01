export type Categoria =
  | 'insumos'
  | 'servicios'
  | 'sueldos'
  | 'alquiler'
  | 'impuestos'
  | 'mantenimiento'
  | 'otros';

export type TipoGasto = 'fijo' | 'variable';

export interface Local {
  id: string;
  created_at: string;
  nombre: string;
  direccion?: string;
  owner_id: string;
  telegram_code: string;
  timezone: string;
}

export interface LocalMember {
  id: string;
  created_at: string;
  local_id: string;
  user_id: string;
  rol: 'owner' | 'miembro';
}

export interface Invitation {
  id: string;
  created_at: string;
  local_id: string;
  codigo: string;
  tipo: 'link' | 'email';
  email?: string;
  estado: 'pending' | 'accepted' | 'expired';
  created_by: string;
  expires_at: string;
}

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
  cantidad?: number;
  unidad?: string;
  telegram_message_id?: string;
  archivo_url?: string;
  local_id?: string;
  tipo_gasto?: TipoGasto;
}

export interface GastoInput {
  descripcion: string;
  monto: number;
  categoria: Categoria;
  proveedor?: string;
  metodo_pago?: string;
  notas?: string;
  fecha?: string;
  cantidad?: number;
  unidad?: string;
  tipo_gasto?: TipoGasto;
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
  reply_to_message?: {
    message_id: number;
    from?: { id: number; is_bot?: boolean };
  };
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
  cantidad?: number;
  unidad?: string;
  tipo_gasto?: TipoGasto;
  campos_faltantes?: {
    campo: 'cantidad_unidad' | 'fecha';
    pregunta: string;
  }[];
}
