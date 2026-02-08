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

### Capacidades de Integración
- **WhatsApp Business**: Comunicación nativa con clientes
- **CRM Chatwoot**: Historial de conversaciones y datos de clientes
- **Soporte para Agentes IA**: Interfaz completa de herramientas MCP
- **API REST**: Endpoints HTTP alternativos para documentación

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
| created_at | timestamp | Fecha de creación |

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
| email | text | Email del cliente (único) |
| phone | text | Teléfono del cliente |
| created_at | timestamp | Fecha de registro |

#### `carts`
Encabezados de carritos de compra.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | Clave primaria (UUID para privacidad) |
| client_id | integer | FK a clients (opcional) |
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
  "email": "cliente@example.com",
  "phone": "+5491123456789"
}
```

Respuesta:
```json
{
  "id": 1,
  "email": "cliente@example.com",
  "phone": "+5491123456789",
  "created_at": "2026-02-08T12:00:00Z"
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
  "productVariantId": 1,
  "quantity": 2
}
```

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

#### Webhook de Chatwoot

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
        "phone_number": "+5491123456789"
      }
    }
  ]
}
```

Respuesta: `200 OK`

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
Obtener cliente existente o crear uno nuevo.

Parámetros:
```typescript
{
  email: string,
  phone?: string
}
```

Retorna: Objeto de cliente.

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
Agregar variante de producto al carrito.

Parámetros:
```typescript
{
  cartId: number | string,  // Acepta UUID o número
  productVariantId: number,
  qty: number
}
```

Retorna: Confirmación de éxito.

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
```

**Importante**: Al configurar variables de Chatwoot, asegurate de que NO haya espacios al final en los nombres de los secretos.

4. **Desplegar en Cloudflare**

```bash
npm run deploy
```

Tu worker será desplegado en:
`https://mcp-server-laburenchallenge.<tu-cuenta>.workers.dev`

### Configurar Chatwoot

1. **Crear Automation Rule**
   - Ir a Settings → Automations → Rules
   - Crear nueva regla

2. **Configurar Regla**
   - **Evento**: Message Created
   - **Condiciones**:
     - Inbox = Tu inbox de WhatsApp
     - Message Type = Incoming
   - **Acciones**:
     - Action Type: Webhook
     - Method: POST
     - URL: `https://mcp-server-laburenchallenge.<tu-cuenta>.workers.dev/api/chatwoot/webhook`
     - Headers: `{"Content-Type": "application/json"}`

3. **Guardar y Testear**

### Configurar Agente

Actualizar el system prompt del agente para incluir:

```
Eres un asistente de ventas IA con acceso a herramientas de e-commerce via MCP.

Herramientas disponibles:
- list_products: Explorar catálogo de productos
- get_product_details: Obtener información detallada de productos
- get_or_create_client: Registrar o recuperar cliente
- create_cart: Inicializar carrito de compras
- add_to_cart: Agregar artículos al carrito
- get_cart: Ver contenidos del carrito
- update_cart_item: Modificar cantidad de artículos
- remove_from_cart: Eliminar artículos

Importante:
- NO uses send_chatwoot_message ni ninguna herramienta de Chatwoot
- Simplemente responde con texto - el sistema envía automáticamente tu respuesta al cliente
- Siempre sé amable y servicial
- Pregunta por el email para crear el perfil del cliente
- Guía a los clientes en la selección de productos y proceso de compra
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
1. Llama a `get_or_create_client({ email: "cliente@example.com" })`
2. Llama a `create_cart({ clientId: 1 })`
3. Llama a `add_to_cart({ cartId: "uuid", productVariantId: 1, qty: 1 })`
4. Responde: "Agregué la camiseta M a tu carrito"

### Ejemplo 3: Ver Carrito

**Cliente**: "Que tengo en el carrito?"

**Flujo del Agente**:
1. Llama a `get_cart({ cartId: "uuid" })`
2. Responde: "Tienes: 1x Camiseta Roja M ($1500). Total: $1500"

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
- Verificar que `LABUREN_API_KEY` está configurada correctamente
- Confirmar que el agente está conectado al servidor MCP
- Verificar que el system prompt del agente incluye instrucciones de uso de herramientas

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
