import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Sos Manolo, un asistente experto en costos gastronómicos para cafés, bares y restaurantes.
Tenés acceso a herramientas para consultar la base de datos del local del usuario.

REGLAS:
- Respondé de forma concisa, útil y con datos concretos
- Usá formato de moneda argentina (ARS), ej: $45.000
- Si te preguntan algo que no podés calcular con los datos disponibles, decilo honestamente
- Podés hacer cálculos, comparaciones, y dar recomendaciones
- Usá las herramientas para obtener datos antes de responder
- Si el usuario pregunta por un período, usá las fechas apropiadas
- Hoy es ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
- Sé amigable pero profesional. Tuteá al usuario.
- Cuando muestres montos grandes, redondeá a enteros
- Si hay tendencias interesantes en los datos, mencionalas proactivamente`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'consultar_gastos',
    description: 'Busca gastos registrados. Podés filtrar por período, categoría y proveedor.',
    input_schema: {
      type: 'object' as const,
      properties: {
        desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
        hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        categoria: { type: 'string', description: 'insumos, servicios, sueldos, alquiler, impuestos, mantenimiento, otros' },
        proveedor: { type: 'string', description: 'Nombre del proveedor (búsqueda parcial)' },
        limit: { type: 'number', description: 'Máximo de resultados (default 50)' },
      },
    },
  },
  {
    name: 'resumen_periodo',
    description: 'Obtiene un resumen de gastos: total, desglose por categoría y por tipo (fijo/variable).',
    input_schema: {
      type: 'object' as const,
      properties: {
        desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
        hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        categoria: { type: 'string', description: 'Filtrar por categoría específica' },
      },
    },
  },
  {
    name: 'consultar_precios',
    description: 'Busca historial de precios de productos. Útil para saber cuánto se paga por un insumo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        producto: { type: 'string', description: 'Nombre del producto (búsqueda parcial). Ej: leche, café, azúcar' },
        proveedor: { type: 'string', description: 'Filtrar por proveedor específico' },
        limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
  },
  {
    name: 'calcular_costo_receta',
    description: 'Calcula el costo actual de una receta/plato basándose en los últimos precios registrados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        nombre_receta: { type: 'string', description: 'Nombre de la receta (búsqueda parcial)' },
      },
      required: ['nombre_receta'],
    },
  },
  {
    name: 'listar_proveedores',
    description: 'Lista todos los proveedores registrados del local.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'comparar_periodos',
    description: 'Compara gastos entre dos períodos para ver tendencias.',
    input_schema: {
      type: 'object' as const,
      properties: {
        periodo1_desde: { type: 'string', description: 'Inicio del primer período YYYY-MM-DD' },
        periodo1_hasta: { type: 'string', description: 'Fin del primer período YYYY-MM-DD' },
        periodo2_desde: { type: 'string', description: 'Inicio del segundo período YYYY-MM-DD' },
        periodo2_hasta: { type: 'string', description: 'Fin del segundo período YYYY-MM-DD' },
      },
      required: ['periodo1_desde', 'periodo1_hasta', 'periodo2_desde', 'periodo2_hasta'],
    },
  },
];

// Tool execution functions
async function ejecutarHerramienta(
  client: SupabaseClient,
  localId: string,
  toolName: string,
  input: any
): Promise<string> {
  switch (toolName) {
    case 'consultar_gastos': {
      let query = client
        .from('gastos')
        .select('*')
        .eq('local_id', localId)
        .order('fecha', { ascending: false })
        .limit(input.limit || 50);

      if (input.desde) query = query.gte('fecha', input.desde);
      if (input.hasta) query = query.lte('fecha', input.hasta);
      if (input.categoria) query = query.eq('categoria', input.categoria);
      if (input.proveedor) query = query.ilike('proveedor', `%${input.proveedor}%`);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        cantidad: data?.length || 0,
        gastos: (data || []).map(g => ({
          fecha: g.fecha,
          descripcion: g.descripcion,
          monto: g.monto,
          categoria: g.categoria,
          proveedor: g.proveedor,
          cantidad: g.cantidad,
          unidad: g.unidad,
          tipo_gasto: g.tipo_gasto,
        })),
      });
    }

    case 'resumen_periodo': {
      let query = client
        .from('gastos')
        .select('*')
        .eq('local_id', localId);

      if (input.desde) query = query.gte('fecha', input.desde);
      if (input.hasta) query = query.lte('fecha', input.hasta);
      if (input.categoria) query = query.eq('categoria', input.categoria);

      const { data: gastos } = await query;

      const porCategoria: Record<string, number> = {};
      const porTipo: Record<string, number> = { fijo: 0, variable: 0 };
      const porProveedor: Record<string, number> = {};
      let total = 0;

      for (const g of gastos || []) {
        total += Number(g.monto);
        porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.monto);
        porTipo[g.tipo_gasto || 'variable'] += Number(g.monto);
        if (g.proveedor) {
          porProveedor[g.proveedor] = (porProveedor[g.proveedor] || 0) + Number(g.monto);
        }
      }

      return JSON.stringify({
        total,
        cantidad: gastos?.length || 0,
        porCategoria,
        porTipo,
        topProveedores: Object.entries(porProveedor)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([nombre, monto]) => ({ nombre, monto })),
      });
    }

    case 'consultar_precios': {
      let query = client
        .from('precios_productos')
        .select('*, proveedores(nombre)')
        .eq('local_id', localId)
        .order('fecha', { ascending: false })
        .limit(input.limit || 20);

      if (input.producto) query = query.ilike('producto', `%${input.producto}%`);

      const { data } = await query;

      return JSON.stringify({
        precios: (data || []).map((p: any) => ({
          producto: p.producto,
          precio: p.precio,
          cantidad: p.cantidad,
          unidad: p.unidad,
          precio_por_unidad: p.precio_por_unidad,
          fecha: p.fecha,
          proveedor: p.proveedores?.nombre,
        })),
      });
    }

    case 'calcular_costo_receta': {
      const { data: recetas } = await client
        .from('recetas')
        .select('*')
        .eq('local_id', localId)
        .ilike('nombre', `%${input.nombre_receta}%`)
        .limit(1);

      if (!recetas?.length) return JSON.stringify({ error: 'Receta no encontrada' });

      const receta = recetas[0];
      const { data: ingredientes } = await client
        .from('receta_ingredientes')
        .select('*')
        .eq('receta_id', receta.id);

      let costoTotal = 0;
      const detalles = [];

      for (const ing of ingredientes || []) {
        const { data: precio } = await client
          .from('precios_productos')
          .select('precio_por_unidad, proveedores(nombre)')
          .eq('local_id', localId)
          .ilike('producto', `%${ing.producto}%`)
          .eq('unidad', ing.unidad)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle();

        let costo = 0;
        let fuente = 'sin_dato';

        if (precio?.precio_por_unidad) {
          costo = precio.precio_por_unidad * ing.cantidad;
          fuente = 'precio_registrado';
        } else if (ing.costo_override) {
          costo = ing.costo_override;
          fuente = 'costo_manual';
        }

        costoTotal += costo;
        detalles.push({
          producto: ing.producto,
          cantidad: ing.cantidad,
          unidad: ing.unidad,
          costo,
          fuente,
        });
      }

      return JSON.stringify({
        receta: receta.nombre,
        porciones: receta.porciones,
        costoTotal,
        costoPorPorcion: costoTotal / (receta.porciones || 1),
        precioVenta: receta.precio_venta,
        margen: receta.precio_venta ? receta.precio_venta - (costoTotal / (receta.porciones || 1)) : null,
        foodCostPct: receta.precio_venta ? (costoTotal / (receta.porciones || 1)) / receta.precio_venta * 100 : null,
        ingredientes: detalles,
      });
    }

    case 'listar_proveedores': {
      const { data } = await client
        .from('proveedores')
        .select('*')
        .eq('local_id', localId)
        .order('nombre');

      return JSON.stringify({
        proveedores: (data || []).map(p => ({
          nombre: p.nombre,
          contacto: p.contacto,
          notas: p.notas,
        })),
      });
    }

    case 'comparar_periodos': {
      const fetchPeriodo = async (desde: string, hasta: string) => {
        const { data } = await client
          .from('gastos')
          .select('*')
          .eq('local_id', localId)
          .gte('fecha', desde)
          .lte('fecha', hasta);

        const porCategoria: Record<string, number> = {};
        let total = 0;
        for (const g of data || []) {
          total += Number(g.monto);
          porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.monto);
        }
        return { total, cantidad: data?.length || 0, porCategoria };
      };

      const [p1, p2] = await Promise.all([
        fetchPeriodo(input.periodo1_desde, input.periodo1_hasta),
        fetchPeriodo(input.periodo2_desde, input.periodo2_hasta),
      ]);

      const diferencia = p2.total - p1.total;
      const variacionPct = p1.total > 0 ? (diferencia / p1.total * 100) : 0;

      return JSON.stringify({
        periodo1: { desde: input.periodo1_desde, hasta: input.periodo1_hasta, ...p1 },
        periodo2: { desde: input.periodo2_desde, hasta: input.periodo2_hasta, ...p2 },
        diferencia,
        variacionPct,
      });
    }

    default:
      return JSON.stringify({ error: 'Herramienta no encontrada' });
  }
}

export interface MensajeChat {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatConManolo(
  client: SupabaseClient,
  localId: string,
  mensajes: MensajeChat[]
): Promise<string> {
  // Build messages for Claude API
  const claudeMessages: Anthropic.MessageParam[] = mensajes.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages: claudeMessages,
  });

  // Tool use loop
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (response.stop_reason === 'tool_use' && iterations < MAX_ITERATIONS) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ContentBlockParam & { type: 'tool_use'; id: string; name: string; input: any } =>
        block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const result = await ejecutarHerramienta(client, localId, toolUse.name, toolUse.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    claudeMessages.push({
      role: 'assistant',
      content: response.content as any,
    });

    claudeMessages.push({
      role: 'user',
      content: toolResults,
    });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: claudeMessages,
    });
  }

  // Extract text response
  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : 'No pude procesar tu consulta. Intentá reformularla.';
}

/**
 * Version simplificada para Telegram: recibe una sola pregunta (sin historial).
 * Usa cualquier SupabaseClient (incluido service client).
 */
export async function consultaManolo(
  client: SupabaseClient,
  localId: string,
  pregunta: string
): Promise<string> {
  return chatConManolo(client, localId, [{ role: 'user', content: pregunta }]);
}
