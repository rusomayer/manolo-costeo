# Guía: Configurar Twilio Sandbox para WhatsApp Testing

## Paso 1: Aceptar términos en Twilio

1. En la pantalla que ves, checkbox: **"I acknowledge and agree..."**
2. Click **"Confirm"**

---

## Paso 2: Copiar credenciales de Twilio

Una vez confirmado, Twilio te dará:

1. **Account SID** (en Twilio Console → Account Info)
2. **Auth Token** (en Twilio Console → Account Info)
3. **Twilio WhatsApp Sandbox Number** (ej: +1 (415) 523-8886)
4. **Sandbox Code** para vincular tu WhatsApp (ej: "join apple-pie")

Copia todo esto.

---

## Paso 3: Agregar variables a `.env.local`

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+1415523XXXX  # El número sandbox de Twilio
```

---

## Paso 4: Crear tabla en Supabase (para vincular números)

En Supabase SQL Editor:

```sql
-- Tabla para vincular números de Twilio
CREATE TABLE twilio_links (
  phone_number TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);

-- Agregar columna a gastos_pendientes si no existe
ALTER TABLE gastos_pendientes
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;

CREATE INDEX idx_gastos_pendientes_twilio ON gastos_pendientes(twilio_phone_number);
```

---

## Paso 5: Vincular tu WhatsApp a Twilio Sandbox

1. **En tu WhatsApp personal**, abre un chat
2. **Busca el número de Twilio** que obtuviste (ej: +1 (415) 523-8886)
3. **Envía el mensaje**: `join apple-pie` (o el código que Twilio te dió)
4. **Recibirás confirmación**: "You are now connected to the Twilio Sandbox for WhatsApp"

---

## Paso 6: Deploy a Vercel

1. Pushea los cambios:
```bash
git add .
git commit -m "Agregar Twilio WhatsApp integration"
git push
```

2. En Vercel:
   - Settings → Environment Variables
   - Agrega las 3 variables de arriba
   - Deploy automático

3. Copia tu URL:
   - Ej: `https://tu-app-xyz.vercel.app`

---

## Paso 7: Configurar webhook en Twilio

1. Ve a https://console.twilio.com
2. **Messaging** → **Services** → **Sandbox Configuration**
3. En **When a message comes in**, cambia la URL a:
   ```
   https://tu-app-xyz.vercel.app/api/twilio-whatsapp
   ```
4. Método: **POST**
5. Click **Save**

---

## Paso 8: ¡Listo! Testea

1. En tu WhatsApp, envía un mensaje al número de Twilio:
   ```
   Leche 20L $18.000
   ```

2. Deberías recibir respuesta:
   ```
   ✅ Registrado

   ☕ Leche 20L
   💰 $18.000
   📁 Insumos
   ```

3. Ahora probá una consulta:
   ```
   ¿Cuánto gasté este mes?
   ```

4. Deberías recibir:
   ```
   🤖 Manolo dice:

   [respuesta del asistente con datos reales]
   ```

---

## Troubleshooting

**"El bot no responde"**
- ✅ Verifica que el webhook URL es correcto en Twilio
- ✅ Mira los logs en Vercel
- ✅ Asegurate que el local_id existe en `twilio_links`

**"Dice que no está vinculado"**
- ✅ El código auto-vincula al primer local, pero si tienes múltiples locales, especifica uno en SQL:
```sql
INSERT INTO twilio_links (phone_number, local_id)
VALUES ('+5491123456789', 'tu-local-uuid');
```

**"Mensajes de error en Twilio"**
- ✅ Revisa los logs de Twilio en Console → Monitor → Logs

---

## Cuando quieras pasar a producción

En ese momento:
1. Compra línea prepaga ($200 pesos) O número Twilio ($1-10/mes)
2. Registra en Meta Business
3. Cambias el webhook a `/api/whatsapp` (Meta, no Twilio)
4. Actualiza las credenciales
5. ¡Listo!

El código de Manolo sigue igual, solo cambia el "canal" de entrada.
