import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Image as ImageIcon, FileText, Paperclip } from "lucide-react";
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
  availability: z.enum(["available", "limited", "unavailable"], {
    required_error: "Disponibilidade é obrigatória",
  }),
  plan: z.enum(["1","2","3","4","5","6","7","8","9"]).optional(),
  terms: z.array(z.string()).optional(),
  validUntil: z.string().optional(),
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

interface ProductFormProps {
  form: UseFormReturn<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isSubmitting: boolean;
  categories: Category[];
  units: Unit[];
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
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
  isLoadingCategories,
  isLoadingUnits,
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
  
  // console.log('categories', categories);
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
        defaultFilters={{ mime: 'application/pdf' }} // Prioriza PDF mas permite outros se limpar filtro
      />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Nome do Produto</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do produto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descrição do produto (opcional)" 
                    className="resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories || !!categoriesError}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingCategories ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Carregando categorias...
                      </div>
                    ) : categoriesError ? (
                      <div className="p-2 text-sm text-destructive">
                        Erro ao carregar categorias
                      </div>
                    ) : !categories || categories.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhuma categoria disponível
                      </div>
                    ) : (
                      categories?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      )) || []
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagem do Produto</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="URL da imagem" 
                      {...field} 
                      readOnly
                      className="bg-muted"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      title="Selecionar da biblioteca"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </FormControl>
                {field.value && (
                  <div className="mt-2 relative w-full h-40 bg-muted rounded-md overflow-hidden border">
                    <img 
                      src={field.value} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => form.setValue('image', '', { shouldDirty: true })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Venda</FormLabel>
                <FormControl>
                  <CurrencyInput 
                    value={field.value}
                    onChange={(e) => field.onChange(currencyRemoveMaskToNumber(e.target.value))}
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
                <FormLabel>Preço de Custo</FormLabel>
                <FormControl>
                  <CurrencyInput 
                    value={field.value}
                    onChange={(e) => field.onChange(currencyRemoveMaskToNumber(e.target.value))}
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
                <FormLabel>Estoque</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
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
                <FormLabel>Unidade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUnits || !!unitsError}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingUnits ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Carregando unidades...
                      </div>
                    ) : unitsError ? (
                      <div className="p-2 text-sm text-destructive">
                        Erro ao carregar unidades
                      </div>
                    ) : !units || units.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhuma unidade disponível
                      </div>
                    ) : (
                      units?.map((unit) => (
                        <SelectItem key={unit.value || unit.id} value={String(unit.value || unit.label || unit.name)}>
                          {unit.label || unit.name}
                        </SelectItem>
                      )) || []
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plano</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["1","2","3","4","5","6","7","8","9"].map((p) => (
                      <SelectItem key={p} value={p}>Plano {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />


          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avaliação (0-5)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="0.0" 
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
                <FormLabel>Número de Avaliações</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
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
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disponibilidade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a disponibilidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="limited">Limitado</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => {
              const [newTerm, setNewTerm] = useState("");
              
              const addTerm = () => {
                if (newTerm.trim() && !field.value?.includes(newTerm.trim())) {
                  field.onChange([...(field.value || []), newTerm.trim()]);
                  setNewTerm("");
                }
              };
              
              const removeTerm = (termToRemove: string) => {
                field.onChange(field.value?.filter(term => term !== termToRemove) || []);
              };
              
              return (
                <FormItem>
                  <FormLabel>Termos e Condições (link de Arquivos na biblioteca)</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          placeholder="Digite ID ou Texto"
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTerm())}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setIsTermsMediaLibraryOpen(true)}
                          title="Selecionar arquivo da biblioteca"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button type="button" onClick={addTerm} variant="outline">
                        Adicionar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {field.value?.map((term, index) => {
                        // Check if it's a URL (simple check)
                        const isUrl = term.startsWith('http') || term.startsWith('/');
                        // Extract filename for display if it's a URL
                        const displayText = isUrl ? term.split('/').pop() : term;
                        
                        return (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1 max-w-[200px]" title={term}>
                            {isUrl ? (
                              <a 
                                href={term} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 hover:underline cursor-pointer min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="h-3 w-3 mr-1 text-blue-500 flex-shrink-0" />
                                <span className="truncate">{displayText}</span>
                              </a>
                            ) : (
                              <span className="truncate">{displayText}</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 hover:bg-transparent text-muted-foreground hover:text-destructive p-0 flex-shrink-0"
                              onClick={() => removeTerm(term)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adicione URLs de arquivos da biblioteca (ícone de clipe) ou textos simples.
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Válido Até (opcional)</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Produto Ativo</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Produto disponível para venda
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />


        </div>
      </div>
    </Form>
  );
}

export { productSchema };
export type { Category, Unit };
