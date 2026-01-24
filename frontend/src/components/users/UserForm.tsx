import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { DialogFooter } from '@/components/ui/dialog';
import { AddressAccordion } from "@/components/lib/AddressAccordion";
import { SmartDocumentInput } from '@/components/lib/SmartDocumentInput';
import { MaskedInputField } from '@/components/lib/MaskedInputField';
import { UseFormReturn } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Organization } from '@/types/organization';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';
import { useAuth } from '@/contexts/AuthContext';

import { FormActionBar } from '@/components/common/FormActionBar';

// ... imports remain the same

interface Permission {
  id: number;
  name: string;
}

/**
 * Estrutura de dados do formulário de usuário
 * User form data structure used by react-hook-form
 */
interface UserFormData {
  name: string;
  email: string;
  permission_id: string;
  client_permission?: string[];
  organization_id?: string | number | null;
  tipo_pessoa?: 'pf' | 'pj';
  password?: string;
  genero?: 'm' | 'f' | 'ni';
  ativo?: 's' | 'n';
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: {
    celular?: string;
    telefone_comercial?: string;
    nascimento?: string;
  };
}

/**
 * Propriedades do componente UserForm
 * UserForm component props for create/edit flows
 */
interface UserFormProps {
  form: UseFormReturn<UserFormData>;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  editingUser?: UserFormData | null;
  permissions: Permission[];
  organizations?: Organization[];
  isLoadingPermissions: boolean;
  handleOnclick?: () => void;
  /** Controla exibição do campo Tipo de Pessoa | Controls visibility of person type field */
  showTipoPessoa?: boolean;
  /** Controla exibição do campo Gênero | Controls visibility of gender field */
  showGenero?: boolean;
  /** Controla exibição da seção de endereço | Controls visibility of address section */
  showAddressSection?: boolean;
  /** Controla exibição do CPF (PF) | Controls CPF visibility for PF */
  showCpf?: boolean;
  /** Controla exibição dos telefones | Controls phone fields visibility */
  showPhones?: boolean;
  /** Usa Switch para campo Ativo | Use Switch for Active field */
  ativoAsSwitch?: boolean;
  /** Controla exibição de Data de Nascimento | Controls birth date visibility */
  showBirthDate?: boolean;

  // New props for fixed footer
  useFixedFooter?: boolean;
  onSaveContinue?: () => void;
  onSaveExit?: () => void;
  onView?: () => void;
  onBack?: () => void;
}

/**
 * Componente de formulário para criação e edição de usuários
 * Suporta tanto pessoa física quanto jurídica com validações específicas
 */
/**
 * UserForm — Formulário compartilhado de usuário
 * pt-BR: Permite criar/editar usuários com campos configuráveis por flags.
 *        Use `showAddressSection` para ocultar a seção de endereço quando necessário.
 * en-US: Shared user form for create/edit flows with configurable field visibility.
 *        Use `showAddressSection` to hide the address section when needed.
 */
