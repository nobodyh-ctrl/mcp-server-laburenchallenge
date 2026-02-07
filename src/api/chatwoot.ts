import type { Env } from "../types/env";

interface ChatwootWebhookEvent {
	event: string;
	message_type?: string;
	content?: string;
	conversation?: {
		id: number;
		status: string;
	};
	account?: {
		id: number;
	};
	sender?: {
		name: string;
		phone_number?: string;
		email?: string;
	};
	id?: number;
}

export async function handleChatwootWebhook(
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const event = (await request.json()) as ChatwootWebhookEvent;

		console.log("📥 Chatwoot webhook recibido:", event.event);

		// Filtrar SOLO mensajes entrantes del cliente
		if (event.event !== "message_created" || event.message_type !== "incoming") {
			console.log("⏭️  Evento ignorado (no es mensaje entrante)");
			return new Response("OK - Evento ignorado", { status: 200 });
		}

		const conversationId = event.conversation?.id;
		const messageContent = event.content;
		const senderName = event.sender?.name || "Cliente";

		if (!conversationId || !messageContent) {
			console.log("⚠️  Falta conversationId o contenido del mensaje");
			return new Response("OK - Datos incompletos", { status: 200 });
		}

		console.log(`💬 Mensaje de ${senderName}: ${messageContent}`);

		// TODO: Invocar el agente MCP aquí para procesar el mensaje
		// El agente tiene acceso a todas las tools (productos, carrito, chatwoot)
		// y puede responder inteligentemente al cliente

		// Por ahora, respondemos con un mensaje simple hasta integrar el agente
		const respuesta = `Hola ${senderName}! Recibí tu mensaje: "${messageContent}".

Para ayudarte necesito tu email. Una vez que lo tengas configurado en Chatwoot, podré:
- Mostrarte productos disponibles
- Crear tu carrito de compras
- Procesar pedidos

El agente está listo con estas tools:
- list_products, get_product_details
- get_or_create_client
- add_to_cart, get_cart, update_cart_item, remove_from_cart
- send_chatwoot_message, add_conversation_labels, update_conversation_status`;

		// Enviar respuesta a Chatwoot
		await sendChatwootMessage(
			conversationId,
			respuesta,
			env
		);

		return new Response("OK", { status: 200 });
	} catch (error) {
		console.error("❌ Error procesando webhook:", error);
		// Siempre devolver 200 para que Chatwoot no reintente
		return new Response("OK - Error interno manejado", { status: 200 });
	}
}

export async function sendChatwootMessage(
	conversationId: number,
	content: string,
	env: Env
): Promise<void> {
	try {
		const response = await fetch(
			`${env.CHATWOOT_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					api_access_token: env.CHATWOOT_API_TOKEN,
				},
				body: JSON.stringify({
					content,
					message_type: "outgoing",
					private: false,
				}),
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`❌ Error enviando mensaje a Chatwoot: ${response.status} - ${errorText}`);
			throw new Error(`Chatwoot API error: ${response.status}`);
		}

		console.log("✅ Mensaje enviado a Chatwoot correctamente");
	} catch (error) {
		console.error("❌ Error en sendChatwootMessage:", error);
		throw error;
	}
}

export async function addConversationLabels(
	conversationId: number,
	labels: string[],
	env: Env
): Promise<void> {
	try {
		const response = await fetch(
			`${env.CHATWOOT_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/labels`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					api_access_token: env.CHATWOOT_API_TOKEN,
				},
				body: JSON.stringify({ labels }),
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`❌ Error agregando etiquetas: ${response.status} - ${errorText}`);
			return;
		}

		console.log(`✅ Etiquetas agregadas: ${labels.join(", ")}`);
	} catch (error) {
		console.error("❌ Error en addConversationLabels:", error);
	}
}

export async function updateConversationStatus(
	conversationId: number,
	status: "open" | "resolved" | "pending",
	env: Env
): Promise<void> {
	try {
		const response = await fetch(
			`${env.CHATWOOT_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					api_access_token: env.CHATWOOT_API_TOKEN,
				},
				body: JSON.stringify({ status }),
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`❌ Error actualizando estado: ${response.status} - ${errorText}`);
			return;
		}

		console.log(`✅ Estado actualizado a: ${status}`);
	} catch (error) {
		console.error("❌ Error en updateConversationStatus:", error);
	}
}
