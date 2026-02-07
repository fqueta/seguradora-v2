import React from "react";
import { OrderItem } from "@/types/orders";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  items: OrderItem[];
  total: number;
  onRemoveItem: (index: number) => void;
  onChangeQuantity: (index: number, quantity: number) => void;
  onCheckout: () => void;
};

export default function MobileCartSheet({
  open,
  onClose,
  items,
  total,
  onRemoveItem,
  onChangeQuantity,
  onCheckout,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent side="bottom" className="flex flex-col h-[85vh] rounded-t-[20px] px-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-xl font-bold text-center sm:text-left">Carrinho</SheetTitle>
          <SheetDescription className="text-center sm:text-left">
            {items.length} itens selecionados
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <p>Seu carrinho está vazio</p>
              </div>
            ) : (
              items.map((it, idx) => (
                <div key={`${it.productId}-${idx}`} className="flex items-center gap-4 py-2">
                  {/* Quantity Controls */}
                  <div className="flex items-center border rounded-lg overflow-hidden shrink-0 h-9">
                    <button
                      className="h-full w-9 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50"
                      onClick={() => onChangeQuantity(idx, Math.max(1, it.quantity - 1))}
                      disabled={it.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <div className="h-full w-9 flex items-center justify-center text-sm font-semibold border-x bg-gray-50">
                      {it.quantity}
                    </div>
                    <button
                      className="h-full w-9 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      onClick={() => onChangeQuantity(idx, it.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm line-clamp-1">{it.title ?? `#${it.productId}`}</h4>
                    </div>
                    {it.variationGroups && it.variationGroups.length > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                        {it.variationGroups.map((group) => (
                          <div key={group.name} className="flex gap-1 flex-wrap">
                            <span className="font-bold">{group.name}:</span>
                            <span>{group.options.map(o => o.name).join(", ")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {it.notes && (
                      <div className="text-[10px] text-orange-500 font-medium italic mt-0.5 mt-1 border-l-2 border-orange-200 pl-2">
                         obs: {it.notes}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-primary">
                        R$ {(it.totalPrice || it.unitPrice * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                   <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => onRemoveItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-white p-6 pb-safe space-y-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          
           <Button 
             className="w-full h-12 text-base rounded-xl font-bold shadow-lg shadow-primary/20" 
             size="lg"
             onClick={onCheckout}
             disabled={items.length === 0}
          >
            Finalizar Pedido
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

