import type { Env } from "../types/env";
import { sendChatwootMessage } from "./chatwoot";

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

const LABUREN_AGENT_WEBHOOK_URL = "https://dashboard.laburen.com/api/agents/cmla214tn1vevr0wynchplbx7/chatwoot-laburen-webhook";

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

		// Reenviar al webhook del agente de Laburen
		console.log("📤 Reenviando a agente Laburen...");

		const agentResponse = await fetch(LABUREN_AGENT_WEBHOOK_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(webhook),
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
