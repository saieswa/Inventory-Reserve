"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, useCreateReservation } from "@/hooks/use-reservation";
import { useProducts, type ProductListItem } from "@/hooks/use-products";
import { Box, MapPin, PackageOpen, ShoppingCart, Timer } from "lucide-react";

function WarehouseStock({
  product,
  inventory,
}: {
  product: ProductListItem;
  inventory: ProductListItem["inventories"][number];
}) {
  const router = useRouter();
  const createReservation = useCreateReservation();

  const reserve = () => {
    createReservation.mutate(
      {
        productId: product.id,
        warehouseId: inventory.warehouseId,
        quantity: 1,
      },
      {
        onSuccess: (reservation) => {
          toast.success("Stock reserved for 10 minutes");
          router.push(`/checkout?reservationId=${reservation.id}`);
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            if (error.status === 409) {
              toast.error("Not enough stock — another shopper may have taken the last unit.");
              return;
            }
          }
          toast.error(
            error instanceof Error ? error.message : "Failed to reserve stock",
          );
        },
      },
    );
  };

  const isLow = inventory.available <= 2;

  return (
    <div className="group/stock flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/50 px-4 py-3 transition-all hover:bg-muted/40 hover:border-border hover:shadow-sm">
      <div>
        <p className="flex items-center gap-1.5 font-medium text-sm"><MapPin className="size-4 text-muted-foreground" /> {inventory.warehouse.name}</p>
        <p className="text-xs text-muted-foreground ml-5.5">{inventory.warehouse.code}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p>
            <span className="font-semibold text-foreground">{inventory.available}</span>{" "}
            available
          </p>
          <p className="text-xs text-muted-foreground">
            {inventory.reserved} reserved · {inventory.onHand} on hand
          </p>
        </div>
        <Button
          size="sm"
          className="transition-transform active:scale-95 group-hover/stock:shadow-md"
          disabled={inventory.available < 1 || createReservation.isPending}
          onClick={reserve}
        >
          {createReservation.isPending ? <Timer className="mr-1.5 size-4 animate-spin" /> : <ShoppingCart className="mr-1.5 size-4" />}
          {createReservation.isPending ? "Reserving…" : "Reserve"}
        </Button>
        {isLow && inventory.available > 0 && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">Low stock</Badge>
        )}
      </div>
    </div>
  );
}

export function ProductList() {
  const { data: products, isLoading, isError, error } = useProducts();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading products…</p>;
  }

  if (isError) {
    return (
      <p className="text-destructive">
        Failed to load products: {error instanceof Error ? error.message : "Unknown error"}
      </p>
    );
  }

  if (!products?.length) {
    return <p className="text-muted-foreground">No products found. Run npm run db:seed.</p>;
  }

  return (
    <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {products.map((product, i) => (
        <Card key={product.id} className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 bg-background/60 backdrop-blur-sm" style={{ animationDelay: `${i * 100}ms` }}>
          <CardHeader className="bg-muted/10 border-b border-border/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Box className="size-5 text-primary" /> {product.name}</CardTitle>
                <CardDescription className="ml-7 mt-1">{product.sku}</CardDescription>
              </div>
              {product.sku === "HUB-003" && (
                <Badge variant="destructive" className="animate-pulse">Concurrency demo (1 unit @ East)</Badge>
              )}
            </div>
            {product.description && (
              <p className="ml-7 text-sm text-muted-foreground">{product.description}</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-5">
            {product.inventories.map((inv) => (
              <WarehouseStock
                key={inv.id}
                product={product}
                inventory={inv}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
