import { BaseApiService } from "./BaseApiService";
import { PaginatedResponse } from "@/types/index";
import {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStatus,
} from "@/types/orders";

/**
 * OrdersService
 * pt-BR: Serviço de pedidos — criação pública e gestão admin.
 * en-US: Orders service — public creation and admin management.
 */
class OrdersService extends BaseApiService {
  private readonly endpoint = "/orders";
  /**
   * mapOrderDTO
   * pt-BR: Converte o DTO do backend para o tipo Order usado no frontend.
   * en-US: Maps backend DTO to frontend Order type.
   */
  private mapOrderDTO(dto: any): Order {
    const items = Array.isArray(dto?.items)
      ? dto.items.map((it: any) => ({
          productId: Number(it?.product_id ?? it?.productId),
          title: it?.title ?? undefined,
          notes: it?.notes ?? undefined,
          quantity: Number(it?.quantity ?? 0),
          unitPrice: Number(it?.unit_price ?? it?.unitPrice ?? 0),
          totalPrice: Number(it?.total_price ?? it?.totalPrice ?? (Number(it?.quantity ?? 0) * Number(it?.unit_price ?? it?.unitPrice ?? 0))),
        }))
      : [];
    return {
      id: dto?.id ?? dto?.ID,
      token: dto?.token,
      status: dto?.status,
      printStatus: dto?.print_status ?? null,
      fulfillmentType: dto?.fulfillment_type ?? dto?.fulfillmentType,
      paymentMethod: dto?.payment_method ?? dto?.paymentMethod,
      mesaId: dto?.mesa_id ?? dto?.mesaId ?? null,
      priority: dto?.priority ?? "normal",
      customer: {
        name: dto?.customer_name ?? dto?.customer?.name ?? "",
        phone: dto?.customer_phone ?? dto?.customer?.phone ?? "",
        address: dto?.delivery_address ?? dto?.customer?.address ?? null,
      },
      notes: dto?.notes ?? undefined,
      adminNotes: dto?.admin_notes ?? undefined,
      kitchenNotes: dto?.kitchen_notes ?? undefined,
      printTemplate: dto?.print_template ?? undefined,
      printCopies: dto?.print_copies ?? undefined,
      printedAt: dto?.printed_at ?? undefined,
      items,
      totalAmount: Number(dto?.total_amount ?? dto?.totalAmount ?? 0),
      createdAt: dto?.created_at ?? dto?.createdAt,
      updatedAt: dto?.updated_at ?? dto?.updatedAt,
    };
  }

  /**
   * list
   * pt-BR: Lista pedidos com filtros e paginação (área admin).
   * en-US: Lists orders with filters and pagination (admin area).
   */
  async list(params?: Record<string, any>): Promise<PaginatedResponse<Order>> {
    const res = await this.get<any>(this.endpoint, params);
    const paginated = this.normalizePaginatedResponse<any>(res);
    const mapped = {
      ...paginated,
      data: (paginated.data ?? []).map((dto: any) => this.mapOrderDTO(dto)),
    } as PaginatedResponse<Order>;
    return mapped;
  }

  /**
   * getById
   * pt-BR: Obtém um pedido por ID (admin).
   * en-US: Retrieves an order by ID (admin).
   */
  async getById(id: number | string): Promise<Order> {
    const response = await this.get<any>(`${this.endpoint}/${id}`);
    const dto = response?.data ?? response;
    return this.mapOrderDTO(dto);
  }

  /**
   * create
   * pt-BR: Cria pedido público (cliente) — sem autenticação.
   * en-US: Creates public order (customer) — no authentication.
   */
  async create(payload: CreateOrderPayload): Promise<Order> {
    const response = await this.post<any>(this.endpoint, payload);
    const dto = response?.data ?? response;
    return this.mapOrderDTO(dto);
  }

  /**
   * update
   * pt-BR: Atualiza campos do pedido (admin).
   * en-US: Updates order fields (admin).
   */
  async update(id: number | string, payload: UpdateOrderPayload): Promise<Order> {
    const response = await this.put<any>(`${this.endpoint}/${id}`, payload);
    const dto = response?.data ?? response;
    return this.mapOrderDTO(dto);
  }

  /**
   * updateStatus
   * pt-BR: Atualiza apenas o status do pedido (admin).
   * en-US: Updates only the order status (admin).
   */
  async updateStatus(id: number | string, status: OrderStatus): Promise<Order> {
    const response = await this.put<any>(`${this.endpoint}/${id}/status`, { status });
    const dto = response?.data ?? response;
    return this.mapOrderDTO(dto);
  }

  /**
   * delete
   * pt-BR: Exclui pedido (admin).
   * en-US: Deletes order (admin).
   */
  async delete(id: number | string): Promise<any> {
    return this.delete<any>(`${this.endpoint}/${id}`);
  }

  /**
   * getReceiptPdf
   * pt-BR: Obtém PDF de recibo para impressão (admin).
   * en-US: Fetches receipt PDF for printing (admin).
   */
  async getReceiptPdf(
    id: number | string,
    opts?: { template?: "receipt" | "kitchen"; copies?: number; adminNotes?: string; kitchenNotes?: string; priority?: "low" | "normal" | "high" }
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (opts?.template) params.set("template", opts.template);
    if (opts?.copies) params.set("copies", String(Math.max(1, opts.copies)));
    if (opts?.adminNotes) params.set("adminNotes", opts.adminNotes);
    if (opts?.kitchenNotes) params.set("kitchenNotes", opts.kitchenNotes);
    if (opts?.priority) params.set("priority", opts.priority);
    const qs = params.toString();
    const url = `${this.API_BASE_URL}${this.endpoint}/${id}/receipt.pdf${qs ? `?${qs}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Falha ao obter recibo PDF");
    }
    return response.blob();
  }
}

export const ordersService = new OrdersService();

