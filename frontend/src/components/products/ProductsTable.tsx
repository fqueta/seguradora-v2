import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  X
} from "lucide-react";
import type { Product } from "@/types/products";
import { useUpdateProduct } from "@/hooks/products";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  error: any;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onRefetch: () => void;
}

export default function ProductsTable({
  products,
  isLoading,
  error,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onRefetch
}: ProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const navigate = useNavigate();
  const link_admin = '/admin';

  const updateProductMutation = useUpdateProduct();
  const { user } = useAuth();
  
  const handleViewProduct = (product: Product) => {
    navigate(link_admin + `/products/${product.id}`);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: any = (a as any)[sortConfig.key];
    let bValue: any = (b as any)[sortConfig.key];

    if (sortConfig.key === 'supplier') {
        aValue = (a as any).supplierData?.name || (a as any).supplier?.name || a.supplier_name || '';
        bValue = (b as any).supplierData?.name || (b as any).supplier?.name || b.supplier_name || '';
    }

    if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden bg-white">
      <CardHeader className="bg-gray-50/50 px-8 py-8 border-b space-y-6">
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          <div>
            <CardTitle className="text-2xl font-black text-gray-900 leading-none">Lista de Produtos</CardTitle>
            <CardDescription className="text-gray-500 mt-2 font-medium">
              Visualize e gerencie seu catálogo completo de itens.
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             <div className="relative flex-1 group min-w-[300px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Pesquisar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 bg-white border-gray-200 rounded-2xl shadow-sm focus-visible:ring-primary focus-visible:ring-offset-0 text-lg font-medium w-full"
                />
             </div>
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchTerm("")}
                className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-500 text-gray-400"
             >
                <X className="w-6 h-6" />
             </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/30">
              <TableRow className="hover:bg-transparent h-16 border-b border-gray-100">
                <TableHead className="pl-8 font-black text-gray-500 text-xs uppercase tracking-widest w-[100px]">Imagem</TableHead>
                <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Produto
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest">
                  <button onClick={() => handleSort('salePrice')} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Preço
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest hidden md:table-cell">
                  Dependências
                </TableHead>
                <TableHead className="font-black text-gray-500 text-xs uppercase tracking-widest">
                  <button onClick={() => handleSort('active')} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
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
              ) : error ? (
                <TableRow className="h-64">
                  <TableCell colSpan={6} className="text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                      <AlertTriangle className="h-12 w-12 text-red-500" />
                      <p className="font-bold text-gray-900">Erro ao carregar produtos</p>
                      <Button variant="outline" className="rounded-xl" onClick={onRefetch}>Tentar novamente</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedProducts.length === 0 ? (
                <TableRow className="h-64">
                  <TableCell colSpan={6} className="text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                      <Package className="h-12 w-12 text-gray-300" />
                      <p className="font-bold text-gray-900">Nenhum produto encontrado</p>
                      <Button variant="outline" className="rounded-xl" onClick={() => setSearchTerm("")}>Limpar busca</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    onDoubleClick={() => handleViewProduct(product)}
                    className="h-24 hover:bg-gray-50/80 transition-all border-b border-gray-100 group cursor-pointer"
                  >
                    <TableCell className="pl-8">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border-2 border-white shadow-sm group-hover:shadow-md transition-all flex items-center justify-center">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`text-[10px] font-black uppercase text-gray-400 ${product.image ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-center px-1`}>
                          Sem foto
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</span>
                        <div 
                          className="text-xs text-gray-400 font-medium mt-1 line-clamp-1 max-w-[300px]"
                          dangerouslySetInnerHTML={{ __html: product.description || 'Sem descrição cadastrada' }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-gray-900">{formatBRL.format(product.salePrice || 0)}</span>
                        {product.unit && (
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.unit}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-600">
                          {product.supplierData?.name || (product as any).supplier?.name || product.supplier_name || 'Nenhum fornecedor'}
                        </span>
                        {product.plan && (
                          <Badge variant="outline" className="w-fit text-[10px] font-black bg-gray-50 border-gray-200">
                            PLANO {product.plan}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.active ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-xs font-black ring-1 ring-emerald-200">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          ATIVO
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 bg-gray-50 w-fit px-3 py-1 rounded-full text-xs font-black ring-1 ring-gray-200">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          INATIVO
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-12 w-12 rounded-2xl hover:bg-gray-100 text-gray-400">
                            <MoreVertical className="h-6 w-6" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-none">
                          <DropdownMenuLabel className="text-xs font-black uppercase text-gray-400 px-3 py-2 tracking-widest">Gerenciar Item</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-100 mx-2" />
                          <DropdownMenuItem onClick={() => handleViewProduct(product)} className="rounded-xl h-11 px-3 cursor-pointer">
                            <Eye className="mr-3 h-5 w-5 text-gray-400" />
                            <span className="font-bold">Visualizar Detalhes</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditProduct(product)} className="rounded-xl h-11 px-3 cursor-pointer">
                            <Edit className="mr-3 h-5 w-5 text-gray-400" />
                            <span className="font-bold">Editar Dados</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-100 mx-2" />
                          <DropdownMenuItem 
                            className="rounded-xl h-11 px-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => onDeleteProduct(product)}
                          >
                            <Trash2 className="mr-3 h-5 w-5" />
                            <span className="font-bold">Remover Produto</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
