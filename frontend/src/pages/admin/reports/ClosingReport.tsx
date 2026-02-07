import React, { useState, useMemo } from "react";
import { useOrdersList } from "@/hooks/orders";
import { OrderStatus } from "@/types/orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { 
  Calendar as CalendarIcon, 
  Printer, 
  Download, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  FileText,
  ChevronLeft,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * ClosingReport
 * pt-BR: Relatório de fechamento de caixa por período/dia.
 * en-US: Cash closing report by period/day.
 */
const ClosingReport = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const { data: ordersData, isLoading } = useOrdersList({
    date_start: date,
    date_end: date,
    per_page: 500
  });

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const summary = useMemo(() => {
    const orders = (ordersData?.data || []).filter(o => o.status !== OrderStatus.Canceled);
    
    // Totais por método de pagamento
    const byMethod = orders.reduce((acc: any, o) => {
      const method = o.paymentMethod || 'other';
      acc[method] = (acc[method] || 0) + (o.totalAmount || 0);
      return acc;
    }, {});

    // Totais por tipo de atendimento
    const byFulfillment = orders.reduce((acc: any, o) => {
      const type = o.fulfillmentType || 'other';
      acc[type] = (acc[type] || 0) + (o.totalAmount || 0);
      return acc;
    }, {});

    const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const orderCount = orders.length;

    return {
      byMethod,
      byFulfillment,
      totalRevenue,
      orderCount,
      orders
    };
  }, [ordersData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50/30 min-h-screen print:bg-white print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-6 h-6" />
           </Button>
           <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Fechamento de Caixa</h1>
              <p className="text-muted-foreground mt-2 font-medium">Resumo financeiro das operações diárias.</p>
           </div>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl font-bold bg-white" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
           </Button>
           <Button className="rounded-xl font-bold shadow-lg shadow-primary/20">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
           </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-3xl border-none shadow-sm print:hidden">
         <CardContent className="p-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <CalendarIcon className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data do Relatório</p>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="border-none p-0 h-auto font-black text-lg focus-visible:ring-0 bg-transparent"
                  />
               </div>
            </div>
            <Separator orientation="vertical" className="h-10 hidden md:block" />
            <div className="flex-1">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-10 rounded-xl border-gray-100 bg-gray-50/50 h-11" placeholder="Filtrar nesta lista..." />
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Summary Sidebar */}
         <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden p-8">
               <div className="space-y-6">
                  <div>
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Receita Total Líquida</p>
                     <h2 className="text-4xl font-black mt-2">{formatBRL.format(summary.totalRevenue)}</h2>
                     <p className="text-emerald-400 text-xs font-bold mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {summary.orderCount} pedidos finalizados
                     </p>
                  </div>
                  
                  <Separator className="bg-slate-800" />
                  
                  <div className="space-y-4">
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Por Método de Pagamento</p>
                     
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-emerald-400" />
                           </div>
                           <span className="text-sm font-bold text-slate-300">Dinheiro</span>
                        </div>
                        <span className="font-black text-white">{formatBRL.format(summary.byMethod['cash'] || 0)}</span>
                     </div>

                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-blue-400" />
                           </div>
                           <span className="text-sm font-bold text-slate-300">Cartão</span>
                        </div>
                        <span className="font-black text-white">{formatBRL.format(summary.byMethod['card'] || 0)}</span>
                     </div>

                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                              <Smartphone className="w-4 h-4 text-purple-400" />
                           </div>
                           <span className="text-sm font-bold text-slate-300">PIX</span>
                        </div>
                        <span className="font-black text-white">{formatBRL.format(summary.byMethod['pix'] || 0)}</span>
                     </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="space-y-4">
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Por Operação</p>
                     
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                              <Truck className="w-4 h-4 text-orange-400" />
                           </div>
                           <span className="text-sm font-bold text-slate-300">Delivery</span>
                        </div>
                        <span className="font-black text-white">{formatBRL.format(summary.byFulfillment['delivery'] || 0)}</span>
                     </div>

                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                              <ShoppingBag className="w-4 h-4 text-pink-400" />
                           </div>
                           <span className="text-sm font-bold text-slate-300">Balcão</span>
                        </div>
                        <span className="font-black text-white">{formatBRL.format(summary.byFulfillment['pickup'] || 0)}</span>
                     </div>
                  </div>
               </div>
            </Card>

            <Card className="rounded-3xl border-dashed border-2 border-gray-200 bg-transparent p-6 print:hidden">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                     <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-gray-900">Obervações</h4>
               </div>
               <p className="text-sm text-gray-500 font-medium">Os valores apresentados são baseados nos pedidos marcados como concluídos. Pedidos cancelados não são contabilizados.</p>
            </Card>
         </div>

         {/* Orders Table */}
         <div className="lg:col-span-3">
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
               <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-black">Detalhamento dos Pedidos</CardTitle>
                  <CardDescription className="font-medium text-gray-400">Listagem analítica para conferência manual.</CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow className="border-none">
                        <TableHead className="py-4 pl-8 font-black uppercase text-[10px] tracking-widest text-gray-400">ID</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Cliente</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Status</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Pagamento</TableHead>
                        <TableHead className="py-4 pr-8 text-right font-black uppercase text-[10px] tracking-widest text-gray-400">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                         <TableRow><TableCell colSpan={5} className="h-64 text-center">Carregando dados...</TableCell></TableRow>
                      ) : !summary.orders.length ? (
                         <TableRow><TableCell colSpan={5} className="h-64 text-center">Nenhum pedido encontrado para esta data.</TableCell></TableRow>
                      ) : (
                        summary.orders.map((o) => (
                          <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors border-gray-50 cursor-pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                            <TableCell className="py-6 pl-8 font-black text-gray-900">#{o.id}</TableCell>
                            <TableCell className="py-6">
                              <div className="flex flex-col">
                                 <span className="font-bold text-gray-900">{o.customer?.name}</span>
                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{o.fulfillmentType === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-6">
                               <Badge className={`rounded-xl font-black border-none px-3 py-1 ${
                                   o.status === OrderStatus.Confirmed || o.status === OrderStatus.Ready || o.status === OrderStatus.Preparing ? 'bg-blue-100 text-blue-600' :
                                   o.status === OrderStatus.Canceled ? 'bg-red-100 text-red-600' :
                                   'bg-gray-100 text-gray-600'
                               }`}>
                                  {o.status === OrderStatus.Confirmed ? 'CONFIRMADO' : 
                                   o.status === OrderStatus.Ready ? 'PRONTO' :
                                   o.status === OrderStatus.Canceled ? 'CANCELADO' :
                                   o.status?.toUpperCase()}
                               </Badge>
                            </TableCell>

                            <TableCell className="py-6">
                               <div className="flex items-center gap-2">
                                  {o.paymentMethod === 'cash' && <DollarSign className="w-4 h-4 text-emerald-500" />}
                                  {o.paymentMethod === 'card' && <CreditCard className="w-4 h-4 text-blue-500" />}
                                  {o.paymentMethod === 'pix' && <Smartphone className="w-4 h-4 text-purple-500" />}
                                  <span className="font-bold text-gray-600">
                                     {o.paymentMethod === 'cash' ? 'Dinheiro' : 
                                      o.paymentMethod === 'card' ? 'Cartão' : 
                                      o.paymentMethod === 'pix' ? 'PIX' : 'Outro'}
                                  </span>
                               </div>
                            </TableCell>
                            <TableCell className="py-6 pr-8 text-right font-black text-gray-900">{formatBRL.format(o.totalAmount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
               </CardContent>
            </Card>
         </div>
      </div>
      
      {/* Print-only Footer */}
      <div className="hidden print:block fixed bottom-0 left-0 right-0 p-8 border-t border-dashed">
         <div className="flex justify-between items-end">
            <div>
               <p className="text-xs font-bold text-gray-400 uppercase">Gerado em</p>
               <p className="text-sm font-black">{new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-mono tracking-widest text-gray-300">ZAP DELIVERY - SISTEMA DE GESTÃO</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ClosingReport;
