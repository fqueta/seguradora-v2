import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersService } from "@/services/ordersService";
import { Order, CreateOrderPayload, UpdateOrderPayload, OrderStatus } from "@/types/orders";

/**
 * useOrdersList
 * pt-BR: Hook para listar pedidos (admin).
 * en-US: Hook to list orders (admin).
 */
export function useOrdersList(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["orders", "list", params],
    queryFn: () => ordersService.list(params),
  });
}

/**
 * useOrder
 * pt-BR: Hook para obter um pedido por ID (admin).
 * en-US: Hook to get an order by ID (admin).
 */
export function useOrder(id?: number | string) {
  return useQuery({
    queryKey: ["orders", "item", id],
    queryFn: () => ordersService.getById(id as number | string),
    enabled: !!id,
  });
}

/**
 * useCreateOrder
 * pt-BR: Hook para criar pedido público (cliente).
 * en-US: Hook to create public order (customer).
 */
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "create"],
    mutationFn: (payload: CreateOrderPayload) => ordersService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", "list"] });
    },
  });
}

/**
 * useUpdateOrder
 * pt-BR: Hook para atualizar campos do pedido (admin).
 * en-US: Hook to update order fields (admin).
 */
export function useUpdateOrder(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "update", id],
    mutationFn: (payload: UpdateOrderPayload) => ordersService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", "item", id] });
      qc.invalidateQueries({ queryKey: ["orders", "list"] });
    },
  });
}

/**
 * useUpdateOrderStatus
 * pt-BR: Hook para atualizar apenas o status (admin).
 * en-US: Hook to update only the status (admin).
 */
export function useUpdateOrderStatus(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "update-status", id],
    mutationFn: (status: OrderStatus) => ordersService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", "item", id] });
      qc.invalidateQueries({ queryKey: ["orders", "list"] });
    },
  });
}

/**
 * useUpdateOrderMutation
 * pt-BR: Hook de mutação para atualizar qualquer pedido (id no payload).
 * en-US: Mutation hook to update any order (id in payload).
 */
export function useUpdateOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: UpdateOrderPayload }) => 
      ordersService.update(id, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["orders", "list"] });
      qc.invalidateQueries({ queryKey: ["orders", "item", variables.id] });
    },
  });
}

/**
 * useUpdateStatusMutation
 * pt-BR: Hook de mutação para atualizar status de qualquer pedido.
 * en-US: Mutation hook to update status of any order.
 */
export function useUpdateStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: OrderStatus }) => 
      ordersService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["orders", "list"] });
      qc.invalidateQueries({ queryKey: ["orders", "item", variables.id] });
    },
  });
}


/**
 * useDeleteOrder
 * pt-BR: Hook para excluir pedido (admin).
 * en-US: Hook to delete order (admin).
 */
export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["orders", "delete"],
    mutationFn: (id: number | string) => ordersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", "list"] });
    },
  });
}

/**
 * useReceiptPdf
 * pt-BR: Hook para obter Blob de recibo PDF (admin).
 * en-US: Hook to get receipt PDF Blob (admin).
 */
export function useReceiptPdf(id?: number | string) {
  return useQuery({
    queryKey: ["orders", "receipt", id],
    queryFn: async () => {
      const blob = await ordersService.getReceiptPdf(id as number | string);
      return blob;
    },
    enabled: !!id,
  });
}

