import { Suspense } from "react";

import { ReservationCheckout } from "@/components/checkout/reservation-checkout";

function CheckoutContent({
  searchParams,
}: {
  searchParams: { reservationId?: string };
}) {
  const reservationId = searchParams.reservationId;

  if (!reservationId) {
    return (
      <p className="text-muted-foreground">
        No reservation selected. Reserve a product from the{" "}
        <a href="/products" className="underline">
          product listing
        </a>
        .
      </p>
    );
  }

  return <ReservationCheckout reservationId={reservationId} />;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ reservationId?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <CheckoutContent searchParams={params} />
      </Suspense>
    </div>
  );
}
