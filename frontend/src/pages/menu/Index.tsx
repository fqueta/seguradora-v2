import React, { useMemo, useState } from "react";
import { useStoreProductsList } from "@/hooks/products";
import { Product } from "@/types/products";
import { OrderItem, FulfillmentType } from "@/types/orders";
import MenuList from "@/components/orders/MenuList";
import CartSidebar from "@/components/orders/CartSidebar";
import PublicAppLayout from "@/layouts/PublicAppLayout";
import MobileCartSheet from "@/components/mobile/MobileCartSheet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMesaByToken } from "@/hooks/mesas";
import { Mesa } from "@/types/mesas";
import { ProductSelectionModal } from "@/components/orders/ProductSelectionModal";

/**
 * MenuPage
 * pt-BR: Página pública do cardápio com carrinho lateral.
 * en-US: Public menu page with lateral cart.
 */
const MenuPage = () => {
  // Vitrine pública
  const storeQuery = useStoreProductsList({ per_page: 200 });
  const [searchParams] = useSearchParams();
  const mesaToken = searchParams.get("mesa");
  const mesaQuery = useMesaByToken(mesaToken || undefined);
  const mesa = (mesaQuery.data as any)?.data as Mesa | undefined;

  const products: Product[] = useMemo(() => {
    return ((storeQuery.data as any)?.data as Product[]) || [];
  }, [storeQuery.data]);

  const [items, setItems] = useState<OrderItem[]>([]);
  const navigate = useNavigate();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openProductConfig = (p: Product) => {
    setSelectedProduct(p);
    setIsModalOpen(true);
  };

  const handleConfirmAddToCart = (newItem: OrderItem) => {
    setItems((prev) => {
      // For items with variations, we don't necessarily want to group them unless they are identical
      // But for simplicity, let's just add it as a new item or find if an identical configuration exists
      const isIdentical = (it: OrderItem) => 
        String(it.productId) === String(newItem.productId) && 
        it.notes === newItem.notes && 
        JSON.stringify(it.variationGroups) === JSON.stringify(newItem.variationGroups);

      const idx = prev.findIndex(isIdentical);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += newItem.quantity;
        next[idx].totalPrice = next[idx].quantity * next[idx].unitPrice;
        return next;
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const changeQuantity = (index: number, quantity: number) => {
    setItems((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index].quantity = quantity;
        next[index].totalPrice = quantity * next[index].unitPrice;
      }
      return next;
    });
  };

  const total = items.reduce((sum, it) => sum + (it.totalPrice ?? it.quantity * it.unitPrice), 0);

  const goToCheckout = () => {
    // Envia carrinho via state para a página de checkout
    navigate("/checkout", { 
      state: { 
        items, 
        total, 
        fulfillmentType: mesa ? FulfillmentType.Pickup : FulfillmentType.Pickup, // Default pickup
        mesaId: mesa ? Number(mesa.id) : null
      } 
    });
  };

  if (storeQuery.isLoading) {
    return <div className="p-6">Carregando cardápio...</div>;
  }
  if (storeQuery.error && !products.length) {
    return <div className="p-6 text-destructive">Erro ao carregar cardápio</div>;
  }

  return (
    <PublicAppLayout
      onCartClick={() => setMobileCartOpen(true)}
      cartCount={items.reduce((n, it) => n + it.quantity, 0)}
      cartTotal={total}
    >
      {mesa && (
        <div className="bg-primary/10 border-b border-primary/20 p-3 mb-4 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-primary">Você está na mesa:</span>
            <span className="ml-2 font-bold text-lg">{mesa.name}</span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Os pedidos feitos aqui serão entregues nesta mesa.
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="lg:col-span-2">
          <MenuList products={products} onAddToCart={openProductConfig} />
        </div>
        <div className="hidden lg:block">
          <CartSidebar
            items={items}
            onRemoveItem={removeItem}
            onChangeQuantity={changeQuantity}
            total={total}
            onCheckout={goToCheckout}
          />
        </div>
      </div>
      <ProductSelectionModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleConfirmAddToCart}
      />
      <MobileCartSheet
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        items={items}
        total={total}
        onRemoveItem={removeItem}
        onChangeQuantity={changeQuantity}
        onCheckout={goToCheckout}
      />
    </PublicAppLayout>
  );
};

export default MenuPage;

