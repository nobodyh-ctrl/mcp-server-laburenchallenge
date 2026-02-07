import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { createSupabaseClient } from "./config/supabase";
import { registerDatabaseTools } from "./tools/database";
import { handleGetProducts, handleGetProductById } from "./api/products";
import {
	handleCreateCart,
	handleAddToCart,
	handleGetCart,
	handleUpdateCartItem,
	handleRemoveFromCart,
} from "./api/carts";
import { handleGetOrCreateClient } from "./api/clients";
import { handleChatwootWebhook } from "./api/chatwoot";
import type { Env } from "./types/env";

// Define our MCP agent with Supabase tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Supabase Database Agent",
		version: "1.0.0",
	});

	async init() {
		// Obtener la URL base desde las props del contexto de ejecución
		const baseUrl = ((this as any).props as any)?.BASE_URL || "";
		// Registrar las tools de base de datos pasando la URL base
		registerDatabaseTools(this.server, () => baseUrl);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const supabase = createSupabaseClient(env);

		// Chatwoot webhook
		if (url.pathname === "/api/chatwoot/webhook" && request.method === "POST") {
			return handleChatwootWebhook(request, env);
		}

		// Client management
		if (url.pathname === "/api/clients/get-or-create" && request.method === "POST") {
			return handleGetOrCreateClient(request, supabase);
		}

		const productIdMatch = url.pathname.match(/^\/api\/products\/(\d+)$/);
		if (productIdMatch && request.method === "GET") {
			return handleGetProductById(productIdMatch[1], supabase);
		}


		if (url.pathname === "/api/products" && request.method === "GET") {
			return handleGetProducts(request, supabase);
		}

		if (url.pathname === "/api/carts" && request.method === "POST") {
			return handleCreateCart(supabase);
		}

		const addToCartMatch = url.pathname.match(/^\/api\/carts\/([a-zA-Z0-9-]+)\/items$/);
		if (addToCartMatch && request.method === "POST") {
			return handleAddToCart(addToCartMatch[1], request, supabase);
		}


		const getCartMatch = url.pathname.match(/^\/api\/carts\/([a-zA-Z0-9-]+)$/);
		if (getCartMatch && request.method === "GET") {
			return handleGetCart(getCartMatch[1], supabase);
		}


		const updateCartItemMatch = url.pathname.match(/^\/api\/carts\/([a-zA-Z0-9-]+)\/items\/(\d+)$/);
		if (updateCartItemMatch && request.method === "PATCH") {
			return handleUpdateCartItem(updateCartItemMatch[1], updateCartItemMatch[2], request, supabase);
		}

		const removeFromCartMatch = url.pathname.match(/^\/api\/carts\/([a-zA-Z0-9-]+)\/items\/(\d+)$/);
		if (removeFromCartMatch && request.method === "DELETE") {
			return handleRemoveFromCart(removeFromCartMatch[1], removeFromCartMatch[2], supabase);
		}

		// MCP Server
		if (url.pathname === "/mcp") {
			// Inyectar la URL base en el contexto usando props
			const context = Object.assign(Object.create(ctx), ctx, {
				props: {
					...(ctx as any).props,
					BASE_URL: url.origin,
				},
			});
			return MyMCP.serve("/mcp").fetch(request, env, context);
		}

		return new Response("Not found", { status: 404 });
	},
};
