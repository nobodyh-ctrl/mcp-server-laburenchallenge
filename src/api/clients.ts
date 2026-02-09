import { SupabaseClient } from "@supabase/supabase-js";

export async function handleGetOrCreateClient(
	request: Request,
	supabase: SupabaseClient
): Promise<Response> {
	try {
		const body = (await request.json()) as {
			name: string;
			email: string;
			phone?: string;
		};

		if (!body.name || !body.email) {
			return new Response(
				JSON.stringify({
					error: "Se requiere nombre y email",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Buscar cliente por email
		const { data: existingClient, error: searchError } = await supabase
			.from("clients")
			.select("id")
			.eq("email", body.email)
			.single();

		let clientId: number;

		if (existingClient) {
			// Cliente existe - actualizar phone si se proporciona
			clientId = existingClient.id;

			if (body.phone) {
				await supabase
					.from("clients")
					.update({ phone: body.phone })
					.eq("id", clientId);
			}
		} else {
			// Crear nuevo cliente
			const clientData: { name: string; email: string; phone?: string } = {
				name: body.name,
				email: body.email,
			};

			if (body.phone) {
				clientData.phone = body.phone;
			}

			const { data: newClient, error: createError } = await supabase
				.from("clients")
				.insert(clientData)
				.select()
				.single();

			if (createError) {
				return new Response(
					JSON.stringify({
						error: `Error al crear el cliente: ${createError.message}`,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			clientId = newClient.id;
		}

		// Buscar carrito activo del cliente
		const { data: activeCart, error: cartSearchError } = await supabase
			.from("carts")
			.select("id, status")
			.eq("client_id", clientId)
			.eq("status", "active")
			.single();

		let cartId: number;
		let cartStatus: string;

		if (activeCart) {
			// Ya tiene carrito activo
			cartId = activeCart.id;
			cartStatus = activeCart.status;
		} else {
			// Crear nuevo carrito activo
			const { data: newCart, error: createCartError } = await supabase
				.from("carts")
				.insert({
					client_id: clientId,
					status: "active",
					created_at: new Date().toISOString(),
				})
				.select()
				.single();

			if (createCartError) {
				return new Response(
					JSON.stringify({
						error: `Error al crear el carrito: ${createCartError.message}`,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			cartId = newCart.id;
			cartStatus = newCart.status;
		}

		return new Response(
			JSON.stringify({
				clientId,
				cartId,
				cartStatus,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
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