export function UserForm({
  form,
  onSubmit,
  onCancel,
  editingUser,
  permissions,
  organizations = [],
  isLoadingPermissions,
  handleOnclick,
  showTipoPessoa = true,
  showGenero = true,
  showAddressSection = true,
  showCpf = true,
  showPhones = true,
  ativoAsSwitch = false,
  showBirthDate = true,
  useFixedFooter = false,
  onSaveContinue,
  onSaveExit,
  onView,
  onBack,
}: UserFormProps): React.ReactElement {
  const [showPassword, setShowPassword] = React.useState(false);
  const { user: currentUser } = useAuth();
  const isOrgDisabled = currentUser ? Number(currentUser.permission_id) >= 3 : false;
  const usageOptions: MultiSelectOption[] = React.useMemo(() => {
    return permissions.slice(3).map((p) => ({ value: String(p.id), label: p.name }));
  }, [permissions]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Erros de validação:', errors);
        })}
        className="space-y-8"
      >
        <div className="space-y-8">
          {/* Seção: Informações Básicas */}
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} value={field.value ?? ''} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} value={field.value ?? ''} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {showTipoPessoa && (
                <FormField
                  control={form.control}
                  name="tipo_pessoa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pessoa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pf">Pessoa Física</SelectItem>
                          <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showGenero && (
                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o gênero" />
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
              )}

              {form.watch('tipo_pessoa') === 'pf' && showCpf && (
                <SmartDocumentInput
                  name="cpf"
                  control={form.control}
                  label="CPF"
                  tipoPessoa="pf"
                  placeholder="000.000.000-00"
                />
              )}

              {form.watch('tipo_pessoa') === 'pj' && (
                <>
                  <SmartDocumentInput
                    name="cnpj"
                    control={form.control}
                    label="CNPJ"
                    tipoPessoa="pj"
                    placeholder="00.000.000/0000-00"
                  />
                  <FormField
                    control={form.control}
                    name="razao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl>
                          <Input placeholder="Razão social da empresa" {...field} value={field.value ?? ''} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="permission_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissão de Acesso</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value !== undefined && field.value !== null && field.value !== "" ? String(field.value) : undefined} 
                      disabled={isLoadingPermissions}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={isLoadingPermissions ? "Carregando..." : "Selecione a permissão"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[60]">
                        {permissions.map((permission) => (
                          <SelectItem key={permission.id} value={String(permission.id)}>
                            {permission.name}
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
                name="client_permission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissão de Uso</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={usageOptions}
                        value={(field.value as string[]) || []}
                        onChange={field.onChange}
                        placeholder="Selecione uma ou mais permissões de uso"
                        searchPlaceholder="Buscar..."
                        emptyText="Nenhuma opção."
                        disabled={isLoadingPermissions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organização</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === 'none' ? null : Number(val))} 
                      value={field.value !== null && field.value !== undefined ? String(field.value) : "none"}
                      disabled={isOrgDisabled}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione a organização" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {organizations?.map((org) => (
                          <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Senha (min. 6 caracteres)"
                          {...field}
                          value={field.value ?? ''}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  ativoAsSwitch ? (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-input bg-white px-4 py-2 h-[44px] shadow-sm">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-sm font-medium cursor-pointer mb-0">Status:</FormLabel>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${field.value === 's' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {field.value === 's' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 's'}
                          onCheckedChange={(checked) => field.onChange(checked ? 's' : 'n')}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  ) : (
                    <FormItem>
                      <FormLabel>Ativo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="s">Sim</SelectItem>
                          <SelectItem value="n">Não</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )
                )}
              />
              
              {showPhones && (
                <>
                  <FormField
                    control={form.control}
                    name="config.celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                            placeholder="+55 (11) 99999-9999"
                            disabled={isLoadingPermissions}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="config.telefone_comercial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                            placeholder="+55 (11) 3333-4444"
                            disabled={isLoadingPermissions}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {showBirthDate && (
                <FormField
                  control={form.control}
                  name="config.nascimento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
          
          {/* Seção Endereço (usando accordion já existente) */}
          {showAddressSection && (
             <AddressAccordion form={form} />
          )}
        </div>
        
        {useFixedFooter ? (
          <FormActionBar
            mode="create"
            fixed={true}
            onBack={onBack || onCancel}
            onSaveContinue={onSaveContinue}
            onSaveExit={onSaveExit}
            onSaveEdit={handleOnclick} 
            onView={onView}
            showView={Boolean(editingUser) && !!onView}
            showCancel={true} // In edit mode FormActionBar handles cancel internally if passed onCancel
            onCancel={onCancel}
            isLoading={isLoadingPermissions}
            labels={{
              view: 'Visualizar usuario'
            }}
          />
        ) : (
          <div className="flex items-center justify-end space-x-4 pt-6 border-t mt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel}
              className="px-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleOnclick}
              disabled={isLoadingPermissions}
              className="px-12 shadow-lg hover:shadow-primary/20 transition-all font-semibold"
            >
              {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
