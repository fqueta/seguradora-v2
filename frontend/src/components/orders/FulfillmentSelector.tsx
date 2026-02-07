import React from "react";
import { FulfillmentType } from "@/types/orders";

export interface FulfillmentSelectorProps {
  /** Selected fulfillment type | Tipo de atendimento selecionado */
  value: FulfillmentType;
  /** Change handler | Manipulador de mudança */
  onChange: (value: FulfillmentType) => void;
}

/**
 * FulfillmentSelector
 * pt-BR: Selector para retirada ou entrega.
 * en-US: Selector for pickup or delivery.
 */
export function FulfillmentSelector({
  value,
  onChange,
}: FulfillmentSelectorProps) {
  const options: { label: string; value: FulfillmentType }[] = [
    { label: "Retirada", value: FulfillmentType.Pickup },
    { label: "Entrega", value: FulfillmentType.Delivery },
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

export default FulfillmentSelector;

