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
	_env: Env
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

		// Este webhook solo registra eventos para debugging
		// El agente externo (dashboard.laburen.com) es el que debe:
		// 1. Recibir webhooks de Chatwoot en su propio endpoint
		// 2. Conectarse a este MCP server en /mcp
		// 3. Usar las tools disponibles (send_chatwoot_message, list_products, etc.)
		// 4. Responder al cliente

		return new Response("OK - Evento registrado", { status: 200 });
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
