import type { Env } from "../types/env";
import { sendChatwootMessage, getConversationAttributes } from "./chatwoot";

// Webhook payload que viene de Chatwoot (automation rule)
interface ChatwootAutomationWebhook {
	event: string;
	id: number; // conversationId
	messages?: Array<{
		id: number;
		content: string;
		message_type: number; // 0 = incoming, 1 = outgoing
		sender: {
			id: number;
			name: string;
			phone_number?: string;
			email?: string;
		};
	}>;
	meta?: {
		sender?: {
			id: number;
			name: string;
			phone_number?: string;
			email?: string;
		};
	};
}

// Respuesta del agente de Laburen
interface LaburenAgentResponse {
	answer: string;
	conversationId: string;
	visitorId: string;
	messageId: string;
}

export async function handleChatwootAdapterWebhook(
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const webhook = (await request.json()) as ChatwootAutomationWebhook;

		console.log("🔥 Webhook recibido de Chatwoot:", JSON.stringify(webhook, null, 2));

		// Verificar que sea el evento correcto
		if (webhook.event !== "automation_event.message_created") {
			console.log("⏭️  Evento ignorado:", webhook.event);
			return new Response("OK - Evento ignorado", { status: 200 });
		}

		// Extraer datos del webhook
		const conversationId = webhook.id;
		const message = webhook.messages?.[0];

		if (!message || message.message_type !== 0) {
			console.log("⏭️  No es mensaje incoming");
			return new Response("OK - No es incoming", { status: 200 });
		}

		const messageContent = message.content;
		const sender = message.sender || webhook.meta?.sender;

		console.log(`💬 Mensaje de ${sender?.name}: ${messageContent}`);
		console.log(`📋 Conversation ID: ${conversationId}`);
		console.log(`📞 Teléfono: ${sender?.phone_number || "No disponible"}`);

		// Verificar si el bot está habilitado para esta conversación
		console.log("🔍 Verificando estado del bot...");
		const customAttributes = await getConversationAttributes(conversationId, env);
		const botEnabled = customAttributes.bot !== false; // Por defecto true si no existe

		console.log(`🤖 Bot enabled: ${botEnabled}`);

		if (!botEnabled) {
			console.log("⏭️  Bot deshabilitado - conversación asignada a humano");
			return new Response("OK - Bot deshabilitado", { status: 200 });
		}

		// Llamar al agente de Laburen usando el endpoint /query
		console.log("📤 Llamando al agente Laburen...");

		// Construir URL del agente usando variable de entorno
		const laburenApiUrl = `https://dashboard.laburen.com/api/agents/${env.LABUREN_AGENT_ID}/query`;

		// Construir contexto con información del cliente
		let contextMessage = `Mensaje de WhatsApp de ${sender?.name || "Cliente"}`;
		if (sender?.phone_number) {
			contextMessage += `\nTeléfono: ${sender.phone_number}`;
		}
		if (sender?.email) {
			contextMessage += `\nEmail: ${sender.email}`;
		}
		contextMessage += `\nConversation ID: ${conversationId}`;

		const agentResponse = await fetch(laburenApiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${env.LABUREN_API_KEY}`,
			},
			body: JSON.stringify({
				query: messageContent,
				channel: "chatwoot",
				conversationId: conversationId.toString(),
				visitorId: sender?.phone_number || sender?.id.toString(),
				context: contextMessage,
			}),
		});

		if (!agentResponse.ok) {
			console.error(`❌ Error llamando al agente: ${agentResponse.status}`);
			return new Response("OK - Error al llamar agente", { status: 200 });
		}

		const agentData = (await agentResponse.json()) as LaburenAgentResponse;
		console.log("✅ Respuesta del agente:", agentData.answer);

		// Enviar respuesta a Chatwoot
		await sendChatwootMessage(conversationId, agentData.answer, env);

		console.log("✅ Mensaje enviado a Chatwoot");

		return new Response("OK", { status: 200 });
	} catch (error) {
		console.error("❌ Error en adaptador:", error);
		return new Response("OK - Error manejado", { status: 200 });
	}
}
