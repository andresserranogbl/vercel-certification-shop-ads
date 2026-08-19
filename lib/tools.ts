/**
 * This is where the tools for your agent will live.
 *
 * During the workshop you'll define tools in this file that your agents
 * will choose to run depending on the question or request that is made
 * to them.
 *
 * Workshop docs: https://agent-foundations-certification.vercel.app/docs/tools
 */

import { tool } from "ai";
import { z } from "zod";
import { ApiRequestError, createReturn, getCategories, getOrder, getProductById, getProducts, getProductStock, preauthorizeRefund, notifyReturnInProcess } from "@/lib/api";
import { start } from "workflow/api"; 
import { returnFlow } from "./workflows/return-flow"; 

export const searchProducts = tool({
  description: `Search the Vercel swag store product catalog and browse/compare multiple products at once. Use this whenever the user asks what the store sells, wants recommendations, or is browsing a category. Returns a trimmed summary per product (name, one image, price, description) — it does NOT include stock levels or the full image gallery. Once the user has settled on ONE specific item, switch to getProductDetails for the complete picture instead of relying on these trimmed fields. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional, free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
      category: z 
      .string() 
      .optional() 
      .describe( 
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`, 
      ), 
  }),

  execute: async ({ query, category }) => { 
    "use step";
    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `Get the complete details for ONE specific product: full description, every product image, price, category, tags, and live stock level, plus a few related products from the same category. Use this whenever the user asks about a specific item by name, id, or slug (e.g. "tell me more about the black hoodie", "is the Vercel mug in stock", "show me that water bottle again") — do not rely on the trimmed fields returned by searchProducts for this. If you don't already know the product's id/slug, call searchProducts first to find it, then call getProductDetails with that id/slug.`,
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .describe(
        "The product's id or slug, typically obtained from a previous searchProducts result.",
      ),
  }),
  execute: async ({ idOrSlug }) => {
    try {
      const product = await getProductById(idOrSlug);
      const stock = await getProductStock(idOrSlug).catch(() => null);
      const related = await getProducts({
        category: product.category,
        limit: 5,
      }).catch(() => []);

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        images: product.images,
        tags: product.tags,
        featured: product.featured,
        stock: stock
          ? {
              inStock: stock.inStock,
              lowStock: stock.lowStock,
              quantity: stock.stock,
            }
          : null,
        relatedProducts: related
          .filter((p) => p.id !== product.id)
          .slice(0, 4)
          .map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: p.images[0],
          })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
     "use step";
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    "use step"; 
    const run = await start(returnFlow, [orderId, reason]); 
    return { runId: run.runId, message: `Return request received for order ${orderId}.` }; 
  },
});