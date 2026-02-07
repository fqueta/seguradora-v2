import React from "react";
import { OrderItem } from "@/types/orders";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export interface OrderItemsEditorProps {
  /** Current items | Itens atuais */
  items: OrderItem[];
  /** Change handler | Manipulador de mudança */
  onChange: (items: OrderItem[]) => void;
}

/**
 * OrderItemsEditor
 * pt-BR: Editor de itens do pedido (área admin).
 * en-US: Order items editor (admin area).
 */
export function OrderItemsEditor({ items, onChange }: OrderItemsEditorProps) {
  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  
  const formatValueToCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
    }).format(val);
  };

  const handlePriceChange = (idx: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "");
    if (!digits) {
      updateItem(idx, { unitPrice: 0 });
      return;
    }
    const numericValue = Number(digits) / 100;
    updateItem(idx, { unitPrice: numericValue });
  };

  const removeItem = (idx: number) => {

    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  };

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="flex flex-col gap-4">
      {items.map((it, idx) => (
        <div key={`${it.productId}-${idx}`} className="group relative bg-white border rounded-2xl p-4 shadow-sm transition-all hover:border-primary/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Nome do Item</Label>
                <Input
                  className="h-10 font-bold bg-gray-50/50 border-gray-200"
                  value={it.title ?? ""}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                  placeholder="Título do produto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider text-center block">Qtd.</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-10 text-center font-black text-lg"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Preço Unit.</Label>
                    <span className="text-[10px] font-bold text-primary">Sub: {formatBRL.format(it.quantity * it.unitPrice)}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">R$</span>
                    <Input
                      className="h-10 pl-10 text-right font-black text-lg"
                      value={formatValueToCurrency(it.unitPrice)}
                      onChange={(e) => handlePriceChange(idx, e.target.value)}
                    />
                  </div>

                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1">
                  <MessageSquareText className="w-3 h-3" />
                  Observações e Adicionais
                </Label>
                
                {it.variationGroups && it.variationGroups.length > 0 && (
                  <div className="mb-2 p-2 bg-gray-50 rounded-xl border border-dashed text-[11px] space-y-1">
                    {it.variationGroups.map((group) => (
                      <div key={group.name} className="flex gap-1 flex-wrap">
                        <span className="font-bold text-gray-500">{group.name}:</span>
                        <span className="text-gray-900">{group.options.map(o => o.name).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  className="min-h-[60px] text-xs resize-none rounded-xl"
                  value={it.notes ?? ""}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  placeholder="Ex: Sem gelo, limão à parte..."
                />
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-300 hover:text-destructive hover:bg-destructive/5 shrink-0"
              onClick={() => removeItem(idx)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ))}
      
      {items.length === 0 && (
        <div className="py-10 border-2 border-dashed rounded-3xl text-center text-muted-foreground">
          Nenhum item neste pedido.
        </div>
      )}
    </div>
  );
}

export default OrderItemsEditor;

