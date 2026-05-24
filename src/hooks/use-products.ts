"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  inventories: {
    id: string;
    warehouseId: string;
    warehouse: {
      id: string;
      code: string;
      name: string;
      region: string | null;
    };
    onHand: number;
    reserved: number;
    available: number;
  }[];
};

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await api<{ products: ProductListItem[] }>("/api/products");
      return data.products;
    },
  });
}

export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["products"] });
}
