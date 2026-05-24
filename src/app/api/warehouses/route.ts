import { jsonData, jsonError } from "@/lib/api/response";
import { listWarehouses } from "@/server/services/catalog.service";

/** GET /api/warehouses — list warehouses */
export async function GET() {
  try {
    const warehouses = await listWarehouses();
    return jsonData({ warehouses });
  } catch (error) {
    return jsonError(error);
  }
}
