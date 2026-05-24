"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError, idempotencyKey } from "@/lib/api/client";

export type ReservationItem = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  product: { id: string; sku: string; name: string };
  warehouse: { id: string; code: string; name: string };
};

export function useReservation(reservationId: string | null) {
  return useQuery({
    queryKey: ["reservation", reservationId],
    enabled: Boolean(reservationId),
    queryFn: async () => {
      const data = await api<{ reservation: ReservationItem }>(
        `/api/reservations/${reservationId}`,
      );
      return data.reservation;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" ? 3000 : false;
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      warehouseId: string;
      quantity: number;
    }) => {
      const data = await api<{ reservation: ReservationItem }>(
        "/api/reservations",
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey() },
          body: JSON.stringify(input),
        },
      );
      return data.reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useConfirmReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const data = await api<{ reservation: ReservationItem }>(
        `/api/reservations/${reservationId}/confirm`,
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey() },
        },
      );
      return data.reservation;
    },
    onSuccess: (reservation) => {
      queryClient.setQueryData(["reservation", reservation.id], reservation);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReleaseReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const data = await api<{ reservation: ReservationItem }>(
        `/api/reservations/${reservationId}/release`,
        { method: "POST" },
      );
      return data.reservation;
    },
    onSuccess: (reservation) => {
      queryClient.setQueryData(["reservation", reservation.id], reservation);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export { ApiError };
