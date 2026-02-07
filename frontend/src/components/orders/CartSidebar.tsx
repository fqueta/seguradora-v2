import React from "react";
import { OrderItem, PaymentMethod, FulfillmentType } from "@/types/orders";

export interface CartSidebarProps {
  /** Items in cart | Itens no carrinho */
  items: OrderItem[];
  /** Remove item | Remover item */
  onRemoveItem: (index: number) => void;
  /** Change quantity | Alterar quantidade */
  onChangeQuantity: (index: number, quantity: number) => void;
  /** Total computed | Total calculado */
  total: number;
  /** Proceed to checkout | Prosseguir para checkout */
  onCheckout: () => void;
}

/**
 * CartSidebar
 * pt-BR: Barra lateral do carrinho com itens e total.
 * en-US: Cart sidebar listing items and total.
 */
export function CartSidebar({
  items,
  onRemoveItem,
  onChangeQuantity,
  total,
  onCheckout,
}: CartSidebarProps) {
  return (
    <aside className="w-full lg:w-80 border rounded-lg p-4 bg-card">
      <h3 className="text-lg font-semibold mb-3">Seu pedido</h3>
      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Adicione itens ao carrinho.
          </div>
        )}
        {items.map((item, idx) => (
          <div
            key={item.productId}
            className="flex items-center justify-between gap-2 border-b pb-2"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm line-clamp-1">{item.title ?? `Item #${item.productId}`}</div>
              {item.variationGroups && item.variationGroups.length > 0 && (
                <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                  {item.variationGroups.map((group) => (
                    <div key={group.name} className="flex gap-1 flex-wrap">
                      <span className="font-bold">{group.name}:</span>
                      <span>{group.options.map(o => o.name).join(", ")}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.notes && (
                <div className="text-[10px] text-orange-500 font-medium italic mt-1 border-l-2 border-orange-200 pl-2">
                  obs: {item.notes}
                </div>
              )}
              <div className="text-xs font-bold text-primary mt-1">
                R$ {(item.totalPrice || item.unitPrice * item.quantity).toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded border"
                onClick={() => onChangeQuantity(idx, Math.max(1, item.quantity - 1))}
              >
                −
              </button>
              <div className="w-8 text-center">{item.quantity}</div>
              <button
                type="button"
                className="w-8 h-8 rounded border"
                onClick={() => onChangeQuantity(idx, item.quantity + 1)}
              >
                +
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-xs"
                onClick={() => onRemoveItem(idx)}
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-semibold">R$ {total.toFixed(2)}</span>
      </div>
      <button
        className="mt-4 w-full px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        disabled={items.length === 0}
        onClick={onCheckout}
      >
        Finalizar pedido
      </button>
    </aside>
  );
}

export default CartSidebar;

