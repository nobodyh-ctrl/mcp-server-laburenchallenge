# 🔧 Configuración del Webhook de Chatwoot

## 📋 Checklist de Configuración

### 1️⃣ Agregar Variables de Entorno

Editá tu archivo `wrangler.toml` o configurá las variables en Cloudflare Dashboard:

```toml
[vars]
CHATWOOT_URL = "https://crm.chatsappai.com"
CHATWOOT_ACCOUNT_ID = "1"  # Tu account ID de Chatwoot

[secrets]
# Ejecutar en terminal:
# wrangler secret put CHATWOOT_API_TOKEN
```

Para configurar el token secreto:
```bash
wrangler secret put CHATWOOT_API_TOKEN
# Pegá tu Platform App Token de Chatwoot
```

**¿Dónde conseguir el token?**
1. Ir a Chatwoot → Settings → Applications
2. Crear nueva "Platform App" (o usar existente)
3. Copiar el "Platform App Token"

---

### 2️⃣ Configurar el Webhook en Chatwoot

1. En Chatwoot, ir a: **Settings → Webhooks**
2. Click en **Add webhook**
3. Configurar:
   - **URL**: `https://mcp-server-laburenchallenge.facundodiaz2727.workers.dev/api/chatwoot/webhook`
   - **Eventos a seleccionar**:
     - ✅ `message_created`
     - ✅ `conversation_created` (opcional)
   - **Guardar**

---

### 3️⃣ Desplegar a Cloudflare

```bash
npm run deploy
# o
wrangler deploy
```

---

### 4️⃣ Probar el Webhook

#### Test 1: Verificar que el endpoint responde
```bash
curl -X POST https://mcp-server-laburenchallenge.facundodiaz2727.workers.dev/api/chatwoot/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "message_type": "incoming",
    "content": "Hola, test!",
    "conversation": {"id": 1},
    "sender": {"name": "Test User"}
  }'
```

Deberías recibir: `200 OK`

#### Test 2: Enviar mensaje real desde WhatsApp
1. Enviar mensaje a tu número de WhatsApp conectado a Chatwoot
2. Ver logs en Cloudflare:
   ```bash
   wrangler tail
   ```
3. Verificar que el agente responde en Chatwoot

---

## 🏗️ Arquitectura del Flujo

```
WhatsApp
  ↓
Chatwoot Inbox (recibe mensaje)
  ↓
Webhook POST → /api/chatwoot/webhook
  ↓
handleChatwootWebhook (filtra solo incoming)
  ↓
[TODO: Invocar MCP Agent aquí]
  ↓
sendChatwootMessage (envía respuesta)
  ↓
Chatwoot → WhatsApp
```

---

## 📝 Próximos Pasos (Integración con MCP)

Actualmente, el webhook solo responde con un mensaje de prueba. Para integrarlo con tu agente MCP, necesitás:

### Opción 1: Invocar el MCP Agent desde el webhook

Modificar `src/api/chatwoot.ts` en la función `handleChatwootWebhook`:

```typescript
// En lugar de la respuesta de prueba actual:
const respuesta = `Hola ${senderName}! Recibí tu mensaje...`;

// Hacer esto:
const mcpResponse = await invocarAgenteMCP(messageContent, conversationId, env);
const respuesta = mcpResponse.content;
```

### Opción 2: Usar las tools del MCP desde el webhook

```typescript
import { createSupabaseClient } from "../config/supabase";

// Dentro de handleChatwootWebhook:
const supabase = createSupabaseClient(env);

// Ejemplo: obtener o crear cliente
const clientResponse = await fetch(`${baseUrl}/api/clients/get-or-create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: senderName,
    email: senderEmail || `${conversationId}@temp.com`
  })
});

const { clientId, cartId } = await clientResponse.json();

// Guardar en custom attributes de Chatwoot
await fetch(
  `${env.CHATWOOT_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/custom_attributes`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api_access_token": env.CHATWOOT_API_TOKEN
    },
    body: JSON.stringify({
      custom_attributes: {
        client_id: clientId,
        cart_id: cartId
      }
    })
  }
);
```

---

## 🛠️ Funciones Auxiliares Disponibles

Ya están implementadas en `src/api/chatwoot.ts`:

### `sendChatwootMessage(conversationId, content, env)`
Envía un mensaje desde el agente al cliente.

### `addConversationLabels(conversationId, labels, env)`
Agrega etiquetas a la conversación (ej: `["venta_completada", "producto_camisa"]`).

### `updateConversationStatus(conversationId, status, env)`
Cambia el estado de la conversación: `"open"`, `"resolved"`, `"pending"`.

---

## ⚠️ Errores Comunes y Soluciones

### Error: "Webhook no recibe eventos"
- ✅ Verificar que la URL del webhook esté bien configurada en Chatwoot
- ✅ Verificar que el worker esté desplegado: `wrangler deploy`
- ✅ Verificar logs: `wrangler tail`

### Error: "401 Unauthorized al enviar mensaje"
- ✅ Verificar que `CHATWOOT_API_TOKEN` esté configurado como secret
- ✅ Verificar que sea un **Platform App Token**, no un Access Token de usuario

### Error: "Loop infinito de mensajes"
- ✅ Verificar que el filtro `message_type === "incoming"` esté funcionando
- ✅ NO responder a mensajes de tipo `"outgoing"`, `"activity"`, o `"private"`

### Error: "Mensaje no llega a WhatsApp"
- ✅ Verificar que `message_type: "outgoing"` esté en el body
- ✅ Verificar que `private: false` esté configurado

---

## 🧪 Testing Local

Para probar localmente antes de desplegar:

```bash
wrangler dev
```

Luego usar ngrok para exponer el puerto:
```bash
ngrok http 8787
```

Y configurar el webhook en Chatwoot con la URL de ngrok temporalmente.

---

## 📊 Monitoreo

Ver logs en tiempo real:
```bash
wrangler tail --format pretty
```

Ver métricas en Cloudflare Dashboard:
- Workers → mcp-server-laburenchallenge → Metrics
