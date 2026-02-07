/**
 * Order domain types
 * pt-BR: Tipos do domínio de pedidos para lanchonete/pizzaria.
 * en-US: Order domain types for snack bar/pizzeria use cases.
 */
export enum OrderStatus {
  Pending = "pending",
  Confirmed = "confirmed",
  Preparing = "preparing",
  Ready = "ready",
  Delivered = "delivered",
  Canceled = "canceled",
}

export enum PaymentMethod {
  Card = "card",
  Cash = "cash",
  Pix = "pix",
}

export enum FulfillmentType {
  Pickup = "pickup",
  Delivery = "delivery",
}

export interface CustomerInfo {
  /** Customer full name | Nome completo do cliente */
  name: string;
  /** Customer phone (E.164 or local) | Telefone do cliente (E.164 ou local) */
  phone: string;
  /** Optional delivery address | Endereço de entrega opcional */
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
    complement?: string;
  } | null;
}

export interface SelectedOption {
  name: string;
  price: number;
}

export interface SelectedVariationGroup {
  name: string;
  options: SelectedOption[];
}

export interface OrderItem {
  /** Product ID related to item | ID do produto relacionado ao item */
  productId: number;
  /** Product title/name | Título/nome do produto */
  title?: string;
  /** Item notes or customizations | Observações ou customizações do item */
  notes?: string;
  /** Selected variation groups | Grupos de variações selecionados */
  variationGroups?: SelectedVariationGroup[];
  /** Quantity ordered | Quantidade solicitada */
  quantity: number;
  /** Unit price at order time | Preço unitário no momento do pedido */
  unitPrice: number;
  /** Precomputed total (quantity * unitPrice) | Total calculado */
  totalPrice?: number;
}

export interface Order {
  /** Unique identifier | Identificador único */
  id?: number;
  /** Public token for tracking | Token público para acompanhamento */
  token?: string;
  /** Order current status | Status atual do pedido */
  status: OrderStatus;
  /** Print status | Status de impressão */
  printStatus?: "queued" | "printed" | "failed" | null;
  /** Pickup or delivery | Retirada ou entrega */
  fulfillmentType: FulfillmentType;
  /** Payment method chosen | Método de pagamento escolhido */
  paymentMethod: PaymentMethod;
  /** Priority | Prioridade */
  priority?: "low" | "normal" | "high";
  /** Customer information | Informações do cliente */
  customer: CustomerInfo;
  /** Optional notes | Observações opcionais */
  notes?: string;
  /** Administrative notes | Notas administrativas */
  adminNotes?: string;
  /** Kitchen notes | Notas da cozinha */
  kitchenNotes?: string;
  /** Selected table (Mesa) ID | ID da Mesa selecionada */
  mesaId?: number | null;
  /** Print template | Template de impressão */
  printTemplate?: "receipt" | "kitchen";
  /** Print copies count | Quantidade de cópias para impressão */
  printCopies?: number;
  /** Printed at timestamp | Data/hora de impressão */
  printedAt?: string;
  /** Items in the order | Itens do pedido */
  items: OrderItem[];
  /** Total amount | Valor total */
  totalAmount?: number;
  /** Created/updated timestamps | Datas de criação/atualização */
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  /** Order payload for creation | Payload do pedido para criação */
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  customer: CustomerInfo;
  notes?: string;
  /** Selected table (Mesa) ID | ID da Mesa selecionada */
  mesaId?: number | null;
  items: OrderItem[];
}

export interface UpdateOrderPayload {
  /** Allowed fields for update | Campos permitidos para atualização */
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
  paymentMethod?: PaymentMethod;
  customer?: CustomerInfo;
  notes?: string;
  /** Selected table (Mesa) ID | ID da Mesa selecionada */
  mesaId?: number | null;
  items?: OrderItem[];
}

