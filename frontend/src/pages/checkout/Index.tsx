import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OrderItem, FulfillmentType, PaymentMethod, CustomerInfo, Order } from "@/types/orders";
import FulfillmentSelector from "@/components/orders/FulfillmentSelector";
import PaymentMethodSelector from "@/components/orders/PaymentMethodSelector";
import CustomerForm from "@/components/orders/CustomerForm";
import { useCreateOrder } from "@/hooks/orders";
import PublicAppLayout from "@/layouts/PublicAppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const initialItems: OrderItem[] = useMemo(() => {
    const stateItems = location.state?.items as OrderItem[] | undefined;
    return Array.isArray(stateItems) ? stateItems : [];
  }, [location.state]);

  const [items, setItems] = useState<OrderItem[]>(initialItems);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    (location.state?.fulfillmentType as FulfillmentType) || FulfillmentType.Pickup
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Card);
  
  // Load initial customer data from localStorage for guests
  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    const stored = localStorage.getItem("guest_customer_info");
    if (stored && !isAuthenticated) {
      try {
        const parsed = JSON.parse(stored);
        return { name: parsed.name || "", phone: parsed.phone || "", address: null };
      } catch (e) {
        return { name: "", phone: "", address: null };
      }
    }
    return { name: "", phone: "", address: null };
  });

  const [notes, setNotes] = useState<string>("");
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<Order | null>(null);

  // Save guest info to localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem("guest_customer_info", JSON.stringify({
        name: customer.name,
        phone: customer.phone
      }));
    }
  }, [customer.name, customer.phone, isAuthenticated]);

  const total = items.reduce((sum, it) => sum + (it.totalPrice ?? it.quantity * it.unitPrice), 0);

  const translateError = (msg: string) => {
    const translations: Record<string, string> = {
      "validation.required": "Este campo é obrigatório.",
      "validation.string": "Deve ser um texto.",
      "validation.max.string": "Valor muito longo.",
      "validation.min.array": "Selecione pelo menos um item.",
    };
    return translations[msg] || msg;
  };

  const formatWhatsAppMessage = (order: Order) => {
    const adminPhone = "5532991648202";
    let message = `*Novo Pedido #${order.id}*\n`;
    message += `--------------------------\n`;
    message += `*Cliente:* ${order.customer.name}\n`;
    message += `*Telefone:* ${order.customer.phone}\n`;
    message += `*Tipo:* ${order.fulfillmentType === FulfillmentType.Delivery ? "Entrega" : "Retirada"}\n`;
    if (order.mesaId) message += `*Mesa:* ${order.mesaId}\n`;
    message += `--------------------------\n`;
    message += `*Itens:*\n`;

    order.items.forEach((item) => {
      message += `${item.quantity}x ${item.title} - R$ ${item.unitPrice.toFixed(2)}\n`;
      if (item.variationGroups && item.variationGroups.length > 0) {
        item.variationGroups.forEach((group) => {
          const options = group.options.map((opt) => opt.name).join(", ");
          message += `  - ${group.name}: ${options}\n`;
        });
      }
      if (item.notes) message += `  - _Obs: ${item.notes}_\n`;
    });

    message += `--------------------------\n`;
    if (order.notes) message += `*Observações Gerais:* ${order.notes}\n`;
    message += `*Pagamento:* ${order.paymentMethod.toUpperCase()}\n`;
    message += `*Total: R$ ${Number(order.totalAmount || total).toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${adminPhone}&text=${encodedMessage}`;
    const mobileWhatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;
    
    // Check if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    window.open(isMobile ? mobileWhatsappUrl : whatsappUrl, "_blank");
  };

  const submit = async () => {
    if (!customer.name) {
      toast({ title: "Dados incompletos", description: "Por favor, informe seu nome.", variant: "destructive" });
      return;
    }
    if (!customer.phone) {
      toast({ title: "Dados incompletos", description: "Por favor, informe seu telefone.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione itens ao carrinho antes de finalizar.", variant: "destructive" });
      return;
    }

    try {
      const mesaId = location.state?.mesaId;
      const order = (await createOrder({
        fulfillmentType,
        paymentMethod,
        customer,
        notes,
        items,
        mesaId: mesaId ? Number(mesaId) : null,
      })) as any;

      const orderData = order.data || order;
      setCreatedOrderData(orderData);
      setShowWhatsAppDialog(true);
    } catch (err: any) {
      if (err.body?.errors) {
        const errors = err.body.errors;
        const firstKey = Object.keys(errors)[0];
        const firstError = errors[firstKey][0];
        
        toast({ 
          title: "Erro de Validação", 
          description: `${firstKey.replace('customer.', '')}: ${translateError(firstError)}`, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Erro ao enviar pedido", 
          description: err?.message || "Ocorreu um erro inesperado.", 
          variant: "destructive" 
        });
      }
    }
  };

  return (
    <PublicAppLayout
      cartCount={items.reduce((n, it) => n + it.quantity, 0)}
      cartTotal={total}
      onActionClick={submit}
      actionLabel={isPending ? "Enviando..." : "Enviar"}
    >
      <div className="container mx-auto p-0 sm:p-4">
        <h1 className="text-2xl font-semibold mb-4">Finalizar Pedido</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Retirada ou Entrega</h2>
              <FulfillmentSelector value={fulfillmentType} onChange={setFulfillmentType} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Pagamento</h2>
              <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Dados do Cliente</h2>
              <CustomerForm value={customer} fulfillmentType={fulfillmentType} onChange={setCustomer} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Observações</h2>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: tirar cebola, ponto da carne, etc."
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Resumo</h2>
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Item</th>
                    <th className="text-right py-2 px-2">Qtd.</th>
                    <th className="text-right py-2 px-2">Unit.</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={`${it.productId}-${idx}`} className="border-b">
                      <td className="py-2 px-2">{it.title ?? `#${it.productId}`}</td>
                      <td className="py-2 px-2 text-right">{it.quantity}</td>
                      <td className="py-2 px-2 text-right">R$ {it.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">
                        R$ {(it.totalPrice ?? it.quantity * it.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2 px-2 font-semibold" colSpan={3}>
                      Total
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">R$ {total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              disabled={isPending || items.length === 0}
              onClick={submit}
            >
              {isPending ? "Enviando..." : "Enviar Pedido"}
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pedido enviado com sucesso!</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar o resumo do pedido pelo WhatsApp para o estabelecimento? 
              Isso ajuda a agilizar o processamento do seu pedido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate("/pedido/sucesso", { state: { order: createdOrderData } })}>
              Não, apenas finalizar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (createdOrderData) formatWhatsAppMessage(createdOrderData);
              navigate("/pedido/sucesso", { state: { order: createdOrderData } });
            }}>
              Sim, enviar WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PublicAppLayout>
  );
};

export default CheckoutPage;

