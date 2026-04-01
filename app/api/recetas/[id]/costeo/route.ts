import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calcularCostoReceta } from '@/lib/costeo';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const costeo = await calcularCostoReceta(supabase, params.id, localId);
    return NextResponse.json(costeo);
  } catch (error) {
    console.error('Error calculando costeo:', error);
    return NextResponse.json({ error: 'Error calculando costeo' }, { status: 500 });
  }
}
