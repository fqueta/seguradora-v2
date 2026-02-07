import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useOrder, useUpdateOrder, useUpdateOrderStatus } from "@/hooks/orders";
import { Order, OrderItem, OrderStatus } from "@/types/orders";
import OrderItemsEditor from "@/components/orders/OrderItemsEditor";
import OrderPrintView from "@/components/orders/OrderPrintView";
import PrintButton from "@/components/ui/printbutton";
import { statusLabel } from "@/lib/orderLabels";
import { ordersService } from "@/services/ordersService";
import { buildOrderPdf } from "@/lib/orderPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Save, 
  FileText, 
  Printer, 
  Clock, 
  User, 
  Package, 
  ChevronRight,
  TrendingUp,
  Settings2,
  AlertCircle,
  MessageCircle,
  History,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "bg-orange-100 text-orange-700 border-orange-200";
    case "confirmed": return "bg-blue-100 text-blue-700 border-blue-200";
    case "preparing": return "bg-purple-100 text-purple-700 border-purple-200";
    case "ready": return "bg-green-100 text-green-700 border-green-200";
    case "shipped": return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "delivered": return "bg-slate-100 text-slate-700 border-slate-200";
    case "cancelled": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const AdminOrderShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useOrder(id as string);
  const { mutateAsync: updateOrder, isPending: isSaving } = useUpdateOrder(id as string);
  const { mutateAsync: updateStatus, isPending: isSavingStatus } = useUpdateOrderStatus(id as string);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [template, setTemplate] = useState<"receipt" | "kitchen">("receipt");
  const [copies, setCopies] = useState<number>(1);
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [kitchenNotes, setKitchenNotes] = useState<string>("");
  
  const current = useMemo<Order | undefined>(() => order as Order, [order]);

  useEffect(() => {
    if (current?.items) {
      setItems(current.items);
    }
    if (current?.printTemplate) setTemplate(current.printTemplate as "receipt" | "kitchen");
    if (current?.printCopies) setCopies(current.printCopies);
    if (current?.priority) setPriority(current.priority as "low" | "normal" | "high");
    if (current?.adminNotes) setAdminNotes(current.adminNotes);
    if (current?.kitchenNotes) setKitchenNotes(current.kitchenNotes);
  }, [current]);

  const save = async () => {
    if (!current) return;
    try {
      await updateOrder({ items });
      toast.success("Itens do pedido atualizados.");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar itens");
    }
  };

  const changeStatus = async (status: OrderStatus) => {
    try {
      await updateStatus(status);
      toast.success(`Status alterado para: ${statusLabel(status)}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao atualizar status");
    }
  };

  const openPdf = async () => {
    try {
      const blob = await ordersService.getReceiptPdf(id as string, {
        template,
        copies,
        adminNotes,
        kitchenNotes,
        priority,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      try {
        if (!current) throw new Error("Pedido não carregado");
        const blob = await buildOrderPdf(current, { template, copies });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        toast.info("PDF gerado no frontend.");
      } catch (e: any) {
        toast.error("Erro ao gerar PDF.");
      }
    }
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Clock className="animate-spin text-primary w-8 h-8" /></div>;
  if (error || !current) return <div className="p-10 text-center"><AlertCircle className="mx-auto w-12 h-12 text-destructive mb-2" /> <p className="text-destructive font-bold">Pedido não encontrado</p></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border print:hidden">
        <div className="flex items-center gap-6">
           <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-8 h-8" />
           </Button>
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getStatusColor(current.status)}`}>
              <TrendingUp className="w-8 h-8" />
           </div>
           <div>
              <div className="flex items-center gap-2">
                 <h1 className="text-3xl font-black tracking-tighter text-gray-900 leading-none">Pedido #{current.id}</h1>
                 <Badge className={`rounded-xl border-2 px-3 py-1 font-bold ${getStatusColor(current.status)}`}>
                    {statusLabel(current.status)}
                 </Badge>
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                 <Clock className="w-4 h-4" /> 
                 {new Date(current.createdAt || "").toLocaleString("pt-BR")}
              </p>
           </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" className="rounded-xl font-bold h-12" onClick={() => openPdf()}>
            <FileText className="mr-2 h-5 w-5" />
            PDF
          </Button>
          <div className="scale-110">
             <PrintButton />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8">
        <div className="space-y-8 print:hidden">
          {/* Status Selection Area */}
          <Card className="rounded-3xl shadow-sm border overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Mudar Status
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {Object.values(OrderStatus).map((st) => (
                  <Button
                    key={st}
                    variant={current.status === st ? "default" : "outline"}
                    className={`rounded-xl font-bold transition-all ${current.status === st ? "shadow-lg shadow-primary/20 scale-105" : "hover:border-primary/50"}`}
                    onClick={() => changeStatus(st as OrderStatus)}
                    disabled={isSavingStatus}
                  >
                    {statusLabel(String(st))}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items Editor Area */}
          <Card className="rounded-3xl shadow-sm border overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b flex flex-row items-center justify-between space-y-0">
               <div className="space-y-1">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                     <Package className="w-5 h-5 text-primary" />
                     Itens do Pedido
                  </CardTitle>
               </div>
               <Button size="sm" className="rounded-xl font-bold" disabled={isSaving} onClick={save}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Itens
               </Button>
            </CardHeader>
            <CardContent className="p-6">
              <OrderItemsEditor items={items} onChange={setItems} />
            </CardContent>
          </Card>

          {/* Details & Config Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl shadow-sm border overflow-hidden">
               <CardHeader className="bg-gray-50/50 border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                     <Settings2 className="w-5 h-5 text-primary" />
                     Impressão
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={template} onValueChange={(val: any) => setTemplate(val)}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="receipt">Recibo do Cliente</SelectItem>
                         <SelectItem value="kitchen">Ficha de Cozinha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Cópias</Label>
                        <Input
                          type="number"
                          min={1}
                          className="rounded-xl h-11 font-bold"
                          value={copies}
                          onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || "1", 10)))}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label>Prioridade</Label>
                        <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                           <SelectTrigger className="rounded-xl h-11 font-bold"><SelectValue /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">Urgente</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border overflow-hidden">
               <CardHeader className="bg-gray-50/50 border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                     <History className="w-5 h-5 text-primary" />
                     Notas Internas
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Settings2 className="w-3 h-3"/> Notas Admin</Label>
                    <Textarea
                      className="rounded-xl min-h-[60px] resize-none"
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Package className="w-3 h-3"/> Notas Cozinha</Label>
                    <Textarea
                      className="rounded-xl min-h-[60px] resize-none border-orange-200 focus:ring-orange-200"
                      rows={2}
                      value={kitchenNotes}
                      onChange={(e) => setKitchenNotes(e.target.value)}
                    />
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar: Preview Area */}
        <div className="lg:sticky lg:top-8 flex flex-col gap-6">
           <div className="flex items-center gap-2 px-2">
              <div className="w-2 h-8 bg-primary rounded-full"></div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Pré-visualização</h2>
           </div>
           
           <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-gray-100 overflow-hidden relative group">
              {/* Receipt Visualizer */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-200/50 to-transparent z-10 pointer-events-none"></div>
              <ScrollArea className="max-h-[80vh] bg-white p-4">
                 <div className="p-6 bg-white shadow-[0_0_40px_rgba(0,0,0,0.05)] rounded-lg mx-auto relative overflow-hidden">
                    {/* Decorative Serrated Edge (Simulated) */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-[radial-gradient(circle_at_50%_100%,transparent_50%,white_55%)] bg-[length:12px_8px] bg-repeat-x rotate-180 -translate-y-1"></div>
                    
                    <OrderPrintView order={current} />
                    
                    <div className="mt-8 pt-8 border-t border-dashed text-center opacity-30">
                       <p className="text-[10px] font-mono tracking-widest uppercase">Fim do Recibo</p>
                    </div>
                 </div>
              </ScrollArea>
              
              <div className="p-6 bg-gray-50 border-t flex flex-col gap-3">
                 <p className="text-xs text-center font-medium text-gray-400">Esta é uma representação do que será impresso.</p>
                 <Button className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20" onClick={() => window.print()}>
                    <Printer className="mr-2 h-5 w-5" />
                    Imprimir Agora
                 </Button>
              </div>
           </div>

           {/* Customer Summary Card */}
           <Card className="rounded-3xl shadow-sm bg-primary/5 border-primary/10 overflow-hidden">
              <CardContent className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                       <User className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">Cliente</p>
                       <h3 className="text-lg font-black text-gray-900 leading-tight">{current.customer.name}</h3>
                    </div>
                 </div>
                 <Separator className="bg-primary/20 mb-4" />
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase">Pagamento</p>
                       <p className="text-sm font-bold text-gray-700">{current.paymentMethod === "card" ? "Cartão" : current.paymentMethod === "cash" ? "Dinheiro" : "PIX"}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase">Atendimento</p>
                       <p className="text-sm font-bold text-gray-700">{current.fulfillmentType === "delivery" ? "Entrega" : "Retirada"}</p>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderShow;

