import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Image as ImageIcon, FileText, Paperclip, Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { MediaLibraryModal } from "@/components/media/MediaLibraryModal";
import { FileStorageItem } from "@/services/fileStorageService";
import { CurrencyInput } from "@/components/ui/currency-input";
import { currencyRemoveMaskToNumber } from "@/lib/masks/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Info, 
  Tag, 
  Truck, 
  DollarSign, 
  Layers, 
  Calendar, 
  Star, 
  Globe, 
  ShieldCheck,
  Package,
  Boxes
} from "lucide-react";
import { FormActionBar } from "../common/FormActionBar";

// Form validation schema
const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  salePrice: z.coerce.number().min(0, "Preço de venda deve ser maior ou igual a 0"),
  costPrice: z.coerce.number().min(0, "Preço de custo deve ser maior ou igual a 0"),
  stock: z.coerce.number().int().min(0, "Estoque deve ser maior ou igual a 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  image: z.string().url("Deve ser uma URL válida").optional().or(z.literal("")),
  rating: z.coerce.number().min(0).max(5, "Avaliação deve estar entre 0 e 5").optional(),
  reviews: z.coerce.number().int().min(0, "Número de avaliações deve ser maior ou igual a 0").optional(),
  variationGroups: z.array(z.object({
    name: z.string().min(1, "Nome do grupo é obrigatório"),
    required: z.boolean().default(false),
    minChoices: z.coerce.number().min(0).default(0),
    maxChoices: z.coerce.number().min(1).default(1),
    options: z.array(z.object({
      name: z.string().min(1, "Nome da opção é obrigatório"),
      price: z.coerce.number().min(0).default(0),
      active: z.boolean().default(true)
    })).min(1, "Adicione pelo menos uma opção")
  })).optional().default([]),
  availability: z.enum(["available", "limited", "unavailable"], {
    required_error: "Disponibilidade é obrigatória",
  }),
  plan: z.enum(["1","2","3","4","5","6","7","8","9","10","11","12"]).optional(),
  terms: z.array(z.string()).optional(),
  validUntil: z.string().optional(),
  supplier_id: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id?: string | number;
  name?: string;
}

interface Unit {
  id?: number;
  name?: string;
  label?: string;
  value?: string;
}

interface Supplier {
  id: number | string;
  name: string;
}

interface ProductFormProps {
  form: UseFormReturn<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isSubmitting: boolean;
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  isLoadingSuppliers?: boolean;
  categoriesError: any;
  unitsError: any;
  onCancel: () => void;
  isEditing: boolean;
}

