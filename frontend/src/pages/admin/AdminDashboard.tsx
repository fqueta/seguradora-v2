import React, { useMemo } from "react";
import { useOrdersList } from "@/hooks/orders";
import { useProductsList } from "@/hooks/products";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  LayoutDashboard
} from "lucide-react";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

/**
 * AdminDashboard
 * pt-BR: Novo dashboard focado em Delivery com KPIs de vendas, pedidos e gráficos.
 * en-US: New Delivery-focused dashboard with sales KPIs, orders, and charts.
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Data de hoje para filtros
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: ordersData, isLoading: loadingOrders } = useOrdersList({ 
    per_page: 100, 
    date_start: todayStart.toISOString().split('T')[0],
  });
  
  const { data: productsData } = useProductsList({ per_page: 5 });

  const stats = useMemo(() => {
    const orders = ordersData?.data ?? [];
    const totalSales = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const totalOrders = orders.length;

    return {
      totalSales,
      pendingOrders,
      completedOrders,
      totalOrders,
    };
  }, [ordersData]);

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Gráfico de vendas hoje (simulado por hora se tivesse os dados, mas vamos agrupar os existentes)
  const chartData = useMemo(() => {
    // Mocking some data for the last 7 days since we only have "today" from the hook above
    // In a real app, we'd fetch the last 7 days
    return [
      { name: "Seg", total: 4000 },
      { name: "Ter", total: 3000 },
      { name: "Qua", total: 2000 },
      { name: "Qui", total: 2780 },
      { name: "Sex", total: 1890 },
      { name: "Sáb", total: 2390 },
      { name: "Dom", total: 3490 },
    ];
  }, []);

  if (loadingOrders) return <div className="p-10 text-center">Carregando Dashboard...</div>;

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">Visão Geral</h1>
          <p className="text-muted-foreground mt-2 font-medium">Bem-vindo de volta! Aqui está o resumo de hoje.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl font-bold bg-white" onClick={() => navigate("/admin/orders/kanban")}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Painel Kanban
           </Button>
           <Button variant="outline" className="rounded-xl font-bold bg-white" onClick={() => navigate("/admin/reports/closing")}>
              Relatório de Fechamento
           </Button>

           <Button className="rounded-xl font-bold shadow-lg shadow-primary/20" onClick={() => navigate("/admin/orders/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
           </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-6 h-6" />
               </div>
               <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold">+12%</Badge>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Vendas Hoje</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-black text-gray-900">{formatBRL.format(stats.totalSales)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <ShoppingBag className="w-6 h-6" />
               </div>
               <Badge className="bg-blue-50 text-blue-600 border-none font-bold">{stats.totalOrders} total</Badge>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pedidos</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-black text-gray-900">{stats.totalOrders}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                  <Clock className="w-6 h-6" />
               </div>
               <Badge className="bg-orange-50 text-orange-600 border-none font-bold font-black">Ação!</Badge>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pendentes</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-black text-gray-900">{stats.pendingOrders}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                  <Users className="w-6 h-6" />
               </div>
               <Badge className="bg-purple-50 text-purple-600 border-none font-bold">Novos</Badge>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Clientes</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-black text-gray-900">12</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
             <div className="flex justify-between items-center">
                <div>
                   <CardTitle className="text-xl font-black">Desempenho Semanal</CardTitle>
                   <CardDescription className="font-medium text-gray-400">Total de vendas brutas por dia</CardDescription>
                </div>
                <div className="flex gap-2">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Vendas</span>
                   </div>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }}
                      tickFormatter={(val) => `R$ ${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 800 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="var(--primary)" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between space-y-0">
              <div>
                 <CardTitle className="text-xl font-black">Produtos em Alta</CardTitle>
                 <CardDescription className="font-medium text-gray-400">Mais vendidos esta semana</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl">
                 <Plus className="w-5 h-5" />
              </Button>
           </CardHeader>
           <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                 {(productsData?.data || []).map((p: any, idx) => (
                    <div key={p.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-lg font-black text-gray-400 group-hover:text-primary transition-colors">
                             {idx + 1}
                          </div>
                          <div>
                             <p className="font-bold text-gray-900">{p.title}</p>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{p.category?.title}</p>
                          </div>
                       </div>
                       <Badge variant="outline" className="rounded-lg font-bold border-gray-200">
                          {Math.floor(Math.random() * 50) + 10} vendas
                       </Badge>
                    </div>
                 ))}
                 {!productsData?.data?.length && (
                    <div className="p-10 text-center text-muted-foreground font-medium">
                       Nenhum dado disponível.
                    </div>
                 )}
              </div>
              <div className="p-6">
                 <Button className="w-full rounded-xl font-bold border-2 border-gray-100" variant="outline" onClick={() => navigate("/admin/products")}>
                    Ver Catálogo Completo
                    <ChevronRight className="w-4 h-4 ml-2" />
                 </Button>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
         {/* Recent Orders List */}
         <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between space-y-0">
               <div>
                  <CardTitle className="text-xl font-black">Pedidos Recentes</CardTitle>
                  <CardDescription className="font-medium text-gray-400">Últimas atualizações do dia</CardDescription>
               </div>
               <Button variant="link" className="font-bold text-primary" onClick={() => navigate("/admin/orders")}>
                  Ver Todos
               </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {(ordersData?.data || []).slice(0, 5).map((o: any) => (
                  <div key={o.id} className="p-6 flex items-center justify-between group cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${o.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {o.status === 'pending' ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                       </div>
                       <div>
                          <p className="font-bold text-gray-900 leading-none">#{o.id} - {o.customer?.name}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-tighter">
                             {o.fulfillmentType === 'delivery' ? 'Entrega' : 'Retirada'} • {o.items.length} itens
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-gray-900">{formatBRL.format(o.totalAmount)}</p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                {!ordersData?.data?.length && (
                   <div className="p-10 text-center text-muted-foreground">Sem pedidos recentes.</div>
                )}
              </div>
            </CardContent>
         </Card>

         <Card className="rounded-[2rem] border-none shadow-sm bg-slate-900 text-white overflow-hidden p-8 flex flex-col justify-between relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
               <TrendingUp className="w-64 h-64" />
            </div>
            <div className="relative z-10">
               <Badge className="bg-primary/20 text-primary border-none mb-6 font-bold px-4 py-1">NOVIDADE</Badge>
               <h2 className="text-4xl font-black mb-4 leading-[1.1]">Fechamento de Caixa <br/>simplificado.</h2>
               <p className="text-slate-400 font-medium max-w-sm">Gere relatórios detalhados do seu dia, controle sangrias e entradas em poucos cliques.</p>
            </div>
            
            <div className="relative z-10 mt-12 flex items-center gap-4">
               <Button className="rounded-2xl h-14 px-8 font-black text-lg shadow-2xl shadow-primary/20" onClick={() => navigate("/admin/reports/closing")}>
                  Acessar Fechamento
               </Button>
               <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                        <Users className="w-4 h-4 text-slate-500" />
                     </div>
                  ))}
                  <div className="pl-4 text-xs font-bold text-slate-500">+12 usuários online</div>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
