import { SupabaseClient } from "@supabase/supabase-js";
import { addConversationLabels } from "./chatwoot";
import type { Env } from "../types/env";

export async function handleCreateCart(supabase: SupabaseClient): Promise<Response> {
	try {
		// Crear un nuevo carrito
		const { data: cart, error: cartError } = await supabase
			.from("carts")
			.insert({
				created_at: new Date().toISOString(),
			})
			.select()
			.single();

		if (cartError) {
			return new Response(
				JSON.stringify({
					error: `Error al crear el carrito: ${cartError.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response(
			JSON.stringify({
				message: "Carrito creado exitosamente",
				data: cart,
			}),
			{
				status: 201,
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

export async function handleAddToCart(
	cartId: string,
	request: Request,
	supabase: SupabaseClient,
	env?: Env
): Promise<Response> {
	try {
		// Soportar tanto números como UUIDs
		const id = /^[0-9a-fA-F-]+$/.test(cartId) ? cartId : Number.parseInt(cartId, 10);

		if (typeof id === 'number' && Number.isNaN(id)) {
			return new Response(
				JSON.stringify({
					error: "ID de carrito inválido",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar que el carrito existe
		const { data: cart, error: cartCheckError } = await supabase
			.from("carts")
			.select("id")
			.eq("id", id)
			.single();

		if (cartCheckError || !cart) {
			return new Response(
				JSON.stringify({
					error: `No se encontró ningún carrito con el ID ${id}`,
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Obtener datos del body
		const body = (await request.json()) as {
			product_variant_id: number;
			qty: number;
			conversation_id?: number;
		};

		if (!body.product_variant_id || !body.qty || body.qty <= 0) {
			return new Response(
				JSON.stringify({
					error: "Se requiere product_variant_id y qty (mayor a 0)",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar que la variante del producto existe y tiene stock
		const { data: variant, error: variantError } = await supabase
			.from("product_variants")
			.select(
				`
				id,
				stock,
				products (
					id,
					name,
					price,
					garment_types (id, name)
				)
			`
			)
			.eq("id", body.product_variant_id)
			.single();

		if (variantError || !variant) {
			return new Response(
				JSON.stringify({
					error: `No se encontró ninguna variante con el ID ${body.product_variant_id}`,
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar stock disponible
		if (variant.stock < body.qty) {
			return new Response(
				JSON.stringify({
					error: `Stock insuficiente. Solo hay ${variant.stock} unidades disponibles`,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar si la variante ya está en el carrito
		const { data: existingItem } = await supabase
			.from("cart_items")
			.select("*")
			.eq("cart_id", id)
			.eq("product_variant_id", body.product_variant_id)
			.single();

		if (existingItem) {
			// Verificar stock para la nueva cantidad total
			const newQty = existingItem.qty + body.qty;
			if (variant.stock < newQty) {
				return new Response(
					JSON.stringify({
						error: `Stock insuficiente. Solo hay ${variant.stock} unidades disponibles`,
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			// Actualizar cantidad si ya existe
			const { data: updatedItem, error: updateError } = await supabase
				.from("cart_items")
				.update({
					qty: newQty,
				})
				.eq("id", existingItem.id)
				.select()
				.single();

			if (updateError) {
				return new Response(
					JSON.stringify({
						error: `Error al actualizar el item: ${updateError.message}`,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			return new Response(
				JSON.stringify({
					message: "Cantidad actualizada en el carrito",
					data: updatedItem,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Agregar nuevo item al carrito
		const { data: newItem, error: insertError } = await supabase
			.from("cart_items")
			.insert({
				cart_id: id,
				product_variant_id: body.product_variant_id,
				qty: body.qty,
			})
			.select()
			.single();

		if (insertError) {
			return new Response(
				JSON.stringify({
					error: `Error al agregar item al carrito: ${insertError.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Agregar etiqueta en Chatwoot si hay conversationId y env
		if (body.conversation_id && env) {
			try {
				console.log("🏷️ Intentando agregar etiqueta...");
				console.log("📦 Variant data:", JSON.stringify(variant, null, 2));

				const garmentTypeName = (variant as any).products?.garment_types?.name;
				console.log(`🏷️ Garment type encontrado: "${garmentTypeName}"`);

				if (garmentTypeName) {
					// Normalizar el nombre para Chatwoot:
					// 1. Convertir a minúsculas
					// 2. Reemplazar espacios por nada (sin guiones bajos)
					// 3. Eliminar tildes y caracteres especiales
					const normalizedLabel = garmentTypeName
						.toLowerCase()
						.normalize("NFD")  // Descomponer caracteres acentuados
						.replace(/[\u0300-\u036f]/g, "")  // Eliminar tildes
						.replace(/\s+/g, "")  // Eliminar espacios
						.replace(/[^a-z0-9_-]/g, "");  // Solo minúsculas, números, _ y -

					console.log(`🏷️ Nombre original: "${garmentTypeName}"`);
					console.log(`🏷️ Nombre normalizado: "${normalizedLabel}"`);
					console.log(`📤 Llamando a addConversationLabels con conversationId: ${body.conversation_id}, label: ${normalizedLabel}`);

					await addConversationLabels(body.conversation_id, [normalizedLabel], env);
					console.log(`✅ Etiqueta "${normalizedLabel}" agregada a la conversación ${body.conversation_id}`);
				} else {
					console.log("⚠️ No se encontró garment type");
				}
			} catch (labelError) {
				console.error("⚠️ Error agregando etiqueta en Chatwoot:", labelError);
				// No fallar el request si falla la etiqueta
			}
		}

		return new Response(
			JSON.stringify({
				message: "Producto agregado al carrito exitosamente",
				data: newItem,
			}),
			{
				status: 201,
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


export async function handleGetCart(cartId: string, supabase: SupabaseClient): Promise<Response> {
	try {
		// Soportar tanto números como UUIDs
		const id = /^[0-9a-fA-F-]+$/.test(cartId) ? cartId : Number.parseInt(cartId, 10);

		if (typeof id === 'number' && Number.isNaN(id)) {
			return new Response(
				JSON.stringify({
					error: "ID de carrito inválido",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Obtener el carrito
		const { data: cart, error: cartError } = await supabase
			.from("carts")
			.select("*")
			.eq("id", id)
			.single();

		if (cartError || !cart) {
			return new Response(
				JSON.stringify({
					error: `No se encontró ningún carrito con el ID ${id}`,
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Obtener items del carrito con información de productos y variantes
		const { data: items, error: itemsError } = await supabase
			.from("cart_items")
			.select(
				`
				id,
				qty,
				product_variants (
					id,
					stock,
					products (
						id,
						name,
						description,
						price
					),
					colors (
						id,
						name
					),
					sizes (
						id,
						name
					)
				)
			`
			)
			.eq("cart_id", id);

		if (itemsError) {
			return new Response(
				JSON.stringify({
					error: `Error al obtener items del carrito: ${itemsError.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Calcular total
		const total = items?.reduce((sum, item: any) => {
			return sum + item.product_variants.products.price * item.qty;
		}, 0);

		return new Response(
			JSON.stringify({
				data: {
					cart,
					items: items || [],
					total,
					itemCount: items?.length || 0,
				},
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

export async function handleUpdateCartItem(
	cartId: string,
	itemId: string,
	request: Request,
	supabase: SupabaseClient
): Promise<Response> {
	try {
		// Soportar tanto números como UUIDs para cartId
		const cartIdValue = /^[0-9a-fA-F-]+$/.test(cartId) ? cartId : Number.parseInt(cartId, 10);
		const itemIdNum = Number.parseInt(itemId, 10);

		if ((typeof cartIdValue === 'number' && Number.isNaN(cartIdValue)) || Number.isNaN(itemIdNum)) {
			return new Response(
				JSON.stringify({
					error: "ID de carrito o item inválido",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Obtener el body con la nueva cantidad
		const body = (await request.json()) as { qty: number };

		if (!body.qty || body.qty <= 0) {
			return new Response(
				JSON.stringify({
					error: "Se requiere qty (mayor a 0)",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar que el item existe y pertenece al carrito
		const { data: existingItem, error: checkError } = await supabase
			.from("cart_items")
			.select(
				`
				*,
				product_variants (stock)
			`
			)
			.eq("id", itemIdNum)
			.eq("cart_id", cartIdValue)
			.single();

		if (checkError || !existingItem) {
			return new Response(
				JSON.stringify({
					error: `No se encontró el item ${itemIdNum} en el carrito ${cartIdValue}`,
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar stock disponible
		const variantStock = (existingItem as any).product_variants.stock;
		if (variantStock < body.qty) {
			return new Response(
				JSON.stringify({
					error: `Stock insuficiente. Solo hay ${variantStock} unidades disponibles`,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Actualizar la cantidad
		const { data: updatedItem, error: updateError } = await supabase
			.from("cart_items")
			.update({
				qty: body.qty,
			})
			.eq("id", itemIdNum)
			.select()
			.single();

		if (updateError) {
			return new Response(
				JSON.stringify({
					error: `Error al actualizar el item: ${updateError.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response(
			JSON.stringify({
				message: "Cantidad actualizada exitosamente",
				data: updatedItem,
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


export async function handleRemoveFromCart(
	cartId: string,
	itemId: string,
	supabase: SupabaseClient
): Promise<Response> {
	try {
		// Soportar tanto números como UUIDs para cartId
		const cartIdValue = /^[0-9a-fA-F-]+$/.test(cartId) ? cartId : Number.parseInt(cartId, 10);
		const itemIdNum = Number.parseInt(itemId, 10);

		if ((typeof cartIdValue === 'number' && Number.isNaN(cartIdValue)) || Number.isNaN(itemIdNum)) {
			return new Response(
				JSON.stringify({
					error: "ID de carrito o item inválido",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Verificar que el item existe y pertenece al carrito
		const { data: existingItem, error: checkError } = await supabase
			.from("cart_items")
			.select("*")
			.eq("id", itemIdNum)
			.eq("cart_id", cartIdValue)
			.single();

		if (checkError || !existingItem) {
			return new Response(
				JSON.stringify({
					error: `No se encontró el item ${itemIdNum} en el carrito ${cartIdValue}`,
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Eliminar el item
		const { error: deleteError } = await supabase.from("cart_items").delete().eq("id", itemIdNum);

		if (deleteError) {
			return new Response(
				JSON.stringify({
					error: `Error al eliminar el item: ${deleteError.message}`,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response(
			JSON.stringify({
				message: "Producto eliminado del carrito exitosamente",
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
