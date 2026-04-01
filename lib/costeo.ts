import { SupabaseClient } from '@supabase/supabase-js';
import { RecetaIngrediente } from './types';

export interface CostoIngrediente {
  producto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number | null;
  costoLinea: number | null;
  fuente: 'precio_registrado' | 'costo_manual' | 'sin_dato';
  fechaPrecio?: string;
  proveedor?: string;
}

export interface CostoReceta {
  costoTotal: number;
  costoPorPorcion: number;
  porciones: number;
  precioVenta?: number;
  margenBruto?: number;
  foodCostPct?: number;
  ingredientes: CostoIngrediente[];
  sinDatos: string[];
}

export async function calcularCostoReceta(
  client: SupabaseClient,
  recetaId: string,
  localId: string
): Promise<CostoReceta> {
  // Obtener receta
  const { data: receta, error: recetaError } = await client
    .from('recetas')
    .select('*')
    .eq('id', recetaId)
    .eq('local_id', localId)
    .single();

  if (recetaError || !receta) {
    throw new Error('Receta no encontrada');
  }

  // Obtener ingredientes
  const { data: ingredientes, error: ingError } = await client
    .from('receta_ingredientes')
    .select('*')
    .eq('receta_id', recetaId);

  if (ingError) throw ingError;

  const ingredientesResult: CostoIngrediente[] = [];
  const sinDatos: string[] = [];
  let costoTotal = 0;

  for (const ing of (ingredientes || []) as RecetaIngrediente[]) {
    // Intentar encontrar precio registrado
    const { data: precioData } = await client
      .from('precios_productos')
      .select('precio_por_unidad, fecha, proveedores(nombre)')
      .eq('local_id', localId)
      .ilike('producto', `%${ing.producto}%`)
      .eq('unidad', ing.unidad)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    let precioUnitario: number | null = null;
    let costoLinea: number | null = null;
    let fuente: CostoIngrediente['fuente'] = 'sin_dato';
    let fechaPrecio: string | undefined;
    let proveedor: string | undefined;

    if (precioData?.precio_por_unidad) {
      precioUnitario = Number(precioData.precio_por_unidad);
      costoLinea = precioUnitario * ing.cantidad;
      fuente = 'precio_registrado';
      fechaPrecio = precioData.fecha;
      proveedor = (precioData as any).proveedores?.nombre;
    } else if (ing.costo_override) {
      // Costo override es el costo total por la cantidad del ingrediente
      costoLinea = ing.costo_override;
      precioUnitario = ing.costo_override / ing.cantidad;
      fuente = 'costo_manual';
    } else {
      sinDatos.push(ing.producto);
    }

    if (costoLinea) {
      costoTotal += costoLinea;
    }

    ingredientesResult.push({
      producto: ing.producto,
      cantidad: ing.cantidad,
      unidad: ing.unidad,
      precioUnitario,
      costoLinea,
      fuente,
      fechaPrecio,
      proveedor,
    });
  }

  const porciones = receta.porciones || 1;
  const costoPorPorcion = costoTotal / porciones;

  const result: CostoReceta = {
    costoTotal,
    costoPorPorcion,
    porciones,
    ingredientes: ingredientesResult,
    sinDatos,
  };

  if (receta.precio_venta) {
    result.precioVenta = receta.precio_venta;
    result.margenBruto = receta.precio_venta - costoPorPorcion;
    result.foodCostPct = costoPorPorcion > 0 ? (costoPorPorcion / receta.precio_venta) * 100 : 0;
  }

  return result;
}
