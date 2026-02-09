import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerChatwootTools(server: McpServer, getBaseUrl: () => string) {
	// Tool para solicitar un agente humano
	server.tool(
		"request_human_agent",
		{
			conversationId: z.number().describe("ID de la conversación de Chatwoot"),
		},
		async ({ conversationId }) => {
			try {
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/chatwoot/request-human`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						conversation_id: conversationId,
					}),
				});

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al solicitar agente humano"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					message: string;
				};

				return {
					content: [
						{
							type: "text",
							text: result.message,
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
