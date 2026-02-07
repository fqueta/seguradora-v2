import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Tag, 
  Star, 
  MessageSquare, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  Edit, 
  ShoppingBag,
  Infinity,
  Layers,
  Info,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProduct } from '@/hooks/products';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * ProductView
 * pt-BR: Visualização premium e detalhada de um produto individual.
 * en-US: Premium detailed view for an individual product.
 */
export default function ProductView() {
  const link_admin = '/admin';
  const link_loja = '/menu'; // URL do cardápio público
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: productData, isLoading, error } = useProduct(id!);
  const product = productData as any;
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    navigate(link_admin + '/products');
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const getStoreProductLink = (): string => {
    if (!product) return '';
    // No novo sistema o link é para o menu com ancoragem ou busca
    return `${window.location.origin}${link_loja}?search=${encodeURIComponent(product.name)}`;
  };

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getStoreProductLink());
      setCopied(true);
      toast.success('Link copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Carregando detalhes do produto...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-red-50 text-center py-10">
            <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-black text-red-900">Oops!</CardTitle>
            <CardDescription className="text-red-600 font-medium">
              {error?.message || 'Produto não encontrado ou removido.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <Button onClick={handleBack} variant="outline" className="rounded-2xl h-12 px-8 font-bold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="rounded-2xl w-14 h-14 bg-gray-50 hover:bg-gray-100" onClick={handleBack}>
            <ChevronLeft className="w-8 h-8 text-gray-400" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black text-[10px] tracking-widest uppercase">
                Detalhes do Produto
              </Badge>
              {product.active ? (
                <Badge className="bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase">Ativo</Badge>
              ) : (
                <Badge variant="secondary" className="font-black text-[10px] tracking-widest uppercase">Inativo</Badge>
              )}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">{product.name}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
             variant="outline" 
             onClick={() => navigate(`/admin/products/${id}/edit`)}
             className="rounded-2xl font-bold h-14 px-8 border-2"
          >
            <Edit className="mr-2 h-5 w-5" />
            Editar Produto
          </Button>
          <Button 
            className="rounded-2xl font-bold h-14 px-8 shadow-xl shadow-primary/20"
            onClick={() => window.open(getStoreProductLink(), '_blank')}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Ver no Cardápio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-8">
          {/* Main Info Card */}
          <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden bg-white">
            <div className="grid md:grid-cols-[300px_1fr]">
              <div className="bg-gray-50 p-8 flex items-center justify-center border-r border-gray-100">
                {product.image ? (
                  <div className="relative group">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full aspect-square object-cover rounded-[2rem] shadow-2xl group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 rounded-[2rem] ring-1 ring-black/5 inset-shadow-sm"></div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200">
                    <Package className="w-20 h-20 mb-2 opacity-50" />
                    <span className="text-xs font-black uppercase tracking-widest">Sem Imagem</span>
                  </div>
                )}
              </div>
              <div className="p-10 space-y-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">Descrição Completa</h3>
                    <div 
                      className="text-gray-600 leading-relaxed text-lg font-medium"
                      dangerouslySetInnerHTML={{ __html: product.description || 'Este produto ainda não possui uma descrição detalhada.' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Preço de Venda</p>
                      <p className="text-3xl font-black text-gray-900">{formatBRL.format(product.salePrice || 0)}</p>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estoque Atual</p>
                      <p className="text-3xl font-black text-gray-900">{product.stock || 0} <span className="text-sm font-bold text-gray-400">{product.unit || 'un'}</span></p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-100" />

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</p>
                      <p className="font-bold text-gray-900">{product.categoryData?.name || product.category || 'Geral'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidade</p>
                      <p className="font-bold text-gray-900">{product.unitData?.name || product.unit || 'Unidade'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* External Links Card */}
          <Card className="rounded-[2.5rem] shadow-sm border-none bg-indigo-900 text-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-none">Venda Online</h3>
                    <p className="text-indigo-300 text-sm mt-1 font-medium italic">Seu produto está pronto para ser vendido no cardápio digital.</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                   <div className="flex-1 md:flex-none relative">
                     <div className="bg-white/5 border border-white/10 rounded-2xl flex items-center h-14 pl-4 pr-12 text-sm font-mono text-indigo-200 overflow-hidden text-ellipsis whitespace-nowrap min-w-[200px]">
                        {getStoreProductLink()}
                     </div>
                     <button 
                        onClick={copyLinkToClipboard}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                     >
                        {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                     </button>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Stats & Feedback */}
          <Card className="rounded-[2.5rem] shadow-sm border-none overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 border-b p-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-6 bg-yellow-50/50 rounded-3xl border border-yellow-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Avaliação Média</span>
                  <span className="text-4xl font-black text-yellow-900">{(product.rating || 0).toFixed(1)}</span>
                </div>
                <div className="flex gap-0.5">
                   {[1,2,3,4,5].map(i => (
                     <Star key={i} className={`w-5 h-5 ${i <= Math.round(product.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-200'}`} />
                   ))}
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border rounded-3xl border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Reviews</p>
                  <p className="font-bold text-gray-900">{product.reviews || 0} Comentários</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="rounded-[2.5rem] shadow-sm border-none overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 border-b p-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-400" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID do Produto</p>
                  <p className="text-xs font-mono bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-600">{product.id}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status de Disponibilidade</p>
                  <div className="flex items-center gap-3">
                    <Badge variant={product.availability === 'available' ? 'default' : 'destructive'} className="rounded-lg h-8 px-4 font-black">
                      {product.availability === 'available' ? 'EM ESTOQUE' : 'NÃO DISPONÍVEL'}
                    </Badge>
                  </div>
               </div>
               {product.validUntil && (
                 <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-700 rounded-3xl border border-orange-100">
                   <Clock className="w-5 h-5" />
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Expira em</span>
                     <span className="font-bold">{new Date(product.validUntil).toLocaleDateString('pt-BR')}</span>
                   </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Dynamic Back Button for Mobile or Desktop Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
         <Button 
            variant="outline" 
            onClick={handleBack}
            className="rounded-full h-14 px-10 border-2 bg-white/80 backdrop-blur-xl shadow-2xl hover:bg-white font-black uppercase tracking-widest text-xs"
         >
            <ArrowLeft className="mr-3 h-4 w-4" />
            Voltar ao Catálogo
         </Button>
      </div>
    </div>
  );
}