export function ProductForm({
  form,
  onSubmit,
  isSubmitting,
  categories,
  units,
  suppliers,
  isLoadingCategories,
  isLoadingUnits,
  isLoadingSuppliers,
  categoriesError,
  unitsError,
  onCancel,
  isEditing
}: ProductFormProps) {
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isTermsMediaLibraryOpen, setIsTermsMediaLibraryOpen] = useState(false);

  const handleMediaSelect = (item: FileStorageItem) => {
    if (item.file?.url) {
      form.setValue('image', item.file.url, { shouldDirty: true });
    } else if (item.url) {
      form.setValue('image', item.url, { shouldDirty: true });
    }
    setIsMediaLibraryOpen(false);
  };

  const handleTermMediaSelect = (item: FileStorageItem) => {
    const currentTerms = form.getValues('terms') || [];
    const termValue = item.url || item.file?.url || ''; // Prefer URL over ID
    
    if (termValue && !currentTerms.includes(termValue)) {
      form.setValue('terms', [...currentTerms, termValue], { shouldDirty: true });
    }
    setIsTermsMediaLibraryOpen(false);
  };
  
  return (
    <Form {...form}>
      <MediaLibraryModal
        open={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        defaultFilters={{ mime: 'image/' }}
      />
      <MediaLibraryModal
        open={isTermsMediaLibraryOpen}
        onClose={() => setIsTermsMediaLibraryOpen(false)}
        onSelect={handleTermMediaSelect}
        defaultFilters={{ mime: 'application/pdf' }}
      />
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna da Esquerda: Informações Principais */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Seção 1: Dados Básicos */}
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Dados Básicos</CardTitle>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Identificação e descrição do item</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-bold mb-2">
                        <Tag className="w-3 h-3 text-primary" /> Nome do Produto
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Hambúrguer Clássico" className="h-12 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all text-lg font-medium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-bold mb-2">
                        <FileText className="w-3 h-3 text-primary" /> Detalhes do Produto
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Fale mais sobre os ingredientes, modo de preparo ou características..." 
                          className="min-h-[150px] resize-none rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-bold mb-2">
                          <Layers className="w-3 h-3 text-primary" /> Categoria
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories || !!categoriesError}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/30">
                              <SelectValue placeholder="Escolha a categoria..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={String(category.id)} className="rounded-lg mb-1">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-bold mb-2">
                          <Truck className="w-3 h-3 text-primary" /> Fornecedor
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined} disabled={isLoadingSuppliers}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/30">
                              <SelectValue placeholder="Selecione o fornecedor..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            {suppliers?.map((supplier) => (
                              <SelectItem key={supplier.id} value={String(supplier.id)} className="rounded-lg mb-1">
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seção 2: Financeiro e Estoque */}
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Preços e Inventário</CardTitle>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Valores de venda, custo e controle</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Preço de Venda
                        </FormLabel>
                        <FormControl>
                          <CurrencyInput 
                            value={field.value}
                            onChange={(e) => field.onChange(currencyRemoveMaskToNumber(e.target.value))}
                            className="h-12 rounded-xl border-gray-100 bg-emerald-50/10 focus:bg-emerald-50/20 text-emerald-700 font-black text-lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div> Preço de Custo
                        </FormLabel>
                        <FormControl>
                          <CurrencyInput 
                            value={field.value}
                            onChange={(e) => field.onChange(currencyRemoveMaskToNumber(e.target.value))}
                            className="h-12 rounded-xl border-gray-100 bg-orange-50/10 focus:bg-orange-50/20 text-orange-700 font-bold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                          <Boxes className="w-3 h-3 text-primary" /> Estoque Atual
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-12 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all font-bold"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                          <Package className="w-3 h-3 text-primary" /> Medida
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUnits || !!unitsError}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/30">
                              <SelectValue placeholder="Unidade..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            {units?.map((unit) => (
                              <SelectItem key={unit.value || unit.id} value={String(unit.value || unit.label || unit.name)} className="rounded-lg mb-1">
                                {unit.label || unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                          <Globe className="w-3 h-3 text-primary" /> Disponibilidade
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50/30">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            <SelectItem value="available" className="rounded-lg mb-1">Sucesso: Disponível</SelectItem>
                            <SelectItem value="limited" className="rounded-lg mb-1">Alerta: Estoque Limitado</SelectItem>
                            <SelectItem value="unavailable" className="rounded-lg mb-1">Erro: Indisponível</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna da Direita: Mídia e Status */}
          <div className="space-y-8">
            {/* Seção 3: Imagem */}
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Mídia</CardTitle>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Imagem visual do item</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="relative aspect-square w-full rounded-[2rem] bg-gray-50 border-4 border-dashed border-gray-100 overflow-hidden group flex items-center justify-center transition-all hover:bg-gray-100/50">
                        {field.value ? (
                          <>
                            <img 
                              src={field.value} 
                              alt="Preview" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               <Button 
                                 type="button" 
                                 variant="outline" 
                                 size="sm" 
                                 className="rounded-xl bg-white border-none font-bold"
                                 onClick={() => setIsMediaLibraryOpen(true)}
                               >
                                 <Edit className="w-4 h-4 mr-2" /> Alterar
                               </Button>
                               <Button 
                                 type="button" 
                                 variant="destructive" 
                                 size="sm" 
                                 className="rounded-xl font-bold"
                                 onClick={() => form.setValue('image', '', { shouldDirty: true })}
                               >
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-6 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center">
                               <Plus className="w-8 h-8 text-primary/40" />
                            </div>
                            <div>
                               <p className="font-black text-xs uppercase tracking-widest text-gray-400">Sem Foto</p>
                               <Button 
                                 type="button" 
                                 variant="link" 
                                 className="mt-1 font-bold text-primary"
                                 onClick={() => setIsMediaLibraryOpen(true)}
                               >
                                 Carregar da Biblioteca
                               </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="Link da imagem..." 
                          {...field} 
                          readOnly
                          className="rounded-xl border-gray-100 bg-gray-50/50 text-[10px] font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Seção 4: Configurações Extras */}
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Avaliações</CardTitle>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Feedback dos clientes</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                           Nota (0-5)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            className="h-12 rounded-xl border-gray-100 bg-gray-50/30"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reviews"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2 mb-2">
                           Nº Avaliações
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-12 rounded-xl border-gray-100 bg-gray-50/30"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 rounded-3xl bg-gray-50 border border-gray-100">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-500">Status</FormLabel>
                        <p className="text-xs font-bold text-gray-400">{field.value ? 'Produto Exposto' : 'Produto Oculto'}</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Seção 5: Variações e Complementos */}
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black tracking-tight">Variações</CardTitle>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Tamanhos, sabores e adicionais</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-pink-100 text-pink-600 hover:bg-pink-50 font-bold"
                    onClick={() => {
                      const current = form.getValues('variationGroups') || [];
                      form.setValue('variationGroups', [
                        ...current, 
                        { name: '', required: false, minChoices: 0, maxChoices: 1, options: [{ name: '', price: 0, active: true }] }
                      ]);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Novo Grupo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <FormField
                  control={form.control}
                  name="variationGroups"
                  render={({ field }) => (
                    <div className="space-y-6">
                      {(field.value || []).map((group, groupIndex) => (
                        <div key={groupIndex} className="p-6 rounded-3xl bg-gray-50/50 border border-gray-100 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Grupo (ex: Escolha o Tamanho)</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={group.name} 
                                    onChange={(e) => {
                                      const newGroups = [...field.value];
                                      newGroups[groupIndex].name = e.target.value;
                                      field.onChange(newGroups);
                                    }}
                                    placeholder="Ex: Adicionais, Sabores..." 
                                    className="h-10 rounded-xl bg-white border-gray-100"
                                  />
                                </FormControl>
                              </FormItem>
                              <div className="flex items-center gap-4 pt-6">
                                <FormItem className="flex items-center gap-2 space-y-0">
                                  <FormControl>
                                    <Switch 
                                      checked={group.required}
                                      onCheckedChange={(checked) => {
                                        const newGroups = [...field.value];
                                        newGroups[groupIndex].required = checked;
                                        field.onChange(newGroups);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-bold text-xs">Obrigatório</FormLabel>
                                </FormItem>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-gray-400 uppercase">Máx:</span>
                                  <Input 
                                    type="number"
                                    value={group.maxChoices}
                                    onChange={(e) => {
                                      const newGroups = [...field.value];
                                      newGroups[groupIndex].maxChoices = parseInt(e.target.value) || 1;
                                      field.onChange(newGroups);
                                    }}
                                    className="w-16 h-8 rounded-lg text-center font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-gray-400 hover:text-destructive"
                              onClick={() => {
                                const newGroups = field.value.filter((_, i) => i !== groupIndex);
                                field.onChange(newGroups);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="space-y-3 pl-4 border-l-2 border-pink-100">
                             <p className="text-[10px] font-black uppercase tracking-widest text-pink-400 mb-2">Opções do Grupo</p>
                             {group.options.map((option, optionIndex) => (
                               <div key={optionIndex} className="flex items-center gap-3">
                                 <Input 
                                   placeholder="Nome da opção"
                                   value={option.name}
                                   onChange={(e) => {
                                     const newGroups = [...field.value];
                                     newGroups[groupIndex].options[optionIndex].name = e.target.value;
                                     field.onChange(newGroups);
                                   }}
                                   className="flex-1 h-9 rounded-lg bg-white border-gray-100 text-sm"
                                 />
                                 <div className="w-32">
                                   <CurrencyInput 
                                     value={option.price}
                                     onChange={(e) => {
                                       const newGroups = [...field.value];
                                       newGroups[groupIndex].options[optionIndex].price = currencyRemoveMaskToNumber(e.target.value);
                                       field.onChange(newGroups);
                                     }}
                                     className="h-9 rounded-lg bg-white border-gray-100 text-sm font-bold text-emerald-600"
                                   />
                                 </div>
                                 <Button 
                                   type="button" 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-8 w-8 text-gray-300 hover:text-destructive"
                                   onClick={() => {
                                      const newGroups = [...field.value];
                                      newGroups[groupIndex].options = newGroups[groupIndex].options.filter((_, i) => i !== optionIndex);
                                      field.onChange(newGroups);
                                   }}
                                 >
                                   <X className="w-3 h-3" />
                                 </Button>
                               </div>
                             ))}
                             <Button 
                               type="button" 
                               variant="link" 
                               size="sm" 
                               className="text-pink-500 font-bold p-0 h-auto text-xs"
                               onClick={() => {
                                 const newGroups = [...field.value];
                                 newGroups[groupIndex].options.push({ name: '', price: 0, active: true });
                                 field.onChange(newGroups);
                               }}
                             >
                               + Adicionar Opção
                             </Button>
                          </div>
                        </div>
                      ))}
                      
                      {(!field.value || field.value.length === 0) && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-[2rem]">
                           <p className="text-gray-400 font-medium text-sm">Nenhuma variação cadastrada.</p>
                        </div>
                      )}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {/* Seção 6: Documentos */}
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Anexos</CardTitle>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Documentos e termos</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => {
                    const removeTerm = (termToRemove: string) => {
                      field.onChange(field.value?.filter(term => term !== termToRemove) || []);
                    };
                    
                    return (
                      <div className="space-y-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full h-12 rounded-xl border-dashed border-2 border-gray-200 text-gray-400 font-bold hover:text-primary hover:border-primary/50"
                          onClick={() => setIsTermsMediaLibraryOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Adicionar Termos
                        </Button>
                        
                        <div className="flex flex-col gap-2">
                          {field.value?.map((term, index) => {
                            const isUrl = term.startsWith('http') || term.startsWith('/');
                            const displayText = isUrl ? term.split('/').pop() : term;
                            
                            return (
                              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-2 min-w-0">
                                   <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                   <span className="text-xs font-bold text-gray-600 truncate">{displayText}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg text-gray-400 hover:text-destructive p-0"
                                  onClick={() => removeTerm(term)}
                                >
                                  <X className="h-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Bar */}
        <FormActionBar
          mode={isEditing ? "edit" : "create"}
          fixed={true}
          onBack={onCancel}
          onSaveContinue={() => onSubmit(form.getValues())}
          onSaveExit={() => onSubmit(form.getValues())}
          isLoading={isSubmitting}
        />
      </form>
    </Form>
  );
}

export { productSchema };
export type { Category, Unit };
