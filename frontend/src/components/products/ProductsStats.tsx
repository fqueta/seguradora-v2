import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle2, AlertTriangle, Star, Zap, TrendingUp, ShieldCheck } from "lucide-react";
import type { Product } from "@/types/products";
import { cn } from "@/lib/utils";

interface ProductsStatsProps {
  products: Product[];
}

/**
 * ProductsStats
 * pt-BR: Dash de métricas rápidas com visual Premium e micro-interações.
 */
export function ProductsStats({ products }: ProductsStatsProps) {
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const availableProducts = products.filter(p => p.availability === 'available').length;
  const lowStockProducts = products.filter(p => Number(p.stock) <= 5 && Number(p.stock) > 0).length;
  
  const averageRating = products.length > 0 
    ? Math.round((products.reduce((sum, p) => {
        const rating = Number(p.rating);
        return sum + (isNaN(rating) ? 0 : rating);
      }, 0) / products.length) * 10) / 10
    : 0;

  const stats = [
    {
      label: 'Total de Itens',
      value: totalProducts,
      sublabel: `${availableProducts} Disponíveis`,
      icon: <Package className="h-5 w-5" />,
      color: 'bg-blue-500',
      light: 'bg-blue-50',
      text: 'text-blue-600'
    },
    {
      label: 'Ativos em Loja',
      value: activeProducts,
      sublabel: 'Em Exibição',
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'bg-emerald-500',
      light: 'bg-emerald-50',
      text: 'text-emerald-600'
    },
    {
      label: 'Crítico / Estoque',
      value: lowStockProducts,
      sublabel: 'Reposição Necessária',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'bg-orange-500',
      light: 'bg-orange-50',
      text: 'text-orange-600'
    },
    {
      label: 'Nível de Satisfação',
      value: averageRating,
      sublabel: 'Média de Clientes',
      icon: <Star className="h-5 w-5" />,
      color: 'bg-indigo-500',
      light: 'bg-indigo-50',
      text: 'text-indigo-600',
      suffix: '/5'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <Card key={i} className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/50 overflow-hidden group hover:-translate-y-1 transition-all duration-500 bg-white">
          <CardContent className="p-7 flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl text-white shadow-lg", stat.color)}>
              {stat.icon}
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-black text-gray-900 leading-none tracking-tight">
                  {stat.value}
                </h3>
                {stat.suffix && <span className="text-sm font-bold text-gray-400">{stat.suffix}</span>}
              </div>
              <p className={cn("text-[9px] font-black mt-2 uppercase tracking-tighter", stat.text)}>
                {stat.sublabel}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ProductsStats;