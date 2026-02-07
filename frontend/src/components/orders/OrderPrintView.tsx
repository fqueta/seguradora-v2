import React from "react";
import { Order } from "@/types/orders";

export interface OrderPrintViewProps {
  /** Order to render | Pedido para renderizar */
  order: Order;
}

/**
 * OrderPrintView
 * pt-BR: Visualização do pedido preparada para impressão.
 * en-US: Order view prepared for printing.
 */
export function OrderPrintView({ order }: OrderPrintViewProps) {
  const total = order.items.reduce(
    (sum, it) => sum + (it.totalPrice ?? it.quantity * it.unitPrice),
    0
  );

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="bg-white text-black w-full max-w-[80mm] mx-auto font-mono text-[12px] leading-tight print:p-0">
      {/* Header */}
      <div className="text-center mb-4 border-b border-dashed pb-2">
        <h1 className="text-lg font-bold uppercase tracking-widest">Recibo de Pedido</h1>
        <div className="text-[10px] mt-1">
          #{order.id ?? "-"} • {order.token?.slice(0, 8) ?? ""}
        </div>
        <div className="text-[10px] mt-1">
          {new Date(order.createdAt || "").toLocaleString("pt-BR")}
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between">
          <span className="font-bold">CLIENTE:</span>
          <span>{order.customer.name.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">FONE:</span>
          <span>{order.customer.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">PEDIDO:</span>
          <span>{order.fulfillmentType === "delivery" ? "ENTREGA" : "RETIRADA"}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">PGTO:</span>
          <span>
            {order.paymentMethod === "card"
              ? "CARTÃO"
              : order.paymentMethod === "cash"
              ? "DINHEIRO"
              : "PIX"}
          </span>
        </div>
      </div>

      {/* Address */}
      {order.fulfillmentType === "delivery" && order.customer.address && (
        <div className="mb-3 border-t border-dashed pt-2">
          <div className="font-bold text-[10px] mb-1">ENDEREÇO DE ENTREGA:</div>
          <div className="text-[11px]">
            {order.customer.address.street ?? ""}, {order.customer.address.number ?? ""}
            {order.customer.address.complement ? ` - ${order.customer.address.complement}` : ""}
          </div>
          <div className="text-[11px]">
            {order.customer.address.neighborhood ?? ""} - {order.customer.address.city ?? ""}
          </div>
          {order.customer.address.zip && <div className="text-[11px]">{order.customer.address.zip}</div>}
        </div>
      )}

      {/* Items Table */}
      <div className="border-t border-dashed pt-2 mb-2">
        <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-dashed mb-1">
          <span className="w-1/2">ITEM</span>
          <span className="w-1/6 text-right">QTD</span>
          <span className="w-1/3 text-right">TOTAL</span>
        </div>
        {order.items.map((it, idx) => (
          <div key={`${it.productId}-${idx}`} className="mb-1">
            <div className="flex justify-between items-start">
              <span className="w-2/3 leading-none">{it.title?.toUpperCase() ?? `#${it.productId}`}</span>
              <span className="w-1/6 text-right">{it.quantity}x</span>
              <span className="w-1/3 text-right">
                {formatBRL(it.totalPrice ?? it.quantity * it.unitPrice)}
              </span>
            </div>
            {it.variationGroups && it.variationGroups.length > 0 && (
              <div className="text-[9px] text-gray-700 pl-2 space-y-0.5 mt-0.5">
                {it.variationGroups.map((group) => (
                  <div key={group.name} className="flex gap-1 flex-wrap">
                    <span className="font-bold">{group.name.toUpperCase()}:</span>
                    <span>{group.options.map(o => o.name.toUpperCase()).join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
            {it.notes && (
              <div className="text-[10px] italic text-gray-600 pl-2 mt-0.5">
                * OBS: {it.notes.toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed pt-2 space-y-1">
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL:</span>
          <span>{formatBRL(total)}</span>
        </div>
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="mt-4 p-2 border border-dashed text-[11px]">
          <div className="font-bold mb-1">OBSERVAÇÕES:</div>
          <div className="whitespace-pre-wrap">{order.notes.toUpperCase()}</div>
        </div>
      )}

      {/* Footer Legal Message */}
      <div className="mt-8 text-center space-y-2">
        <div className="border-t border-dashed pt-4">
          <p className="text-[10px] font-bold">OBRIGADO PELA PREFERÊNCIA!</p>
        </div>
        <div className="bg-gray-100 p-2 text-[9px] font-bold leading-tight">
          ESTE DOCUMENTO NÃO SUBSTITUI O CUPOM FISCAL OBRIGATÓRIO
        </div>
      </div>
    </div>
  );
}


export default OrderPrintView;

