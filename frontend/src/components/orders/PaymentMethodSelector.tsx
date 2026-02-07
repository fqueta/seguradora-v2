import React from "react";
import { PaymentMethod } from "@/types/orders";

export interface PaymentMethodSelectorProps {
  /** Selected payment method | Método selecionado */
  value: PaymentMethod;
  /** Change handler | Manipulador de mudança */
  onChange: (value: PaymentMethod) => void;
}

/**
 * PaymentMethodSelector
 * pt-BR: Selector para método de pagamento (Cartão, Dinheiro, PIX).
 * en-US: Selector for payment method (Card, Cash, PIX).
 */
export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  const options: { label: string; value: PaymentMethod }[] = [
    { label: "Cartão", value: PaymentMethod.Card },
    { label: "Dinheiro", value: PaymentMethod.Cash },
    { label: "PIX", value: PaymentMethod.Pix },
  ];
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`px-3 py-2 rounded border ${
            value === opt.value ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default PaymentMethodSelector;

