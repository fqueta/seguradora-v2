import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrdersList } from "@/hooks/orders";
import { statusLabel } from "@/lib/orderLabels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Package, 
  AlertTriangle, 
  ArrowUpDown, 
  Plus, 
  Filter, 
  X, 
  Calendar,
  CreditCard,
  Truck,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  UtensilsCrossed,
  XCircle,
  ShoppingBag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 font-bold px-3 py-1 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    case "confirmed": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 font-bold px-3 py-1 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado</Badge>;
    case "preparing": return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 font-bold px-3 py-1 rounded-full"><UtensilsCrossed className="w-3 h-3 mr-1" /> Preparando</Badge>;
    case "ready": return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 font-bold px-3 py-1 rounded-full"><Package className="w-3 h-3 mr-1" /> Pronto</Badge>;
    case "shipped": return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 font-bold px-3 py-1 rounded-full"><Truck className="w-3 h-3 mr-1" /> Em Rota</Badge>;
    case "delivered": return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 font-bold px-3 py-1 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Entregue</Badge>;
    case "cancelled": return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 font-bold px-3 py-1 rounded-full"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
    default: return <Badge variant="outline" className="px-3 py-1 rounded-full">{status}</Badge>;
  }
};

const AdminOrdersList = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("all");
  const [fulfillmentType, setFulfillmentType] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string>("created_at");
  const [order, setOrder] = useState<string>("desc");

  const params = useMemo(() => {
    const p: any = { per_page: 50, order_by: orderBy, order };
    if (status !== "all") p.status = status;
    if (fulfillmentType !== "all") p.fulfillment_type = fulfillmentType;
    if (paymentMethod !== "all") p.payment_method = paymentMethod;
    if (searchTerm) p.search = searchTerm;
    if (dateStart) p.date_start = dateStart;
    if (dateEnd) p.date_end = dateEnd;
    return p;
  }, [status, fulfillmentType, paymentMethod, searchTerm, dateStart, dateEnd, orderBy, order]);

  const { data, isLoading, error, refetch } = useOrdersList(params);
  const rows = data?.data ?? [];

  const clearFilters = () => {
    setStatus("all");
    setFulfillmentType("all");
    setPaymentMethod("all");
    setSearchTerm("");
    setDateStart("");
    setDateEnd("");
  };

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-3xl shadow-sm border">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <ShoppingBag className="w-8 h-8" />
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Gestão de Pedidos</h1>
              <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
                 <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                 Acompanhe e despache suas vendas em tempo real.
              </p>
           </div>
        </div>
        <Button onClick={() => navigate("/admin/orders/create")} size="lg" className="rounded-2xl font-bold h-14 px-8 shadow-xl shadow-primary/20">
          <Plus className="mr-2 h-6 w-6 stroke-[3]" />
          Novo Pedido
        </Button>
      </div>

      <Card className="rounded-[2rem] shadow-xl border-none overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 px-8 py-8 border-b space-y-6">
          <div className="flex flex-col xl:flex-row gap-6 justify-between">
             {/* Search */}
             <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="ID, Cliente ou Telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 bg-white border-gray-200 rounded-2xl shadow-sm focus-visible:ring-primary focus-visible:ring-offset-0 text-lg font-medium"
                />
             </div>

             {/* Action Filters */}
             <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                   <div className="flex items-center gap-2 pl-3 pr-2 text-xs font-bold text-gray-400">
                      <Calendar className="w-4 h-4" />
                      DATA
                   </div>
                   <Input 
                      type="date" 
                      className="h-10 border-none bg-transparent shadow-none w-36 font-semibold" 
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                   />
                   <Separator orientation="vertical" className="h-4" />
                   <Input 
                      type="date" 
                      className="h-10 border-none bg-transparent shadow-none w-36 font-semibold" 
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                   />
                </div>

                <Select value={status} onValueChange={setStatus}>
                   <SelectTrigger className="h-12 w-44 rounded-2xl font-bold bg-white">
                      <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="preparing">Preparando</SelectItem>
                      <SelectItem value="ready">Pronto</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                   </SelectContent>
                </Select>

                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={clearFilters}
                   className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"
                   title="Limpar filtros"
                >
                   <X className="w-6 h-6" />
                </Button>
             </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
           <Table>
             <TableHeader className="bg-gray-50/30">
               <TableRow className="hover:bg-transparent h-16 border-b border-gray-100">
                 <TableHead className="pl-8 font-black text-gray-500 text-xs uppercase tracking-widest">ID</TableHead>
                 <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest">Cliente</TableHead>
                 <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest">Status</TableHead>
                 <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest">Atendimento / Pagamento</TableHead>
                 <TableHead className="text-right font-black text-gray-500 text-xs uppercase tracking-widest">Total</TableHead>
                 <TableHead className="pr-8 text-right font-black text-gray-500 text-xs uppercase tracking-widest">Ações</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="h-24 animate-pulse">
                       <TableCell colSpan={6} className="bg-gray-50/50 border-b border-gray-100"></TableCell>
                    </TableRow>
                  ))
               ) : rows.length === 0 ? (
                 <TableRow className="h-[400px]">
                   <TableCell colSpan={6} className="text-center">
                     <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                        <ShoppingBag className="w-20 h-20 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-900">Nenhum pedido encontrado</h3>
                        <p className="max-w-xs mx-auto text-gray-500">Ajuste os filtros ou o termo de busca para localizar as vendas.</p>
                        <Button variant="outline" className="rounded-xl" onClick={clearFilters}>Ver todos os pedidos</Button>
                     </div>
                   </TableCell>
                 </TableRow>
               ) : (
                 rows.map((o: any) => (
                   <TableRow key={o.id} className="h-24 hover:bg-gray-50/80 transition-colors border-b border-gray-100 group">
                     <TableCell className="pl-8">
                        <span className="font-black text-gray-400 group-hover:text-primary transition-colors">#{o.id}</span>
                     </TableCell>
                     <TableCell>
                        <div className="flex flex-col">
                           <span className="font-bold text-gray-900 text-lg leading-tight">{o.customer?.name ?? "-"}</span>
                           <span className="text-xs text-gray-400 font-medium">{o.customer?.phone ?? "Sem telefone"}</span>
                        </div>
                     </TableCell>
                     <TableCell>
                        {getStatusBadge(String(o.status))}
                     </TableCell>
                     <TableCell>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              <Truck className="w-3.5 h-3.5" />
                              {o.fulfillmentType === 'delivery' ? 'ENTREGA' : 'RETIRADA'}
                           </div>
                           <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              <CreditCard className="w-3.5 h-3.5" />
                              {o.paymentMethod?.toUpperCase()}
                           </div>
                        </div>
                     </TableCell>
                     <TableCell className="text-right">
                        <span className="text-xl font-black text-gray-900">
                           {formatBRL.format(o.totalAmount || 0)}
                        </span>
                     </TableCell>
                     <TableCell className="pr-8 text-right">
                        <Button 
                           variant="outline" 
                           className="rounded-xl font-bold border-2 hover:bg-primary hover:text-white hover:border-primary group/btn h-11 px-6 shadow-sm"
                           onClick={() => navigate(`/admin/orders/${o.id}`)}
                        >
                           <Eye className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                           Ver Detalhes
                        </Button>
                     </TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
        </CardContent>
      </Card>
      
      {/* Quick Summary Footer */}
      {!isLoading && rows.length > 0 && (
         <div className="flex justify-end px-4">
            <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total na página</span>
                  <span className="text-2xl font-black text-primary-foreground">
                     {formatBRL.format(rows.reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0))}
                  </span>
               </div>
               <Separator orientation="vertical" className="h-10 bg-white/10" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exibindo</span>
                  <span className="text-2xl font-black">{rows.length} Pedidos</span>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminOrdersList;

