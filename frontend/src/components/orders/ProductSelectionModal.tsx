import React, { useState, useMemo, useEffect } from "react";
import { Product, VariationGroup, VariationOption } from "@/types/products";
import { OrderItem, SelectedVariationGroup, SelectedOption } from "@/types/orders";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingBasket, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSelectionModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: OrderItem) => void;
}

export function ProductSelectionModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: ProductSelectionModalProps) {
  const [selectedVariations, setSelectedVariations] = useState<Record<string, SelectedOption[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedVariations({});
      setQuantity(1);
      setNotes("");
    }
  }, [product]);

  const variationGroups = useMemo(() => product?.variationGroups || [], [product]);

  const handleOptionToggle = (groupName: string, option: VariationOption, isSingle: boolean) => {
    setSelectedVariations((prev) => {
      const current = prev[groupName] || [];
      const optionExists = current.find((o) => o.name === option.name);

      if (isSingle) {
        return {
          ...prev,
          [groupName]: [{ name: option.name, price: Number(option.price) }],
        };
      }

      if (optionExists) {
        return {
          ...prev,
          [groupName]: current.filter((o) => o.name !== option.name),
        };
      }

      // Check max choices
      const group = variationGroups.find((g) => g.name === groupName);
      if (group && current.length >= group.maxChoices) {
        return prev;
      }

      return {
        ...prev,
        [groupName]: [...current, { name: option.name, price: Number(option.price) }],
      };
    });
  };

  const totalPricePerUnit = useMemo(() => {
    if (!product) return 0;
    let total = Number(product.salePrice) || 0;

    Object.values(selectedVariations).forEach((options) => {
      options.forEach((opt) => {
        total += opt.price;
      });
    });

    return total;
  }, [product, selectedVariations]);

  const isValid = useMemo(() => {
    return variationGroups.every((group) => {
      if (!group.required) return true;
      const selected = selectedVariations[group.name] || [];
      return selected.length >= group.minChoices;
    });
  }, [variationGroups, selectedVariations]);

  const handleAdd = () => {
    if (!product || !isValid) return;

    const variationGroupsPayload: SelectedVariationGroup[] = Object.entries(selectedVariations)
      .filter(([_, options]) => options.length > 0)
      .map(([name, options]) => ({
        name,
        options,
      }));

    onAddToCart({
      productId: Number(product.id),
      title: product.name,
      notes,
      quantity,
      unitPrice: totalPricePerUnit,
      totalPrice: totalPricePerUnit * quantity,
      variationGroups: variationGroupsPayload,
    });

    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none bg-gray-50 max-h-[90vh] flex flex-col">
        <ScrollArea className="flex-1">
          {/* Header Image */}
          <div className="relative h-48 sm:h-64 bg-gray-200">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <ShoppingBasket className="w-16 h-16 text-gray-300" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-md"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Product Info */}
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-gray-900">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {product.description}
                </p>
              )}
              <div className="text-lg font-bold text-primary">
                A partir de R$ {Number(product.salePrice).toFixed(2)}
              </div>
            </div>

            {/* Variation Groups */}
            {variationGroups.map((group) => (
              <div key={group.name} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{group.name}</h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {group.required ? `Obrigatório • Escolha ${group.minChoices}` : `Opcional • Escolha até ${group.maxChoices}`}
                    </p>
                  </div>
                  {group.required && (
                    <Badge variant="secondary" className="bg-gray-900 text-white rounded-md text-[10px] uppercase font-black px-2 py-0.5">
                      Obrigatório
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {group.options.map((option) => (
                    <div
                      key={option.name}
                      className="flex items-center justify-between py-1 transition-colors group"
                    >
                      <Label
                        htmlFor={`${group.name}-${option.name}`}
                        className="flex-1 cursor-pointer flex items-center justify-between mr-4"
                      >
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">
                            {option.name}
                          </span>
                          {Number(option.price) > 0 && (
                            <div className="text-xs font-bold text-primary">
                              + R$ {Number(option.price).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </Label>

                      <div className="flex items-center">
                        {group.maxChoices === 1 && group.minChoices === 1 ? (
                          <RadioGroup
                            value={(selectedVariations[group.name]?.[0]?.name) || ""}
                            onValueChange={() => handleOptionToggle(group.name, option, true)}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={option.name}
                                id={`${group.name}-${option.name}`}
                                className="border-gray-300 text-primary focus:ring-primary"
                              />
                            </div>
                          </RadioGroup>
                        ) : (
                          <Checkbox
                            id={`${group.name}-${option.name}`}
                            checked={!!(selectedVariations[group.name] || []).find((o) => o.name === option.name)}
                            onCheckedChange={() => handleOptionToggle(group.name, option, false)}
                            className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Alguma observação?
                <Badge variant="outline" className="font-bold border-gray-200 text-gray-400">Opcional</Badge>
              </h3>
              <Textarea
                placeholder="Ex: Tirar cebola, maionese à parte, etc."
                className="min-h-[100px] rounded-xl border-gray-100 bg-gray-50 focus-visible:ring-primary resize-none placeholder:text-gray-300"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer with Quantity and Add Button */}
        <DialogFooter className="p-4 sm:p-6 bg-white border-t border-gray-100 flex flex-row items-center justify-between gap-4 sm:gap-6 mt-0">
          <div className="flex items-center bg-gray-100 rounded-2xl p-1 h-14 border border-gray-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-xl text-gray-500 hover:text-primary hover:bg-white transition-all shadow-none hover:shadow-sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="w-10 text-center font-black text-xl text-gray-900">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-xl text-gray-500 hover:text-primary hover:bg-white transition-all shadow-none hover:shadow-sm"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <Button
            className="flex-1 h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 transition-all active:scale-95 group relative overflow-hidden"
            disabled={!isValid}
            onClick={handleAdd}
          >
            <span className="relative z-10 flex items-center justify-between w-full px-2">
               <span>Adicionar</span>
               <span className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md">
                 R$ {(totalPricePerUnit * quantity).toFixed(2)}
               </span>
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
