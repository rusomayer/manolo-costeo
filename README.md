# ☕ Café Gastos Bot

Bot de Telegram + Dashboard para registrar gastos de tu café enviando fotos, audios, PDFs o texto.

## Stack

- **Next.js 14** - App Router
- **Supabase** - Base de datos PostgreSQL
- **Claude AI** - Procesamiento de facturas y audios
- **Telegram Bot API** - Recepción de mensajes
- **Vercel** - Hosting

## Setup rápido

### 1. Cloná o subí este proyecto a tu repo de GitHub

### 2. Configurá Supabase

Andá a tu proyecto en Supabase → SQL Editor → New Query y ejecutá:

```sql
-- Tabla de gastos
CREATE TABLE gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fecha DATE DEFAULT CURRENT_DATE,
  descripcion TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  categoria TEXT NOT NULL,
  proveedor TEXT,
  metodo_pago TEXT DEFAULT 'efectivo',
  notas TEXT,
  telegram_message_id TEXT,
  archivo_url TEXT
);

-- Índices para consultas rápidas
CREATE INDEX idx_gastos_fecha ON gastos(fecha DESC);
CREATE INDEX idx_gastos_categoria ON gastos(categoria);

-- Categorías válidas
CREATE TYPE categoria_gasto AS ENUM (
  'insumos',
  'servicios', 
  'sueldos',
  'alquiler',
  'impuestos',
  'mantenimiento',
  'otros'
);
```

### 3. Variables de entorno en Vercel

Andá a tu proyecto en Vercel → Settings → Environment Variables y agregá:

```
TELEGRAM_BOT_TOKEN=tu_token_de_botfather
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
ANTHROPIC_API_KEY=tu_api_key_de_claude
```

### 4. Configurá el Webhook de Telegram

Una vez deployado, ejecutá esto (reemplazá con tus datos):

```bash
curl "https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://<TU_PROYECTO>.vercel.app/api/telegram"
```

### 5. ¡Listo!

Mandá un mensaje a tu bot en Telegram y mirá el dashboard en `tuproyecto.vercel.app/dashboard`

## Uso

### Desde Telegram

- **Texto**: "Compré café 5kg a $45.000"
- **Foto**: Mandá una foto de una factura
- **Audio**: Grabá un audio diciendo el gasto
- **PDF**: Mandá un PDF de factura

### Dashboard

- Ver todos los gastos
- Filtrar por categoría y fecha
- Ver totales y gráficos
- Exportar a CSV

## Estructura del proyecto

```
├── app/
│   ├── api/
│   │   └── telegram/route.ts    # Webhook del bot
│   ├── dashboard/page.tsx       # Dashboard de gastos
│   └── page.tsx                 # Redirect al dashboard
├── lib/
│   ├── claude.ts                # Procesamiento con IA
│   ├── supabase.ts              # Cliente de DB
│   ├── telegram.ts              # API de Telegram
│   └── types.ts                 # TypeScript types
```

## Próximos pasos

- [ ] Migrar a WhatsApp Business API
- [ ] Agregar reportes mensuales automáticos
- [ ] Exportar a Excel
- [ ] Integración con contabilidad
