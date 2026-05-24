"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import {
  ApiError,
  useConfirmReservation,
  useReleaseReservation,
  useReservation,
} from "@/hooks/use-reservation";
import { CheckCircle2, Clock, CreditCard, PackageX, ShieldAlert, ShoppingBag, XCircle } from "lucide-react";

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "CONFIRMED":
      return "default";
    case "PENDING":
      return "secondary";
    case "EXPIRED":
      return "destructive";
    default:
      return "outline";
  }
}

export function ReservationCheckout({
  reservationId,
}: {
  reservationId: string;
}) {
  const { data: reservation, isLoading, isError } = useReservation(reservationId);
  const confirm = useConfirmReservation();
  const release = useReleaseReservation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading reservation…</p>;
  }

  if (isError || !reservation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Reservation not found.</p>
          <Button className="mt-4" variant="outline" render={<Link href="/products" />}>
            Back to products
          </Button>
        </CardContent>
      </Card>
    );
  }

  const expiresAt = new Date(reservation.expiresAt).getTime();
  const remaining = expiresAt - now;
  const isPending = reservation.status === "PENDING";
  const isExpired =
    reservation.status === "EXPIRED" ||
    (isPending && remaining <= 0);

  const handleConfirm = () => {
    confirm.mutate(reservation.id, {
      onSuccess: () => toast.success("Purchase confirmed — stock permanently reduced"),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 410) {
          toast.error("Reservation expired — stock was released. Please reserve again.");
          return;
        }
        toast.error(
          error instanceof Error ? error.message : "Failed to confirm purchase",
        );
      },
    });
  };

  const handleRelease = () => {
    release.mutate(reservation.id, {
      onSuccess: () => toast.success("Reservation cancelled — stock released"),
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to cancel reservation",
        );
      },
    });
  };

  return (
    <Card className="overflow-hidden border-border/50 bg-background/60 backdrop-blur-md shadow-xl animate-in zoom-in-95 duration-500">
      <CardHeader className="bg-muted/10 border-b border-border/40 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><ShoppingBag className="size-5 text-primary" /> Checkout</CardTitle>
            <CardDescription className="ml-7 mt-1 font-mono text-xs">Reservation {reservation.id.slice(0, 8)}…</CardDescription>
          </div>
          <Badge variant={statusVariant(reservation.status)} className="px-3 py-1 animate-in slide-in-from-right-4">
            {reservation.status === "CONFIRMED" && <CheckCircle2 className="mr-1.5 size-3.5" />}
            {reservation.status === "PENDING" && <Clock className="mr-1.5 size-3.5" />}
            {reservation.status === "EXPIRED" && <ShieldAlert className="mr-1.5 size-3.5" />}
            {reservation.status === "RELEASED" && <PackageX className="mr-1.5 size-3.5" />}
            {reservation.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Product</dt>
            <dd className="font-medium">{reservation.product.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">SKU</dt>
            <dd>{reservation.product.sku}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Warehouse</dt>
            <dd>
              {reservation.warehouse.name} ({reservation.warehouse.code})
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Quantity</dt>
            <dd>{reservation.quantity}</dd>
          </div>
        </dl>

        {isPending && !isExpired && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-transparent p-6 text-center shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)] ring-1 ring-inset ring-amber-500/20">
            <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
            <div className="relative">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Time remaining</p>
              <p className="font-mono text-5xl font-bold tracking-tight text-amber-500 my-2 drop-shadow-md">
                {formatCountdown(remaining)}
              </p>
              <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
                Complete payment before the timer ends or the hold is released.
              </p>
            </div>
          </div>
        )}

        {isExpired && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This reservation has expired (HTTP 410). Stock is available again for other shoppers.
          </p>
        )}

        {reservation.status === "CONFIRMED" && (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm">
            Payment succeeded. Inventory has been permanently reduced.
          </p>
        )}

        {reservation.status === "RELEASED" && (
          <p className="rounded-lg border bg-muted px-4 py-3 text-sm">
            Reservation cancelled. Units are back in available stock.
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-4 border-t border-border/40">
          <Button
            size="lg"
            className="flex-1 transition-transform active:scale-95 shadow-lg shadow-primary/20"
            disabled={!isPending || isExpired || confirm.isPending || release.isPending}
            onClick={handleConfirm}
          >
            <CreditCard className="mr-2 size-5" />
            {confirm.isPending ? "Confirming…" : "Confirm purchase"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 transition-transform active:scale-95"
            disabled={!isPending || isExpired || confirm.isPending || release.isPending}
            onClick={handleRelease}
          >
            <XCircle className="mr-2 size-5" />
            {release.isPending ? "Cancelling…" : "Cancel hold"}
          </Button>
          <Button size="lg" variant="ghost" render={<Link href="/products" />} className="w-full">
            Back to products
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
