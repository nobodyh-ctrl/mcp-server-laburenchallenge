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
import type { Env } from "./types/env";

// Variable global para almacenar la URL base
let globalBaseUrl: string = "";

// Define our MCP agent with Supabase tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Supabase Database Agent",
		version: "1.0.0",
	});

	async init() {
		// Registrar las tools de base de datos con una función que retorna la URL base
		registerDatabaseTools(this.server, () => globalBaseUrl);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const supabase = createSupabaseClient(env);

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

		const addToCartMatch = url.pathname.match(/^\/api\/carts\/(\d+)\/items$/);
		if (addToCartMatch && request.method === "POST") {
			return handleAddToCart(addToCartMatch[1], request, supabase);
		}

	
		const getCartMatch = url.pathname.match(/^\/api\/carts\/(\d+)$/);
		if (getCartMatch && request.method === "GET") {
			return handleGetCart(getCartMatch[1], supabase);
		}

		
		const updateCartItemMatch = url.pathname.match(/^\/api\/carts\/(\d+)\/items\/(\d+)$/);
		if (updateCartItemMatch && request.method === "PATCH") {
			return handleUpdateCartItem(updateCartItemMatch[1], updateCartItemMatch[2], request, supabase);
		}

		const removeFromCartMatch = url.pathname.match(/^\/api\/carts\/(\d+)\/items\/(\d+)$/);
		if (removeFromCartMatch && request.method === "DELETE") {
			return handleRemoveFromCart(removeFromCartMatch[1], removeFromCartMatch[2], supabase);
		}

		// MCP Server
		if (url.pathname === "/mcp") {
			// Guardar la URL base (origen) para que las tools puedan hacer fetch
			globalBaseUrl = url.origin;
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
