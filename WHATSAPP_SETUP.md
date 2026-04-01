# Guía Completa: Integrar WhatsApp Business a Manolo Costeo

## 📋 Checklist de requisitos

Antes de empezar, necesitas:

- ✅ Una **cuenta de Meta Business** (https://business.facebook.com)
- ✅ Un **número de teléfono** que NO estés usando en WhatsApp móvil
- ✅ Una **tarjeta de crédito** válida (para Meta, los primeros $15 USD/mes son gratis)
- ✅ Un **sitio web** con política de privacidad (puede ser un Notion público)
- ✅ Documentación legal: CUIT, razón social, domicilio del negocio

---

## 🚀 Paso 1: Crear Meta Business Account (si no lo tienes)

1. Ve a https://business.facebook.com
2. Click en **"Crear cuenta"**
3. Llena los datos:
   - Nombre de la empresa (ej: "Mi Café")
   - Email
   - País
   - Teléfono
4. Verifica tu email
5. Agrega tu sitio web (debe tener política de privacidad)

---

## 📱 Paso 2: Registrar número de WhatsApp

### 2.1 Crear aplicación en Meta

1. Ve a https://developers.facebook.com
2. Click **"Mis apps"** → **"Crear aplicación"**
3. Selecciona:
   - **Tipo**: Empresarial
   - **Nombre de la app**: "Manolo Costeo WhatsApp"
   - Aceptá los términos
4. Click **"Crear aplicación"**

### 2.2 Agregar el producto WhatsApp

1. Una vez dentro de la app, ve a **"Mis productos"**
2. Click **"Agregar producto"**
3. Busca **"WhatsApp"** y click **"Configurar"**

### 2.3 Configurar el número

1. En el panel de WhatsApp, ve a **"Comenzar"** o **"Configuración"**
2. Click **"Agregar número de teléfono"**
3. Ingresa el número (sin usar en WhatsApp móvil):
   - Formato: +CODIGOPAÍS+NUMERO
   - Ej: +5491123456789
4. Meta te enviará un **SMS con código de verificación**
5. Ingresa el código en la app
6. Completa los datos de verificación empresarial:
   - Nombre del negocio
   - CUIT
   - Domicilio legal

> ⚠️ **Importante**: Meta revisa que sea un negocio real. Puede tardar 24-48 horas.

---

## 🔐 Paso 3: Obtener las credenciales

### 3.1 App ID y App Secret

1. En developers.facebook.com, ve a tu app
2. Ve a **"Settings"** → **"Basic"**
3. Copia y guarda en un lugar seguro:
   - **App ID** (ej: 123456789123456)
   - **App Secret** (no lo compartas nunca!)

### 3.2 Phone Number ID y Access Token

1. En tu app de developers, ve a **"WhatsApp"** → **"Configuration"**
2. Selecciona tu número de teléfono
3. Copia y guarda:
   - **Phone Number ID** (ej: 123456789123456)
   - **Business Account ID** (ej: 987654321987654)
   - **Access Token** (temporal, válido 24 horas)

### 3.3 Generar Access Token permanente

El token que sacaste arriba expira en 24hs. Necesitas uno permanente:

1. Ve a **"Tools"** → **"Token Debugger"**
2. Pega el token temporario
3. Click **"Refresh"** o usa este endpoint (en terminal):

```bash
curl -X GET "https://graph.instagram.com/oauth/authorize?client_id=YOUR_APP_ID&redirect_uri=https://www.localhost.com/&scope=whatsapp_business_messaging,whatsapp_business_management&response_type=code"
```

Alternativa más simple:
1. Ve a **"Tools"** → **"Graph Explorer"**
2. Selecciona tu app
3. Busca `me/accounts`
4. Copia el token que aparece arriba

---

## 🔧 Paso 4: Configurar el webhook

### 4.1 Variables de entorno

En tu proyecto, agrega a `.env.local`:

```bash
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=123456789123456
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789123456
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBAXyZCnZCY...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=tu_token_secreto_ej_abc123xyz

# URL del webhook (cuando deployés a Vercel)
NEXT_PUBLIC_WHATSAPP_WEBHOOK_URL=https://tu-app.vercel.app/api/whatsapp
```

> **Nota**: El `WHATSAPP_WEBHOOK_VERIFY_TOKEN` es un token que vos elegís (ej: `abc123xyz`). Lo necesitarás en el paso siguiente.

### 4.2 Deployar a Vercel

1. Pushea todo a GitHub:
```bash
git add .
git commit -m "Agregar WhatsApp integration"
git push
```

2. En Vercel:
   - Ve a tu proyecto
   - Ve a **Settings** → **Environment Variables**
   - Agrega las variables de arriba
   - Deploy automático debería correr

3. Cuando termine el deploy, copia tu URL de Vercel:
   - Ej: `https://tu-app-xyz.vercel.app`

### 4.3 Registrar el webhook en Meta

1. Ve a tu app en developers.facebook.com
2. En **"WhatsApp"** → **"Configuration"**
3. Ve a **"Webhook"**
4. Click **"Edit"**
5. Llena:
   - **Callback URL**: `https://tu-app-xyz.vercel.app/api/whatsapp`
   - **Verify Token**: el token que elegiste (ej: `abc123xyz`)
6. Click **"Verify and Save"**

Si Meta dice "Verificación fallida":
- Asegurate que el Webhook Verify Token matches lo que pusiste en `.env.local`
- Espera a que Vercel termie el deploy
- Probá de nuevo

---

## 🔗 Paso 5: Vincular número a un local en la app

Una vez que todo funciona, necesitas vincular el número a un local.

### 5.1 Crear tabla `whatsapp_links` en Supabase

Ve a tu proyecto de Supabase → **SQL Editor** → **New Query** y ejecuta:

```sql
CREATE TABLE whatsapp_links (
  phone_number TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE
);
```

### 5.2 Vincular el número a un local

Ejecuta en Supabase SQL Editor:

```sql
INSERT INTO whatsapp_links (phone_number, local_id)
VALUES ('+5491123456789', 'tu-local-uuid')
ON CONFLICT (phone_number) DO UPDATE
SET local_id = 'tu-local-uuid';
```

Reemplaza:
- `+5491123456789` → tu número de WhatsApp
- `tu-local-uuid` → el ID del local (lo encontras en la tabla `locales`)

### 5.3 Actualizar `gastos_pendientes` para WhatsApp

En Supabase SQL Editor:

```sql
-- Agregar columna para WhatsApp si no existe
ALTER TABLE gastos_pendientes
ADD COLUMN wa_phone_number TEXT;

-- Index para búsquedas rápidas
CREATE INDEX idx_gastos_pendientes_wa_phone ON gastos_pendientes(wa_phone_number);
```

---

## ✅ Paso 6: Probar

### 6.1 Enviar un mensaje de prueba

1. Abre WhatsApp en tu celular
2. Busca el número que registraste en Meta
3. Envía un mensaje:
   - **Texto**: "Leche 20L $18.000"
   - **Foto**: Una foto de una factura
   - **Audio**: "Compramos café cinco kilos a cuarenta y cinco mil"
   - **Pregunta**: "¿Cuánto gasté este mes?"

### 6.2 Ver el log

1. Ve a developers.facebook.com → Tu app → **Webhooks** → **Logs**
2. Deberías ver eventos de mensajes entrantes
3. Si hay errores, aparecerán ahí

### 6.3 Debugging en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Deployments** → Click el último deploy
3. Ve a **Functions** (si lo muestra)
4. O usa **Analytics** para ver errores en `/api/whatsapp`

---

## 🎯 Comandos útiles

### Resetear el webhook (si algo se rompió)

```bash
curl -X POST "https://graph.instagram.com/v18.0/PHONE_NUMBER_ID/register" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"messaging_product":"whatsapp"}'
```

### Ver el status del webhook

```bash
curl -X GET "https://graph.instagram.com/v18.0/PHONE_NUMBER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 💰 Costos

- **Primeros $15 USD/mes**: Gratis
- **Después**: Basado en mensajes. Ej: mensaje de texto = ~$0.004

El pricing depende del país destino. Mirá: https://www.whatsapp.com/business/pricing/

---

## 🐛 Troubleshooting

### "Verificación fallida"
- ✅ Verificá que el Verify Token en Supabase matches el de `.env.local`
- ✅ Espera a que termine el deploy en Vercel
- ✅ Probá de nuevo

### "Número no verificado"
- ✅ Meta tarda 24-48hs en verificar números nuevos
- ✅ Mientras tanto, puedes testear en modo development (solo tú)
- ✅ Revisa tu email, puede que Meta pida más documentos

### "Webhook recibe mensajes pero no responde"
- ✅ Mirá los logs en Vercel
- ✅ Asegurate que el local_id existe en `whatsapp_links`
- ✅ Verifica que el Access Token siga siendo válido
- ✅ Si el token expiró, genera uno nuevo

### "No recibo respuestas"
- ✅ El bot responde directo en WhatsApp, sin entrar a la app
- ✅ Espera 1-2 segundos (puede haber latencia)
- ✅ Si nada, revisa los logs de Vercel

---

## 📚 Recursos útiles

- **Docs de Meta WhatsApp Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api/
- **Pricing**: https://www.whatsapp.com/business/pricing/
- **Status de la API**: https://status.cloud.meta.com/

---

## 🎉 ¡Listo!

Una vez que todo funcione, tu bot responderá en WhatsApp igual que en Telegram:

- ✅ Registra gastos automáticamente (texto, foto, PDF, audio)
- ✅ Responde preguntas usando el Asistente Manolo
- ✅ Guarda todo en la base de datos de Manolo Costeo
- ✅ Aparece en el dashboard

¡Felicitaciones! 🚀
