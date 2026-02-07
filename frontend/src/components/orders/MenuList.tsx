import React, { useState, useMemo } from "react";
import { Product } from "@/types/products";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ArrowDownWideNarrow, 
  ArrowUpNarrowWide,
  Utensils,
  Pizza,
  Beer,
  IceCream,
  Beef,
  Coffee,
  Candy,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";

export interface MenuListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

type SortOption = "none" | "price-asc" | "price-desc" | "az";

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes("pizza")) return <Pizza className="w-4 h-4" />;
  if (cat.includes("bebida") || cat.includes("suco") || cat.includes("refrigerante")) return <Beer className="w-4 h-4" />;
  if (cat.includes("burger") || cat.includes("lanche") || cat.includes("sandwich")) return <Utensils className="w-4 h-4" />;
  if (cat.includes("sobremesa") || cat.includes("doce")) return <Candy className="w-4 h-4" />;
  if (cat.includes("sorvete") || cat.includes("gelato")) return <IceCream className="w-4 h-4" />;
  if (cat.includes("carne") || cat.includes("churrasco")) return <Beef className="w-4 h-4" />;
  if (cat.includes("café") || cat.includes("coffee")) return <Coffee className="w-4 h-4" />;
  return <Utensils className="w-4 h-4" />;
};

export function MenuList({ products, onAddToCart }: MenuListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("none");

  // Unique categories
  const categories = useMemo(() => {
    if (!products) return ["Todos"];
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ["Todos", ...Array.from(cats).sort()];
  }, [products]);

  // Filtered and Sorted products
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Category Filter
    if (selectedCategory !== "Todos") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => (a.salePrice ?? 0) - (b.salePrice ?? 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.salePrice ?? 0) - (a.salePrice ?? 0));
    } else if (sortBy === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Grouped products (only if "Todos" and no search/sort active)
  const isBrowsingAll = selectedCategory === "Todos" && !searchQuery && sortBy === "none";
  
  const groupedProducts = useMemo(() => {
    if (!isBrowsingAll) return null;
    const groups: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || "Outros";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products, isBrowsingAll]);

  if (!products?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
           <Utensils className="w-12 h-12 text-gray-300" />
        </div>
        <p className="text-xl font-bold text-gray-900">Cardápio não disponível</p>
        <p className="text-sm mt-1">Estamos preparando o melhor para você. <br/>Volte em breve!</p>
      </div>
    );
  }

  const renderProductCard = (product: Product) => (
    <div
      key={product.id}
      className="group relative flex overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-md border border-gray-100 h-32"
    >
      <div className="flex flex-1 flex-col justify-between p-3">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-[15px] font-bold text-gray-900 leading-tight">
            {product.name}
          </h3>
          {product.description && (
            <p className="line-clamp-2 text-[12px] leading-snug text-gray-500 font-medium">
              {product.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-base font-extrabold text-primary">
             {typeof product.salePrice === "number"
              ? `R$ ${product.salePrice.toFixed(2)}`
              : "--"}
          </span>
          <button
            onClick={() => onAddToCart(product)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition-transform active:scale-90 hover:bg-primary/90"
          >
            <Plus className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </div>
      
      <div className="relative h-full w-32 shrink-0 bg-gray-50 border-l">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50">
            <Utensils className="w-8 h-8 text-gray-200" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search & Main Filter Container */}
      <div className="sticky top-[100px] z-[30] -mx-4 px-4 bg-gray-50/80 backdrop-blur-md pb-2 pt-1 lg:static lg:mx-0 lg:px-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex flex-col gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Busque no cardápio..."
              className="pl-10 h-11 bg-white border-gray-200 rounded-xl focus-visible:ring-primary shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* iFood-style Category Ribbon */}
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-3 pb-2 pt-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex flex-col items-center gap-1.5 transition-all outline-none group`}
                >
                  <div className={`
                    h-12 w-12 rounded-xl flex items-center justify-center transition-all border-2
                    ${selectedCategory === category 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-white border-transparent text-gray-500 grayscale group-hover:grayscale-0"}
                  `}>
                    {category === "Todos" ? <SlidersHorizontal className="w-5 h-5" /> : getCategoryIcon(category)}
                  </div>
                  <span className={`text-[11px] font-bold ${selectedCategory === category ? "text-primary" : "text-gray-500"}`}>
                    {category}
                  </span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 bg-gray-200/50 px-2 py-1 rounded-md shrink-0">
               <Filter className="w-3 h-3" />
               FILTRAR
            </div>
            <Badge 
              variant={sortBy === "price-asc" ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap gap-1 rounded-lg py-1.5 h-7 font-bold border-gray-200"
              onClick={() => setSortBy(sortBy === "price-asc" ? "none" : "price-asc")}
            >
              <ArrowUpNarrowWide className="w-3 h-3" />
              Menor Preço
            </Badge>
            <Badge 
              variant={sortBy === "price-desc" ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap gap-1 rounded-lg py-1.5 h-7 font-bold border-gray-200"
              onClick={() => setSortBy(sortBy === "price-desc" ? "none" : "price-desc")}
            >
              <ArrowDownWideNarrow className="w-3 h-3" />
              Maior Preço
            </Badge>
            <Badge 
              variant={sortBy === "az" ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap gap-1 rounded-lg py-1.5 h-7 font-bold border-gray-200"
              onClick={() => setSortBy(sortBy === "az" ? "none" : "az")}
            >
              A-Z
            </Badge>
          </div>
        </div>
      </div>

      {/* Product Content Area */}
      {isBrowsingAll ? (
        <div className="space-y-8 mt-4 pb-10">
          {Object.entries(groupedProducts || {}).map(([category, items]) => (
             <div key={category} className="space-y-4">
                <div className="flex items-center gap-3">
                   <h2 className="text-lg font-bold text-gray-900">{category}</h2>
                   <div className="h-[2px] flex-1 bg-gradient-to-r from-gray-100 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                   {items.map(renderProductCard)}
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 mt-4 pb-10">
          <div className="flex items-center justify-between">
             <h2 className="text-lg font-bold text-gray-900">
               {searchQuery ? `Busca: "${searchQuery}"` : selectedCategory}
             </h2>
             <span className="text-xs text-muted-foreground font-medium">{processedProducts.length} itens</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {processedProducts.map(renderProductCard)}
          </div>
          
          {processedProducts.length === 0 && (
             <div className="py-20 text-center flex flex-col items-center">
                <div className="bg-orange-50 p-4 rounded-full mb-3 text-orange-400">
                   <Search className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-800">Ops! Não encontramos nada.</p>
                <p className="text-sm text-gray-500">Tente buscar por termos diferentes ou <br/>outra categoria.</p>
                <button 
                  onClick={() => {setSearchQuery(""); setSelectedCategory("Todos"); setSortBy("none");}} 
                  className="mt-4 text-primary font-bold text-sm underline"
                >
                  Limpar todos os filtros
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MenuList;

