import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatConManolo, MensajeChat } from '@/lib/asistente';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const localId = request.cookies.get('selected_local')?.value;
    if (!localId) return NextResponse.json({ error: 'No hay local seleccionado' }, { status: 400 });

    const { mensajes } = await request.json() as { mensajes: MensajeChat[] };

    if (!mensajes?.length) {
      return NextResponse.json({ error: 'No hay mensajes' }, { status: 400 });
    }

    const respuesta = await chatConManolo(supabase, localId, mensajes);

    return NextResponse.json({ respuesta });
  } catch (error) {
    console.error('Error en asistente:', error);
    return NextResponse.json({ error: 'Error procesando consulta' }, { status: 500 });
  }
}
