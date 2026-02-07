import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "../types/env";

export function registerChatwootTools(server: McpServer, env: Env) {
	// Tool para enviar un mensaje a una conversación de Chatwoot
	server.tool(
		"send_chatwoot_message",
		{
			conversationId: z.number().describe("ID de la conversación de Chatwoot"),
			message: z.string().describe("Contenido del mensaje a enviar al cliente"),
		},
		async ({ conversationId, message }) => {
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
							content: message,
							message_type: "outgoing",
							private: false,
						}),
					}
				);

				if (!response.ok) {
					const errorText = await response.text();
					return {
						content: [
							{
								type: "text",
								text: `Error al enviar mensaje: ${response.status} - ${errorText}`,
							},
						],
					};
				}

				const result = await response.json();

				return {
					content: [
						{
							type: "text",
							text: `✅ Mensaje enviado exitosamente a la conversación #${conversationId}\n\n${JSON.stringify(result, null, 2)}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
						},
					],
				};
			}
		}
	);

	// Tool para agregar etiquetas a una conversación
	server.tool(
		"add_conversation_labels",
		{
			conversationId: z.number().describe("ID de la conversación de Chatwoot"),
			labels: z.array(z.string()).describe('Etiquetas a agregar (ej: ["venta_completada", "producto_camisa"])'),
		},
		async ({ conversationId, labels }) => {
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
					return {
						content: [
							{
								type: "text",
								text: `Error al agregar etiquetas: ${response.status} - ${errorText}`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: `✅ Etiquetas agregadas exitosamente: ${labels.join(", ")}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
						},
					],
				};
			}
		}
	);

	// Tool para actualizar el estado de una conversación
	server.tool(
		"update_conversation_status",
		{
			conversationId: z.number().describe("ID de la conversación de Chatwoot"),
			status: z.enum(["open", "resolved", "pending"]).describe('Estado de la conversación: "open", "resolved", o "pending"'),
		},
		async ({ conversationId, status }) => {
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
					return {
						content: [
							{
								type: "text",
								text: `Error al actualizar estado: ${response.status} - ${errorText}`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: `✅ Estado de conversación actualizado a: ${status}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
						},
					],
				};
			}
		}
	);
}
