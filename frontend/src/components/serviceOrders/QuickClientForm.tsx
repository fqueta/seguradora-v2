import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { object, z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "@/components/ui/use-toast"; // Correct toast import
import { clientsService } from "@/services/clientsService";
import { phoneApplyMask } from "@/lib/masks/phone-apply-mask";
import { cpfApplyMask } from "@/lib/masks/cpf-apply-mask"; // Import CPF mask
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMask, format } from "@react-input/mask";
import { useCep } from '@/hooks/useCep';

import { AddressInputs } from '@/components/lib/AddressInputs';

/**
 * Schema de validação para cadastro rápido de cliente
 */
const quickClientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string({ required_error: "CPF é obrigatório" }).min(14, "CPF incompleto"), // CPF is mandatory
  phone: z.string().optional(),
  birth_date: z.string({ required_error: "Data de Nascimento é obrigatória" }).min(1, "Data de Nascimento é obrigatória"),
  genero: z
    .enum(["m", "f", "ni"])
    .or(z.literal(""))
    .refine((val) => val !== "", { message: "Sexo é obrigatório" }),
  notes: z.string().optional(),
  config: z.object({
    cep: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().optional(),
  }).optional(),
});

type QuickClientFormData = z.infer<typeof quickClientSchema>;

/**
 * Interface para dados do cliente criado/atualizado
 */
interface ClientData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

/**
 * Props do componente QuickClientForm
 */
interface QuickClientFormProps {
  clientId?: string; // ID for editing mode
  onClientCreated?: (client: ClientData) => void;
  onClientUpdated?: (client: ClientData) => void;
  onCancel: () => void;
}

