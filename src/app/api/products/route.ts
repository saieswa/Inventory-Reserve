import { jsonData, jsonError } from "@/lib/api/response";
import { listProducts } from "@/server/services/catalog.service";

/** GET /api/products — list products with available stock per warehouse */
export async function GET() {
  try {
    const products = await listProducts();
    return jsonData({ products });
  } catch (error) {
    return jsonError(error);
  }
}
