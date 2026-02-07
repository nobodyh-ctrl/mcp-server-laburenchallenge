import { SupabaseClient } from "@supabase/supabase-js";

export async function handleGetProducts(request: Request, supabase: SupabaseClient): Promise<Response> {
	try {
		const url = new URL(request.url);
		const name = url.searchParams.get("name");
		const description = url.searchParams.get("description");

		// Traer productos con sus variantes, colores y tallas
		let query = supabase.from("products").select(`
			*,
			product_variants (
				id,
				stock,
				colors (id, name),
				sizes (id, name)
			)
		`);

		// Aplicar filtro por nombre si existe
		if (name) {
			query = query.ilike("name", `%${name}%`);
		}

		// Aplicar filtro por descripción si existe
		if (description) {
			query = query.ilike("description", `%${description}%`);
		}

		// Solo productos disponibles
		query = query.eq("available", true);

		const { data, error } = await query;

		if (error) {
			return new Response(
				JSON.stringify({
					error: `Error al obtener productos: ${error.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		if (!data || data.length === 0) {
			return new Response(
				JSON.stringify({
					message: "No se encontraron productos con los filtros especificados.",
					data: [],
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response(
			JSON.stringify({
				message: `Se encontraron ${data.length} producto(s)`,
				count: data.length,
				data,
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

export async function handleGetProductById(
	productId: string,
	supabase: SupabaseClient
): Promise<Response> {
	try {
		const id = Number.parseInt(productId, 10);

		if (Number.isNaN(id)) {
			return new Response(
				JSON.stringify({
					error: "ID de producto inválido",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const { data, error } = await supabase
			.from("products")
			.select(
				`
			*,
			categories (id, name),
			garment_types (id, name),
			product_variants (
				id,
				stock,
				colors (id, name),
				sizes (id, name)
			)
		`
			)
			.eq("id", id)
			.single();

		if (error) {
			// Si no se encuentra el producto
			if (error.code === "PGRST116") {
				return new Response(
					JSON.stringify({
						error: `No se encontró ningún producto con el ID ${id}`,
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			return new Response(
				JSON.stringify({
					error: `Error al obtener el producto: ${error.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response(
			JSON.stringify({
				data,
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