export default function QuickClientForm({ 
  clientId, 
  onClientCreated, 
  onClientUpdated, 
  onCancel 
}: QuickClientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(!!clientId);
  const isEdit = !!clientId;

  const form = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      name: "",
      email: "",
      cpf: "",
      phone: "",
      birth_date: "",
    genero: "",
      notes: "",
      config: {
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
      }
    },
  });
  const { fetchCep, isValidCep, clearAddressData } = useCep();

  const handleCepChange = async (value: string) => {
    const cleanCep = value.replace(/\D/g, "");
    form.setValue("config.cep", value);
    if (cleanCep.length === 8 && isValidCep(cleanCep)) {
      const addr = await fetchCep(cleanCep);
      if (addr) {
        form.setValue("config.endereco", addr.endereco || "");
        form.setValue("config.bairro", addr.bairro || "");
        form.setValue("config.cidade", addr.cidade || "");
        form.setValue("config.uf", addr.uf || "");
      }
    } else {
      clearAddressData?.();
    }
  };

  // Fetch client data if in edit mode
  useEffect(() => {
    if (clientId) {
      setIsFetchingInfo(true);
      clientsService.getClient(clientId)
        .then((client) => {
          form.reset({
            name: client.name,
            email: client.email || "",
            cpf: (client as any).cpf || "", // Load CPF
            phone: client.config?.celular || (client as any).celular || "",
            birth_date: client.config?.nascimento || "",
            genero: client.genero || "ni",
            notes: client.config?.observacoes || "",
            config: {
              cep: client.config?.cep || "",
              endereco: client.config?.endereco || "",
              numero: client.config?.numero || "",
              complemento: client.config?.complemento || "",
              bairro: client.config?.bairro || "",
              cidade: client.config?.cidade || "",
              uf: client.config?.uf || "",
            }
          });
        })
        .catch((err) => {
          console.error(err);
          toast({ 
            title: "Erro ao carregar dados do cliente", 
            variant: "destructive" 
          });
          onCancel();
        })
        .finally(() => {
          setIsFetchingInfo(false);
        });
    }
  }, [clientId, form, onCancel]);

  const onSubmit = async (data: QuickClientFormData) => {
    try {
      setIsLoading(true);

      const clientPayload: any = {
        name: data.name,
        email: data.email || undefined,
        cpf: data.cpf, // Save CPF
        celular: data.phone || undefined,
        // Preserve existing values or defaults
        tipo_pessoa: 'pf',
        genero: data.genero,
        config: {
            nascimento: data.birth_date || undefined,
            observacoes: data.notes || undefined,
            celular: data.phone || undefined,
            // Address fields
            cep: data.config?.cep || undefined,
            endereco: data.config?.endereco || undefined,
            numero: data.config?.numero || undefined,
            complemento: data.config?.complemento || undefined,
            bairro: data.config?.bairro || undefined,
            cidade: data.config?.cidade || undefined,
            uf: data.config?.uf || undefined,
        }
      };

      let response;
      if (isEdit && clientId) {
        response = await clientsService.update(clientId, clientPayload);
        toast({ title: "Cliente atualizado com sucesso" });
        if (onClientUpdated) {
          onClientUpdated({
            id: response.id.toString(),
            name: response.name,
            email: response.email,
            phone: response.config?.celular || (response as any).celular,
          });
        }
      } else {
        response = await clientsService.create(clientPayload);
        toast({ title: "Cliente cadastrado com sucesso" });
        if (onClientCreated) {
          onClientCreated({
            id: response.id.toString(),
            name: response.name,
            email: response.email,
            phone: response.config?.celular || (response as any).celular,
          });
        }
      }
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      
      // Determine invalid fields from backend response
      // BaseApiService puts the JSON response in 'body'
      const apiErrors = error?.body?.errors || error?.response?.data?.errors;

      if (apiErrors) {
          Object.keys(apiErrors).forEach((key) => {
             const message = apiErrors[key][0];
             
             // Map backend 'celular' to frontend 'phone'
             if (key === 'celular') {
                 form.setError('phone', { message });
             } else {
                 form.setError(key as any, { message });
             }
          });
          
          // Show specific validation error in toast if available
          const firstError = Object.values(apiErrors)[0];
          const description = Array.isArray(firstError) ? firstError[0] : "Verifique os campos obrigatórios";

          toast({ 
              title: "Erro de validação", 
              description: description as string,
              variant: "destructive" 
          });
      } else {
        const errorMessage = error?.body?.message || error?.message || "Erro ao salvar cliente";
        toast({ title: "Erro ao salvar cliente", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingInfo) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      <Form {...form}>
        <form 
          onSubmit={(e) => {
            e.stopPropagation();
            form.handleSubmit(onSubmit)(e);
          }} 
          className="space-y-4"
        >
          <div className="max-h-[60vh] overflow-y-auto px-1 py-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome completo do cliente"
                        {...field}
                        value={field.value ?? ''}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                        value={field.value ?? ''}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CPF */}
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(cpfApplyMask(e.target.value))}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Telefone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Phone className="h-4 w-4 inline mr-1" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-9999"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha: Data de Nascimento, Sexo e CEP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Data Nascimento */}
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Sexo */}
              <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o sexo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="m">Masculino</SelectItem>
                        <SelectItem value="f">Feminino</SelectItem>
                        <SelectItem value="ni">Não Informado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* CEP */}
              <FormField
                control={form.control}
                name="config.cep"
                render={() => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Controller
                        name="config.cep"
                        control={form.control}
                        render={({ field }) => (
                          <InputMask
                            mask="ddddd-ddd"
                            replacement={{ d: /\d/ }}
                            value={field.value && typeof field.value === 'string' && field.value.trim() !== '' ? format(field.value, { mask: "ddddd-ddd", replacement: { d: /\d/ } }) : ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleCepChange(e.target.value);
                            }}
                            placeholder="00000-000"
                            ref={field.ref}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Endereço Completo (sem CEP) */}
            <AddressInputs form={form} showCep={false} />

            

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o cliente..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ''}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 justify-end pt-4 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salving...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
