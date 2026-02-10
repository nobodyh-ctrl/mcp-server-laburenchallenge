# Servidor MCP de E-commerce con Integración Chatwoot

Un servidor Model Context Protocol (MCP) listo para producción, desplegado en Cloudflare Workers, diseñado para agentes de IA con capacidades de e-commerce y integración perfecta con WhatsApp a través de Chatwoot.

## Tabla de Contenidos

- [Resumen](#resumen)
- [Arquitectura](#arquitectura)
- [Características](#características)
- [Esquema de Base de Datos](#esquema-de-base-de-datos)
- [Flujo del Sistema](#flujo-del-sistema)
- [Endpoints de API](#endpoints-de-api)
- [Herramientas MCP](#herramientas-mcp)
- [Instalación y Despliegue](#instalación-y-despliegue)
- [Configuración](#configuración)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Solución de Problemas](#solución-de-problemas)

---

## Resumen

Este servidor MCP permite a agentes de IA gestionar operaciones de e-commerce a través de WhatsApp, integrándose con Chatwoot para la comunicación con clientes y Supabase para la persistencia de datos. El sistema proporciona un conjunto completo de herramientas de e-commerce incluyendo navegación de productos, gestión de carritos y seguimiento de clientes.

### Tecnologías Clave

- **Cloudflare Workers**: Plataforma de despliegue serverless
- **MCP (Model Context Protocol)**: Interfaz de herramientas para agentes de IA
- **Supabase**: Base de datos PostgreSQL con API REST
- **Chatwoot**: Plataforma de engagement con clientes
- **WhatsApp Business API**: Canal de comunicación con clientes

---

## Arquitectura

### Arquitectura de Alto Nivel

```
┌─────────────┐
│  WhatsApp   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Chatwoot      │
│   (Inbox)       │
└────────┬────────┘
         │ Webhook de Automation Rule
         ▼
┌──────────────────────────────┐
│  Cloudflare Worker           │
│  (Adaptador de Webhook)      │
│  /api/chatwoot/webhook       │
└────────┬─────────────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐          ┌────────────────┐
│  Agente Laburen │          │   Supabase     │
│  (dashboard)    │          │  (Base Datos)  │
└────────┬────────┘          └────────────────┘
         │
         │ Se conecta a
         ▼
┌──────────────────────────────┐
│  Servidor MCP                │
│  /mcp                        │
│                              │
│  Herramientas:               │
│  - list_products             │
│  - get_product_details       │
│  - get_or_create_client      │
│  - create_cart               │
│  - add_to_cart               │
│  - get_cart                  │
│  - update_cart_item          │
│  - remove_from_cart          │
│  - request_human_agent       │
└──────────────────────────────┘
```

### Responsabilidades de Componentes

| Componente | Responsabilidad |
|-----------|---------------|
| **WhatsApp** | Canal de comunicación con clientes |
| **Chatwoot** | CRM, enrutamiento de mensajes, gestión de conversaciones |
| **Adaptador de Webhook** | Recibe eventos de Chatwoot, llama al agente, envía respuestas a Chatwoot |
| **Agente Laburen** | Agente de IA que procesa mensajes y usa herramientas MCP |
| **Servidor MCP** | Proporciona herramientas de e-commerce al agente |
| **Supabase** | Persistencia de datos (productos, carritos, clientes) |

---

## Características

### Operaciones de E-commerce
- **Gestión de Productos**: Navegar productos con variantes (colores, talles, stock)
- **Gestión de Carritos**: Crear, actualizar y administrar carritos de compra
- **Gestión de Clientes**: Seguimiento de clientes por email y teléfono
- **Control de Inventario**: Disponibilidad de stock en tiempo real
- **Etiquetado Automático**: Agregar etiquetas en Chatwoot según tipo de prenda agregada al carrito

### Capacidades de Integración
- **WhatsApp Business**: Comunicación nativa con clientes
- **CRM Chatwoot**: Historial de conversaciones y datos de clientes
- **Soporte para Agentes IA**: Interfaz completa de herramientas MCP
- **API REST**: Endpoints HTTP alternativos para documentación
- **Transferencia a Humanos**: Sistema de handoff de bot a agente humano con categorización de motivos

### Características Técnicas
- **Soporte UUID**: Identificadores de carrito amigables con privacidad
- **Formato Dual de ID**: Maneja identificadores tanto numéricos como UUID
- **Manejo de Errores**: Respaldos elegantes para todas las operaciones
- **Logging**: Logs de depuración completos vía Cloudflare

---

## Esquema de Base de Datos

### Diagrama de Relaciones de Entidades

```
┌─────────────┐
│  products   │
├─────────────┤
│ id (PK)     │
│ name        │
│ description │
│ price       │
│ created_at  │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ product_variants │
├──────────────────┤
│ id (PK)          │
│ product_id (FK)  │◄───┐
│ color_id (FK)    │    │
│ size_id (FK)     │    │
│ stock            │    │
└────────┬─────────┘    │
         │              │
         │              │
    ┌────┴────┐    ┌────┴────┐
    │ colors  │    │  sizes  │
    ├─────────┤    ├─────────┤
    │ id (PK) │    │ id (PK) │
    │ name    │    │ name    │
    └─────────┘    └─────────┘

┌─────────────┐
│   clients   │
├─────────────┤
│ id (PK)     │
│ email       │
│ phone       │
│ created_at  │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│    carts    │
├─────────────┤
│ id (UUID PK)│
│ client_id   │
│ created_at  │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│   cart_items     │
├──────────────────┤
│ id (PK)          │
│ cart_id (FK)     │
│ product_var...   │
│ quantity         │
│ price_at_add     │
└──────────────────┘
```

### Descripción de Tablas

#### `products`
Información central de productos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | integer | Clave primaria |
| name | text | Nombre del producto |
| description | text | Descripción del producto |
| price | numeric | Precio base |
| garment_type_id | integer | FK a garment_types |
| created_at | timestamp | Fecha de creación |

#### `garment_types`
Tipos de prenda para categorización y etiquetado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | integer | Clave primaria |
| name | text | Nombre del tipo de prenda (ej: "Camiseta", "Pantalón") |

#### `product_variants`
Variaciones de productos con color, talle y stock.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | integer | Clave primaria |
| product_id | integer | FK a products |
| color_id | integer | FK a colors |
| size_id | integer | FK a sizes |
| stock | integer | Cantidad disponible |

#### `colors` & `sizes`
Tablas de catálogo para atributos de productos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | integer | Clave primaria |
| name | text | Nombre de color/talle |

#### `clients`
Información de clientes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | integer | Clave primaria |
| name | text | Nombre del cliente |
| email | text | Email del cliente (único) |
| phone | text | Teléfono del cliente (auto-capturado de WhatsApp) |
| created_at | timestamp | Fecha de registro |

#### `carts`
Encabezados de carritos de compra.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | Clave primaria (UUID para privacidad) |
| client_id | integer | FK a clients (opcional) |
| status | text | Estado del carrito: "active", "completed", "abandoned" |
| created_at | timestamp | Fecha de creación del carrito |

#### `cart_items`
Artículos en carritos de compra.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | integer | Clave primaria |
| cart_id | uuid | FK a carts |
| product_variant_id | integer | FK a product_variants |
| quantity | integer | Cantidad del artículo |
| price_at_add | numeric | Instantánea del precio al agregar |

---

## Flujo del Sistema

### Flujo de Mensajes (WhatsApp → Respuesta)

```
1. Cliente envía mensaje por WhatsApp
   │
   ▼
2. Chatwoot recibe mensaje (incoming)
   │
   ▼
3. Automation Rule dispara webhook
   │
   ▼ POST a /api/chatwoot/webhook
4. Cloudflare Worker recibe webhook
   │
   ├─ Extrae: conversationId, mensaje, remitente
   │
   ▼
5. Worker llama a API del Agente Laburen
   │  POST /api/agents/{agentId}/query
   │  {
   │    "query": "mensaje del cliente",
   │    "channel": "chatwoot",
   │    "conversationId": "123",
   │    "visitorId": "+5491123365608"
   │  }
   │
   ▼
6. Agente procesa el mensaje
   │
   ├─ Se conecta al Servidor MCP (/mcp)
   │
   ├─ Usa herramientas MCP:
   │  - list_products
   │  - add_to_cart
   │  - etc.
   │
   ├─ Genera respuesta
   │
   ▼
7. Agente devuelve respuesta al Worker
   │  { "answer": "Respuesta del agente..." }
   │
   ▼
8. Worker envía a API de Chatwoot
   │  POST /api/v1/accounts/{accountId}/conversations/{convId}/messages
   │  {
   │    "content": "Respuesta del agente...",
   │    "message_type": "outgoing"
   │  }
   │
   ▼
9. Chatwoot envía a WhatsApp
   │
   ▼
10. Cliente recibe mensaje
```

### Flujo de Ejecución de Herramientas

```
Consulta del Agente
   │
   ▼
Llamada a Herramienta MCP (ej. list_products)
   │
   ▼
Servidor MCP recibe solicitud de herramienta
   │
   ▼
Llamada HTTP interna a endpoint REST
   │  GET https://worker-url.workers.dev/api/products
   │
   ▼
Consulta a Supabase
   │  SELECT * FROM products
   │  JOIN product_variants ...
   │
   ▼
Devuelve datos formateados
   │
   ▼
Agente procesa resultado
   │
   ▼
Agente genera respuesta en lenguaje natural
```

---

## Endpoints de API

### Endpoints REST

Todos los endpoints tienen como prefijo la URL del worker:
`https://mcp-server-laburenchallenge.facundodiaz2727.workers.dev`

#### Productos

**GET /api/products**
Lista todos los productos con variantes.

Parámetros de consulta:
- `color` (opcional): Filtrar por nombre de color
- `size` (opcional): Filtrar por talle
- `minStock` (opcional): Nivel mínimo de stock

Respuesta:
```json
[
  {
    "id": 1,
    "name": "Camiseta Básica",
    "description": "Camiseta de algodón",
    "price": "1500.00",
    "variants": [
      {
        "id": 1,
        "color": "Rojo",
        "size": "M",
        "stock": 10
      }
    ]
  }
]
```

**GET /api/products/:id**
Obtener detalles de producto por ID.

Respuesta: Objeto de producto único con variantes.

#### Clientes

**POST /api/clients/get-or-create**
Obtener cliente existente o crear uno nuevo.

Solicitud:
```json
{
  "name": "Juan Pérez",
  "email": "cliente@example.com",
  "phone": "+5491123456789"
}
```

Respuesta:
```json
{
  "clientId": 1,
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "cartStatus": "active"
}
```

#### Carritos

**POST /api/carts**
Crear un nuevo carrito.

Solicitud:
```json
{
  "clientId": 1  // opcional
}
```

Respuesta:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": 1,
  "created_at": "2026-02-08T12:00:00Z"
}
```

**GET /api/carts/:cartId**
Obtener contenidos del carrito.

Respuesta:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": 1,
  "items": [
    {
      "id": 1,
      "product_variant_id": 1,
      "quantity": 2,
      "price_at_add": "1500.00",
      "product_name": "Camiseta Básica",
      "color": "Rojo",
      "size": "M"
    }
  ],
  "total": 3000.00
}
```

**POST /api/carts/:cartId/items**
Agregar artículo al carrito.

Solicitud:
```json
{
  "product_variant_id": 1,
  "qty": 2,
  "conversation_id": 123  // Opcional - para agregar etiquetas automáticamente
}
```

Respuesta:
```json
{
  "message": "Producto agregado al carrito exitosamente",
  "data": {
    "id": 1,
    "cart_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_variant_id": 1,
    "qty": 2
  }
}
```

**Nota**: Si se proporciona `conversation_id`, el sistema agrega automáticamente una etiqueta en Chatwoot con el tipo de prenda (normalizado a minúsculas sin tildes).

**PATCH /api/carts/:cartId/items/:itemId**
Actualizar cantidad de artículo en carrito.

Solicitud:
```json
{
  "quantity": 3
}
```

**DELETE /api/carts/:cartId/items/:itemId**
Eliminar artículo del carrito.

#### Chatwoot

**POST /api/chatwoot/webhook**
Recibe webhooks de automation rules de Chatwoot.

Solicitud (desde Chatwoot):
```json
{
  "event": "automation_event.message_created",
  "id": 1,
  "messages": [
    {
      "content": "hola",
      "message_type": 0,
      "sender": {
        "name": "Cliente",
        "type": "contact",
        "phone_number": "+5491123456789"
      }
    }
  ]
}
```

Respuesta: `200 OK`

**Características del webhook**:
- Filtra mensajes del bot y sistema (solo procesa mensajes de usuarios)
- Verifica custom attribute `bot` (si `false`, no responde - conversación en manos de humano)
- Auto-inicializa `bot=true` en conversaciones nuevas
- Extrae teléfono automáticamente de WhatsApp

**POST /api/chatwoot/request-human**
Transferir conversación a agente humano.

Solicitud:
```json
{
  "conversation_id": 123,
  "reason": "reembolso"  // "reembolso" | "producto_danado" | "otros"
}
```

Respuesta:
```json
{
  "message": "La conversación ha sido transferida a un agente humano. Un miembro de nuestro equipo te atenderá pronto."
}
```

**Comportamiento**:
- Actualiza custom attribute `bot=false`
- Agrega etiqueta "humano"
- Agrega etiqueta del motivo especificado
- El webhook deja de responder automáticamente a mensajes de esa conversación

---

## Herramientas MCP

### Interfaz de Herramientas

Conectarse al servidor MCP en: `https://mcp-server-laburenchallenge.facundodiaz2727.workers.dev/mcp`

### Herramientas Disponibles

#### `list_products`
Listar todos los productos con opciones de filtrado.

Parámetros:
```typescript
{
  color?: string,      // Filtrar por color
  size?: string,       // Filtrar por talle
  minStock?: number    // Nivel mínimo de stock
}
```

Retorna: Array de productos con variantes.

#### `get_product_details`
Obtener información detallada sobre un producto específico.

Parámetros:
```typescript
{
  productId: number
}
```

Retorna: Producto con todas sus variantes.

#### `get_or_create_client`
Obtener cliente existente o crear uno nuevo. Si el cliente existe, actualiza el teléfono. También crea o recupera un carrito activo para el cliente.

Parámetros:
```typescript
{
  name: string,
  email: string,
  phone?: string
}
```

Retorna: Objeto con `clientId`, `cartId` y `cartStatus`.

#### `create_cart`
Crear un nuevo carrito de compras.

Parámetros:
```typescript
{
  clientId?: number
}
```

Retorna: Objeto de carrito con UUID.

#### `add_to_cart`
Agregar variante de producto al carrito. Si se proporciona `conversationId`, agrega automáticamente una etiqueta en Chatwoot con el tipo de prenda.

Parámetros:
```typescript
{
  cartId: number | string,  // Acepta UUID o número
  productVariantId: number,
  qty: number,
  conversationId?: number  // Opcional - para etiquetado automático
}
```

Retorna: Confirmación de éxito y datos del item agregado.

#### `get_cart`
Recuperar contenidos del carrito.

Parámetros:
```typescript
{
  cartId: number | string
}
```

Retorna: Carrito con artículos y total.

#### `update_cart_item`
Actualizar cantidad de artículo en carrito.

Parámetros:
```typescript
{
  cartId: number | string,
  itemId: number,
  qty: number
}
```

Retorna: Artículo actualizado.

#### `remove_from_cart`
Eliminar artículo del carrito.

Parámetros:
```typescript
{
  cartId: number | string,
  itemId: number
}
```

Retorna: Confirmación de éxito.

#### `request_human_agent`
Transferir conversación a un agente humano. El agente debe preguntar primero al cliente el motivo y luego llamar a este tool con el motivo correspondiente.

Parámetros:
```typescript
{
  conversationId: number,
  reason: "reembolso" | "producto_danado" | "otros"
}
```

Retorna: Mensaje de confirmación para el cliente.

**Comportamiento**:
- Actualiza el custom attribute `bot=false` en Chatwoot
- Agrega etiqueta "humano" a la conversación
- Agrega etiqueta del motivo especificado
- El sistema deja de responder automáticamente a esa conversación

---

## Instalación y Despliegue

### Prerequisitos

- Node.js 18+
- Cuenta de Cloudflare
- Cuenta de Supabase
- Instancia de Chatwoot
- Agente Laburen (o plataforma de agente IA compatible)

### Instalación

1. **Clonar repositorio**
```bash
git clone <url-repositorio>
cd mcp-server-laburenchallenge
npm install
```

2. **Configurar Supabase**

Crear tablas usando el esquema en [Esquema de Base de Datos](#esquema-de-base-de-datos).

3. **Configurar variables de entorno**

```bash
# Supabase
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# Chatwoot (¡sin espacios al final!)
npx wrangler secret put CHATWOOT_URL
npx wrangler secret put CHATWOOT_ACCOUNT_ID
npx wrangler secret put CHATWOOT_API_TOKEN

# Agente Laburen
npx wrangler secret put LABUREN_API_KEY
npx wrangler secret put LABUREN_AGENT_ID
```

**Importante**: Al configurar variables de Chatwoot, asegurate de que NO haya espacios al final en los nombres de los secretos.

4. **Desplegar en Cloudflare**

```bash
npm run deploy
```

Tu worker será desplegado en:
`https://mcp-server-laburenchallenge.<tu-cuenta>.workers.dev`

### Configurar Chatwoot

1. **Crear Custom Attribute**
   - Ir a Settings → Custom Attributes → Conversation
   - Crear nuevo atributo:
     - Display Name: "Bot"
     - Key: `bot`
     - Type: Checkbox
     - Description: "Indica si el bot está habilitado para esta conversación"

2. **Crear Labels (Etiquetas)**
   - Ir a Settings → Labels
   - Crear las siguientes etiquetas manualmente (opcional, para personalizar colores):
     - `humano` - Para conversaciones transferidas a agentes humanos
     - `reembolso` - Cliente solicita reembolso
     - `producto_danado` - Producto llegó dañado
     - `otros` - Otros motivos
     - Etiquetas de tipos de prendas (ej: `camiseta`, `pantalon`, `sudadera`, etc.)

3. **Deshabilitar Bot Nativo**
   - Ir a Settings → Inboxes → [Tu inbox de WhatsApp] → Configuration
   - En "Agent Bot", seleccionar "Disable"
   - Esto previene respuestas duplicadas

4. **Crear Automation Rule**
   - Ir a Settings → Automations → Rules
   - Crear nueva regla

5. **Configurar Regla**
   - **Evento**: Message Created
   - **Condiciones**:
     - Inbox = Tu inbox de WhatsApp
     - Message Type = Incoming
   - **Acciones**:
     - Action Type: Webhook
     - Method: POST
     - URL: `https://mcp-server-laburenchallenge.<tu-cuenta>.workers.dev/api/chatwoot/webhook`
     - Headers: `{"Content-Type": "application/json"}`

6. **Guardar y Testear**

### Configurar Agente

Actualizar el system prompt del agente para incluir:

```
Eres un asistente de ventas IA con acceso a herramientas de e-commerce via MCP.

Herramientas disponibles:
- list_products: Explorar catálogo de productos
- get_product_details: Obtener información detallada de productos
- get_or_create_client: Registrar o recuperar cliente
- create_cart: Inicializar carrito de compras
- add_to_cart: Agregar artículos al carrito (usa conversationId para etiquetado automático)
- get_cart: Ver contenidos del carrito
- update_cart_item: Modificar cantidad de artículos
- remove_from_cart: Eliminar artículos
- request_human_agent: Transferir conversación a agente humano

Importante:
- NO uses send_chatwoot_message ni ninguna herramienta de Chatwoot
- Simplemente responde con texto - el sistema envía automáticamente tu respuesta al cliente
- Siempre sé amable y servicial
- Guía a los clientes en la selección de productos y proceso de compra

## ⚠️ REGLAS CRÍTICAS PARA GESTIÓN DE CLIENTES

### ❌ NUNCA hacer esto:
- NO llames a get_or_create_client hasta tener nombre y email REALES proporcionados por el cliente
- NO uses emails falsos como "example@email.com", "test@test.com" o similares
- NO uses el nombre del contacto de WhatsApp como nombre del cliente
- NO asumas datos del cliente

### ✅ FLUJO CORRECTO para clientes nuevos:
**PASO 1**: Saludar y ayudar con consultas de productos
**PASO 2**: Cuando el cliente quiera comprar, pedir nombre y email reales
**PASO 3**: Esperar respuesta con datos REALES del cliente
**PASO 4**: Recién ahora llamar a get_or_create_client con datos REALES
**PASO 5**: Continuar con la venta usando el cartId retornado

### ✅ FLUJO para add_to_cart:
- SIEMPRE pasar el conversationId cuando agregues productos al carrito
- Esto permite que el sistema agregue etiquetas automáticamente en Chatwoot
- Ejemplo: add_to_cart({ cartId: "uuid", productVariantId: 1, qty: 1, conversationId: 123 })

## 🤝 TRANSFERENCIA A AGENTE HUMANO

Cuando el cliente solicite hablar con un humano, seguir este flujo:

### PASO 1: Preguntar el motivo
```
Entiendo que prefieres hablar con un agente humano. Para poder ayudarte mejor, por favor indícame el motivo:

1️⃣ **Reembolso** - Quieres solicitar una devolución de dinero
2️⃣ **Producto dañado** - El producto llegó dañado o defectuoso
3️⃣ **Otros** - Otro motivo

Por favor responde con el número o el nombre de la opción.
```

### PASO 2: Clasificar la respuesta
- Si menciona "reembolso", "devolución", "devolver dinero", "cancelar" → usa reason: "reembolso"
- Si menciona "dañado", "roto", "defectuoso", "mal estado", "llegó mal" → usa reason: "producto_danado"
- Para cualquier otro motivo → usa reason: "otros"

### PASO 3: Llamar al tool
```typescript
request_human_agent({
  conversationId: [conversation_id],
  reason: [reason clasificado]
})
```

### PASO 4: Confirmar al cliente
Después de llamar al tool, confirma:
```
✅ Perfecto, he transferido tu conversación a un agente humano que te ayudará con [el motivo]. Un miembro de nuestro equipo te atenderá en breve.
```
```

---

## Configuración

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Clave anon de Supabase | `eyJhbGci...` |
| `CHATWOOT_URL` | URL de instancia Chatwoot | `https://app.chatwoot.com` |
| `CHATWOOT_ACCOUNT_ID` | ID de cuenta Chatwoot | `88` |
| `CHATWOOT_API_TOKEN` | Token de acceso API Chatwoot | `xxx` |
| `LABUREN_API_KEY` | Clave API plataforma Laburen | `xxx` |
| `LABUREN_AGENT_ID` | ID del agente en Laburen | `xxx` |

### Configuración de Chatwoot

**Formato URL de Webhook**:
```
https://<worker-url>/api/chatwoot/webhook
```

**Payload de Automation Rule** (enviado por Chatwoot):
```json
{
  "event": "automation_event.message_created",
  "id": 1,
  "inbox_id": 92,
  "messages": [{
    "id": 2800,
    "content": "texto del mensaje",
    "message_type": 0,
    "sender": {
      "name": "Nombre del Cliente",
      "phone_number": "+5491123456789"
    }
  }]
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Cliente Navega Productos

**Cliente**: "Quiero ver camisetas rojas"

**Flujo del Agente**:
1. Llama a `list_products({ color: "Rojo" })`
2. Recibe lista de productos
3. Responde: "Tenemos estas camisetas rojas disponibles: [lista]"

### Ejemplo 2: Agregar al Carrito

**Cliente**: "Quiero la camiseta M"

**Flujo del Agente**:
1. Agente: "Para continuar, necesito tu nombre y email"
2. Cliente: "Me llamo Juan Pérez, mi email es juan@email.com"
3. Llama a `get_or_create_client({ name: "Juan Pérez", email: "juan@email.com", phone: "+5491123456789" })`
4. Recibe `{ clientId: 1, cartId: "uuid-abc", cartStatus: "active" }`
5. Llama a `add_to_cart({ cartId: "uuid-abc", productVariantId: 1, qty: 1, conversationId: 123 })`
6. Sistema agrega automáticamente etiqueta "camiseta" en Chatwoot
7. Responde: "Agregué la camiseta M a tu carrito, Juan"

### Ejemplo 3: Ver Carrito

**Cliente**: "Que tengo en el carrito?"

**Flujo del Agente**:
1. Llama a `get_cart({ cartId: "uuid-abc" })`
2. Responde: "Tienes: 1x Camiseta Roja M ($1500). Total: $1500"

### Ejemplo 4: Solicitud de Agente Humano

**Cliente**: "Quiero hablar con un humano"

**Flujo del Agente**:
1. Agente: "Entiendo que prefieres hablar con un agente humano. ¿Cuál es el motivo?
   1️⃣ Reembolso
   2️⃣ Producto dañado
   3️⃣ Otros"
2. Cliente: "El producto llegó roto"
3. Agente identifica: reason = "producto_danado"
4. Llama a `request_human_agent({ conversationId: 123, reason: "producto_danado" })`
5. Sistema actualiza `bot=false` y agrega etiquetas "humano" y "producto_danado"
6. Responde: "✅ He transferido tu conversación a un agente humano. Te atenderán pronto."
7. Bot deja de responder a esta conversación automáticamente

---

## Solución de Problemas

### Problemas Comunes

#### 1. Webhook no recibe eventos

**Síntomas**: No hay logs en Cloudflare al enviar mensaje por WhatsApp

**Soluciones**:
- Verificar que Automation Rule está activa en Chatwoot
- Verificar que la URL del webhook es correcta (sin errores de tipeo)
- Asegurar que las condiciones incluyen "Message Type = Incoming"
- Testear webhook con curl:
  ```bash
  curl -X POST https://tu-worker.workers.dev/api/chatwoot/webhook \
    -H "Content-Type: application/json" \
    -d '{"event":"automation_event.message_created","id":1,"messages":[{"content":"test","message_type":0,"sender":{"name":"Test"}}]}'
  ```

#### 2. Agente no responde

**Síntomas**: Webhook recibe mensaje pero no se envía respuesta

**Verificar**:
- `npx wrangler tail` para ver logs
- Verificar que `LABUREN_API_KEY` y `LABUREN_AGENT_ID` están configuradas correctamente
- Confirmar que el agente está conectado al servidor MCP
- Verificar que el system prompt del agente incluye instrucciones de uso de herramientas
- Verificar custom attribute `bot` en Chatwoot (debe ser `true` o no existir)

#### 2.1. Bot responde dos veces

**Síntomas**: El cliente recibe dos respuestas idénticas

**Solución**: Deshabilitar el bot nativo de Chatwoot:
- Settings → Inboxes → [WhatsApp Inbox] → Configuration → Agent Bot → Disable

#### 3. Variables undefined

**Síntomas**: Los logs de error muestran `undefined/api/v1/accounts/undefined`

**Solución**:
- Eliminar y recrear secretos (verificar espacios al final):
  ```bash
  npx wrangler secret delete "CHATWOOT_URL "
  npx wrangler secret put CHATWOOT_URL
  ```

#### 4. Errores de formato de ID de carrito

**Síntomas**: `Invalid input: expected number, received string`

**Solución**: Esto ya está manejado - las herramientas aceptan tanto formatos UUID como numéricos.

#### 5. Labels no se agregan automáticamente

**Síntomas**: No se agregan etiquetas al agregar productos al carrito

**Verificar**:
- Que el agente esté pasando `conversationId` al llamar a `add_to_cart`
- Que las etiquetas estén creadas en Chatwoot (o dejar que se creen automáticamente)
- Ver logs con `npx wrangler tail` para verificar el proceso de etiquetado
- Verificar que los productos tienen `garment_type` asignado en la base de datos

#### 6. Cliente creado con datos falsos

**Síntomas**: Clientes en la DB con emails como "example@email.com"

**Solución**: Actualizar el prompt del agente con las reglas de gestión de clientes (ver sección [Configurar Agente](#configurar-agente))

### Comandos de Debug

**Ver logs en vivo**:
```bash
npx wrangler tail --format pretty
```

**Listar secretos**:
```bash
npx wrangler secret list
```

**Testear conexión MCP**:
```bash
curl https://tu-worker.workers.dev/mcp
```

**Testear endpoint de webhook**:
```bash
curl -X POST https://tu-worker.workers.dev/api/chatwoot/webhook-debug \
  -H "Content-Type: application/json" \
  -d '{"event":"message_created","content":"test"}'
```

---

## Consideraciones de Producción

### Seguridad

- ✅ Secretos almacenados en Cloudflare (no en código)
- ✅ Políticas RLS de Supabase deben ser configuradas
- ⚠️ Sin autenticación en endpoint MCP (agregar si es necesario)
- ✅ Webhook valida tipos de eventos
- ✅ Webhook filtra mensajes del bot/sistema para prevenir loops
- ✅ Custom attribute `bot` previene respuestas automáticas cuando hay agente humano

### Performance

- ✅ Cloudflare Workers: Despliegue global en edge
- ✅ Supabase: Postgres con connection pooling
- ⚠️ Tiempo de respuesta del agente: ~16 segundos (puede necesitar optimización)
- ✅ Respuestas de webhook: Siempre 200 OK (previene reintentos)

### Monitoreo

- Cloudflare Workers Analytics
- `wrangler tail` para logs en tiempo real
- Historial de conversaciones de Chatwoot
- Logs y métricas de Supabase

### Escalabilidad

- Cloudflare Workers: Auto-escala globalmente
- Supabase: Escalar tier de base de datos según necesidad
- Considerar caché para catálogo de productos
- Implementar rate limiting si es necesario

---

## Licencia

MIT

## Soporte

Para problemas o preguntas, por favor abrir un issue en GitHub.

---

**Construido con**:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase](https://supabase.com/)
- [Chatwoot](https://www.chatwoot.com/)
