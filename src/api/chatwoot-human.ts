import type { Env } from "../types/env";
import { updateConversationAttributes, addConversationLabels } from "./chatwoot";

export async function handleRequestHumanAgent(
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as {
			conversation_id: number;
		};

		if (!body.conversation_id) {
			return new Response(
				JSON.stringify({
					error: "Se requiere conversation_id",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		console.log(`👤 Solicitud de agente humano para conversación ${body.conversation_id}`);

		// 1. Actualizar custom attribute bot=false
		const updated = await updateConversationAttributes(
			body.conversation_id,
			{ bot: false },
			env
		);

		if (!updated) {
			return new Response(
				JSON.stringify({
					error: "Error al actualizar el estado del bot",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 2. Agregar etiqueta "humano"
		await addConversationLabels(body.conversation_id, ["humano"], env);

		console.log(`✅ Conversación ${body.conversation_id} transferida a agente humano`);

		return new Response(
			JSON.stringify({
				message: "La conversación ha sido transferida a un agente humano. Un miembro de nuestro equipo te atenderá pronto.",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("❌ Error en handleRequestHumanAgent:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Error desconocido",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
