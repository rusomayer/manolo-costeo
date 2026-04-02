export type Categoria =
  | 'insumos'
  | 'servicios'
  | 'sueldos'
  | 'alquiler'
  | 'impuestos'
  | 'mantenimiento'
  | 'otros';

export type TipoGasto = 'fijo' | 'variable';

export interface HorarioDia {
  abierto: boolean;
  abre: string;
  cierra: string;
}

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
export type Horarios = Record<DiaSemana, HorarioDia>;

export interface RolEmpleado {
  rol: string;
  cantidad: number;
}

export interface HorarioRango {
  id: string;
  desde: DiaSemana;
  hasta: DiaSemana;
  abre: string;
  cierra: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  rol: string;
  sueldo_neto?: number;
  horas_jornada?: number;
  dias: DiaSemana[];
  jornada: 'completa' | 'media' | 'personalizada';
  es_yo: boolean;
}

export interface Local {
  id: string;
  created_at: string;
  nombre: string;
  direccion?: string;
  owner_id: string;
  telegram_code: string;
  timezone: string;
  // Mi Local - datos básicos
  tipo_local?: string;
  ubicacion_url?: string;
  telefono?: string;
  // Mi Local - espacio
  superficie?: number;
  cantidad_mesas?: number;
  mesas_terraza?: number;
  capacidad_personas?: number;
  // Mi Local - operaciones
  cantidad_turnos?: number;
  empleados_por_turno?: number;
  rotacion_mesa?: number;
  roles_empleados?: RolEmpleado[];
  horarios?: Horarios;
  horario_apertura?: HorarioRango[];
  empleados?: Empleado[];
  // Mi Local - costos fijos
  alquiler_mensual?: number;
  costo_luz?: number;
  costo_gas?: number;
  costo_agua?: number;
  costo_internet?: number;
  costo_seguro?: number;
  costo_delivery_comision?: number;
  // Mi Local - objetivos
  ticket_promedio?: number;
  food_cost_objetivo?: number;
  meta_ventas_mensual?: number;
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

// --- Proveedores ---

export interface Proveedor {
  id: string;
  created_at: string;
  nombre: string;
  contacto?: string;
  notas?: string;
  local_id: string;
}

export interface ProveedorInput {
  nombre: string;
  contacto?: string;
  notas?: string;
}

// --- Precios de productos ---

export interface PrecioProducto {
  id: string;
  created_at: string;
  producto: string;
  proveedor_id?: string;
  proveedor_nombre?: string; // joined
  precio: number;
  cantidad: number;
  unidad: string;
  precio_por_unidad: number;
  fecha: string;
  local_id: string;
}

export interface PrecioProductoInput {
  producto: string;
  proveedor_id?: string;
  precio: number;
  cantidad: number;
  unidad: string;
  fecha?: string;
}

// --- Recetas ---

export interface Receta {
  id: string;
  created_at: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  porciones: number;
  precio_venta?: number;
  local_id: string;
}

export interface RecetaInput {
  nombre: string;
  descripcion?: string;
  categoria?: string;
  porciones?: number;
  precio_venta?: number;
}

export interface RecetaIngrediente {
  id: string;
  receta_id: string;
  producto: string;
  cantidad: number;
  unidad: string;
  costo_override?: number;
}

export interface RecetaIngredienteInput {
  producto: string;
  cantidad: number;
  unidad: string;
  costo_override?: number;
}

// --- Claude responses ---

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
    campo: 'cantidad_unidad';
    pregunta: string;
  }[];
}
