import React, { useState, useMemo } from "react";
import { useOrdersList, useUpdateStatusMutation } from "@/hooks/orders";

import { OrderStatus, Order } from "@/types/orders";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  PackageCheck, 
  Truck, 
  MoreHorizontal, 
  Search,
  Plus,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  EyeOff,
  Check
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";


/**
 * OrdersKanban
 * pt-BR: Painel Kanban para gestão visual de pedidos em tempo real.
 * en-US: Kanban board for real-time visual order management.
 */
const OrdersKanban = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFinalized, setShowFinalized] = useState(true);
  
  // Formata data para a API
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  const { data: ordersData, isLoading, refetch } = useOrdersList({ 
    date_start: dateStr,
    date_end: dateStr,
    per_page: 200 
  });
  
  const { mutateAsync: updateStatus } = useUpdateStatusMutation();

  const orders = useMemo(() => ordersData?.data || [], [ordersData]);


  // Colunas do Kanban baseadas nos status
  const columns = [
    { 
      id: OrderStatus.Pending, 
      title: "Pendentes", 
      icon: <Clock className="w-5 h-5" />, 
      color: "bg-orange-100 text-orange-600",
      borderColor: "border-orange-200"
    },
    { 
      id: OrderStatus.Confirmed, 
      title: "Confirmados", 
      icon: <CheckCircle2 className="w-5 h-5" />, 
      color: "bg-blue-100 text-blue-600",
      borderColor: "border-blue-200"
    },
    { 
      id: OrderStatus.Preparing, 
      title: "Na Cozinha", 
      icon: <ChefHat className="w-5 h-5" />, 
      color: "bg-purple-100 text-purple-600",
      borderColor: "border-purple-200"
    },
    { 
      id: OrderStatus.Ready, 
      title: "Prontos", 
      icon: <PackageCheck className="w-5 h-5" />, 
      color: "bg-emerald-100 text-emerald-600",
      borderColor: "border-emerald-200"
    },
    { 
      id: OrderStatus.Delivered, 
      title: "Finalizados", 
      icon: <Truck className="w-5 h-5" />, 
      color: "bg-gray-100 text-gray-600",
      borderColor: "border-gray-200"
    },
  ];

  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    e.dataTransfer.setData("orderId", orderId.toString());
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OrderStatus) => {
    const orderId = Number(e.dataTransfer.getData("orderId"));
    if (!orderId) return;

    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
      try {
        await updateStatus({ id: orderId, status: newStatus });
        toast.success(`Pedido #${orderId} atualizado para ${newStatus}`);
        refetch();
      } catch (error) {
        toast.error("Erro ao atualizar status do pedido.");
      }
    }

  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // Filtro de busca
    if (searchTerm) {
      result = result.filter(o => 
        o.id?.toString().includes(searchTerm) || 
        o.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ocultar finalizados se desejar
    if (!showFinalized) {
      result = result.filter(o => o.status !== OrderStatus.Delivered && o.id !== OrderStatus.Canceled as any);
    }

    return result;
  }, [orders, searchTerm, showFinalized]);


  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (isLoading) return <div className="p-10 text-center">Iniciando Painel...</div>;

  return (
    <div className="p-4 lg:p-8 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Gestão Visual</h1>
          <p className="text-muted-foreground mt-2 font-medium">Controle total do fluxo de produção e entregas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Navegação de Data */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 flex items-center gap-2 font-bold text-sm min-w-[140px] justify-center">
              <CalendarIcon className="w-4 h-4 text-primary" />
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              className="pl-10 rounded-xl border-none shadow-sm bg-white h-11" 
              placeholder="ID ou Nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button className="rounded-xl font-bold h-11 gap-2 shadow-lg shadow-primary/20" onClick={() => navigate("/admin/orders/create")}>
            <Plus className="w-4 h-4" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm p-3 rounded-2xl border border-white/50">
        <div className="flex items-center gap-6 px-2">
          <div className="flex items-center gap-2">
            <Switch 
              id="hide-finalized" 
              checked={showFinalized} 
              onCheckedChange={setShowFinalized}
            />
            <Label htmlFor="hide-finalized" className="text-sm font-bold text-gray-600 cursor-pointer flex items-center gap-2">
              {showFinalized ? <Truck className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showFinalized ? "Exibindo Finalizados" : "Ocultando Finalizados"}
            </Label>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <Filter className="w-3 h-3" />
          {filteredOrders.length} pedidos encontrados
        </div>
      </div>


      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-elegant">
        {columns.map((col) => {
          const colOrders = filteredOrders.filter(o => o.status === col.id);
          const colTotal = colOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

          return (
            <div 
              key={col.id} 
              className="min-w-[320px] max-w-[320px] flex flex-col gap-4"
              onDragOver={allowDrop}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-4 rounded-2xl flex items-center justify-between border ${col.borderColor} ${col.color}`}>
                <div className="flex items-center gap-3">
                  {col.icon}
                  <h3 className="font-black uppercase tracking-widest text-xs">{col.title}</h3>
                </div>
                <Badge variant="outline" className="rounded-lg border-current font-black text-[10px]">
                  {colOrders.length}
                </Badge>
              </div>

              <div className="flex-1 space-y-4 min-h-[500px]">
                {colOrders.map((order) => (
                  <Card 
                    key={order.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, order.id!)}
                    className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Pedido #{order.id}</span>
                           <h4 className="font-bold text-gray-900 leading-tight mt-1 group-hover:text-primary transition-colors">
                              {order.customer?.name}
                           </h4>
                        </div>
                        <div className="flex items-start gap-2">
                           <Badge className={`rounded-lg font-bold border-none ${order.fulfillmentType === 'delivery' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                              {order.fulfillmentType === 'delivery' ? 'MTB' : 'BLC'}
                           </Badge>
                           {order.status === OrderStatus.Ready && (
                              <Button 
                                size="icon" 
                                className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDrop({ dataTransfer: { getData: () => order.id!.toString() } } as any, OrderStatus.Delivered);
                                }}
                              >
                                <Check className="w-4 h-4 text-white" />
                              </Button>
                           )}
                        </div>
                      </div>


                      <div className="flex items-center gap-2">
                         <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((it, i) => (
                               <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden" title={it.title}>
                                  {it.title?.charAt(0)}
                               </div>
                            ))}
                         </div>
                         <span className="text-[11px] font-bold text-gray-400">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                         </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                         <p className="font-black text-lg text-gray-900">{formatBRL.format(order.totalAmount || 0)}</p>
                         <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{new Date(order.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {colOrders.length === 0 && (
                   <div className="h-32 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 gap-2">
                      <ArrowRight className="w-6 h-6 opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mover para cá</span>
                   </div>
                )}
              </div>

              {colOrders.length > 0 && (
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 flex justify-between items-center">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total na Coluna</span>
                   <span className="font-black text-gray-600">{formatBRL.format(colTotal)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersKanban;
