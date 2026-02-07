import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerDatabaseTools(server: McpServer, getBaseUrl: () => string) {
	// Tool para listar productos con filtros opcionales
	server.tool(
		"list_products",
		{
			name: z.string().optional().describe("Filtro por nombre del producto (búsqueda parcial)"),
			description: z.string().optional().describe("Filtro por descripción del producto (búsqueda parcial)"),
		},
		async ({ name, description }) => {
			try {
				// Construir URL con query parameters
				const params = new URLSearchParams();
				if (name) params.append("name", name);
				if (description) params.append("description", description);

				// Hacer fetch al endpoint REST usando la URL base del worker
				const baseUrl = getBaseUrl();
				const response = await fetch(
					`${baseUrl}/api/products${params.toString() ? `?${params.toString()}` : ""}`
				);

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al obtener productos"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					message: string;
					count?: number;
					data: unknown[];
				};

				return {
					content: [
						{
							type: "text",
							text: `${result.message}\n\n${JSON.stringify(result.data, null, 2)}`,
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

	// Tool para obtener detalles de un producto específico por ID
	server.tool(
		"get_product_details",
		{
			productId: z.number().describe("ID del producto a consultar"),
		},
		async ({ productId }) => {
			try {
				// Hacer fetch al endpoint REST para obtener un producto específico
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/products/${productId}`);

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al obtener el producto"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					data: unknown;
				};

				return {
					content: [
						{
							type: "text",
							text: `Detalles del producto:\n\n${JSON.stringify(result.data, null, 2)}`,
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

	// Tool para crear un nuevo carrito
	server.tool("create_cart", {}, async () => {
		try {
			const baseUrl = getBaseUrl();
			const response = await fetch(`${baseUrl}/api/carts`, {
				method: "POST",
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { error?: string };
				return {
					content: [
						{
							type: "text",
							text: `Error: ${errorData.error || "Error al crear el carrito"}`,
						},
					],
				};
			}

			const result = (await response.json()) as {
				message: string;
				data: { id: number; created_at: string };
			};

			return {
				content: [
					{
						type: "text",
						text: `${result.message}\n\nID del carrito: ${result.data.id}\nCreado: ${result.data.created_at}`,
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
	});

	// Tool para agregar productos al carrito (usando variante de producto)
	server.tool(
		"add_to_cart",
		{
			cartId: z.union([z.number(), z.string()]).describe("ID del carrito (puede ser número o UUID)"),
			productVariantId: z.number().describe("ID de la variante del producto (incluye color y talla)"),
			qty: z.number().min(1).describe("Cantidad del producto"),
		},
		async ({ cartId, productVariantId, qty }) => {
			try {
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/carts/${cartId}/items`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						product_variant_id: productVariantId,
						qty,
					}),
				});

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al agregar producto al carrito"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					message: string;
					data: unknown;
				};

				return {
					content: [
						{
							type: "text",
							text: `${result.message}\n\n${JSON.stringify(result.data, null, 2)}`,
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

	// Tool para ver el carrito completo con todos sus items
	server.tool(
		"get_cart",
		{
			cartId: z.union([z.number(), z.string()]).describe("ID del carrito a consultar (puede ser número o UUID)"),
		},
		async ({ cartId }) => {
			try {
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/carts/${cartId}`);

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al obtener el carrito"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					data: {
						cart: unknown;
						items: unknown[];
						total: number;
						itemCount: number;
					};
				};

				return {
					content: [
						{
							type: "text",
							text: `Carrito #${cartId}\n\nTotal de items: ${result.data.itemCount}\nTotal: $${result.data.total}\n\nProductos:\n${JSON.stringify(result.data.items, null, 2)}`,
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

	// Tool para actualizar la cantidad de un item en el carrito
	server.tool(
		"update_cart_item",
		{
			cartId: z.union([z.number(), z.string()]).describe("ID del carrito (puede ser número o UUID)"),
			itemId: z.number().describe("ID del item a actualizar"),
			qty: z.number().min(1).describe("Nueva cantidad del producto"),
		},
		async ({ cartId, itemId, qty }) => {
			try {
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/carts/${cartId}/items/${itemId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						qty,
					}),
				});

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al actualizar el item"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					message: string;
					data: unknown;
				};

				return {
					content: [
						{
							type: "text",
							text: `${result.message}\n\n${JSON.stringify(result.data, null, 2)}`,
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

	// Tool para eliminar un producto del carrito
	server.tool(
		"remove_from_cart",
		{
			cartId: z.union([z.number(), z.string()]).describe("ID del carrito (puede ser número o UUID)"),
			itemId: z.number().describe("ID del item a eliminar"),
		},
		async ({ cartId, itemId }) => {
			try {
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/carts/${cartId}/items/${itemId}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al eliminar el item"}`,
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

	// Tool para obtener o crear un cliente y su carrito activo
	server.tool(
		"get_or_create_client",
		{
			name: z.string().describe("Nombre del cliente"),
			email: z.string().email().describe("Email del cliente (debe ser válido y único)"),
		},
		async ({ name, email }) => {
			try {
				const baseUrl = getBaseUrl();
				const response = await fetch(`${baseUrl}/api/clients/get-or-create`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name,
						email,
					}),
				});

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string };
					return {
						content: [
							{
								type: "text",
								text: `Error: ${errorData.error || "Error al obtener o crear el cliente"}`,
							},
						],
					};
				}

				const result = (await response.json()) as {
					clientId: number;
					cartId: number;
					cartStatus: string;
				};

				return {
					content: [
						{
							type: "text",
							text: `Cliente procesado exitosamente:\n\nID del cliente: ${result.clientId}\nID del carrito: ${result.cartId}\nEstado del carrito: ${result.cartStatus}`,
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
