import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Order } from "@/types/orders";
import PublicAppLayout from "@/layouts/PublicAppLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Home, ShoppingBag, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import OrderPrintView from "@/components/orders/OrderPrintView";
import { Badge } from "@/components/ui/badge";

const OrderSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const order = (location.state?.order as Order) || undefined;
  
  const isAdmin = user && user.permission_id && Number(user.permission_id) <= 4;

  const handlePrint = () => {
    window.print();
  };

  return (
    <PublicAppLayout cartCount={0} cartTotal={0}>
      <div className="max-w-2xl mx-auto py-12 px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="mb-10 flex justify-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl relative z-10 ring-8 ring-primary/5">
            <CheckCircle2 className="w-20 h-20 text-primary stroke-[1.5]" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Pedido enviado!</h1>
        <p className="text-lg text-gray-500 mb-10 font-medium max-w-md mx-auto leading-relaxed">
          Seu pedido foi recebido com sucesso e já está sendo processado pela nossa equipe.
        </p>

        {order && (
          <div className="bg-white border-none rounded-[2rem] p-8 mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-left space-y-4 max-w-sm mx-auto relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShoppingBag className="w-24 h-24" />
             </div>
             
             <div className="flex justify-between items-center pb-4 border-b border-gray-100 relative z-10">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Número do pedido</span>
                <Badge className="bg-primary/10 text-primary border-none font-black text-lg px-4 py-1 rounded-xl">
                   #{order.id}
                </Badge>
             </div>
             
             {order.token && (
               <div className="flex flex-col gap-2 pt-2 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Token de segurança</span>
                  <div className="flex items-center gap-2">
                     <code className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl text-sm font-mono text-gray-500 flex-1 select-all tracking-wider">
                        {order.token.substring(0, 8).toUpperCase()}...
                     </code>
                  </div>
               </div>
             )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
          {isAdmin && order && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handlePrint}
              className="flex-1 h-14 rounded-2xl gap-3 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs"
            >
              <Printer className="w-5 h-5" />
              Imprimir
            </Button>
          )}

          <Button 
            variant="default" 
            size="lg" 
            onClick={() => navigate("/menu")}
            className="flex-1 h-14 rounded-2xl gap-3 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-5 h-5" />
            Cardápio
          </Button>
        </div>

        {!isAdmin && (
           <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/admin/orders")}
              className="mt-8 text-gray-400 hover:text-primary transition-colors font-bold gap-2"
           >
              Acompanhar meus pedidos
              <ArrowRight className="w-4 h-4" />
           </Button>
        )}

        {/* Hidden View for Printing */}
        {order && (
          <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
             <OrderPrintView order={order} />
          </div>
        )}
      </div>
    </PublicAppLayout>
  );
};

export default OrderSuccessPage;
