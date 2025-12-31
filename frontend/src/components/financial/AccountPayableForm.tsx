/**
 * Formulário para criação e edição de contas a pagar
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QuickCreateCategoryModal } from './QuickCreateCategoryModal';
import {
  AccountPayable,
  CreateAccountPayableDto,
  PaymentMethod,
  RecurrenceType,
  FinancialCategory
} from '../../types/financial';
import { financialService } from '../../services/financialService';
import { currencyApplyMask, currencyRemoveMaskToNumber } from '../../lib/masks/currency';
import { Combobox, useComboboxOptions } from '../ui/combobox';
import QuickClientForm from '../serviceOrders/QuickClientForm';
import { clientsService } from '../../services/clientsService';
import { ClientRecord } from '../../types/clients';

interface AccountPayableFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: AccountPayable;
  categories: FinancialCategory[];
}

/**
 * Componente de formulário para contas a pagar
 */
export const AccountPayableForm: React.FC<AccountPayableFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  account,
  categories
}) => {
  const [formData, setFormData] = useState<CreateAccountPayableDto>({
    description: '',
    amount: 0,
    dueDate: '',
    category: '',
    supplierName: '',
    invoiceNumber: '',
    paymentMethod: PaymentMethod.CASH,
    notes: '',
    recurrence: RecurrenceType.NONE,
    installments: 1
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [localCategories, setLocalCategories] = useState<FinancialCategory[]>(categories);
  const [amountMasked, setAmountMasked] = useState<string>(currencyApplyMask('0'));
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  /**
   * Atualiza as categorias locais quando as categorias prop mudam
   */
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  /**
   * Preenche o formulário quando editando uma conta existente
   */
  useEffect(() => {
    if (account) {
      setFormData({
        description: account.description,
        amount: account.amount,
        dueDate: account.dueDate.split('T')[0],
        category: account.category,
        supplierName: account.supplierName || '',
        invoiceNumber: account.invoiceNumber || '',
        paymentMethod: account.paymentMethod || PaymentMethod.CASH,
        notes: account.notes || '',
        recurrence: account.recurrence || RecurrenceType.NONE,
        installments: account.installments || 1
      });
      setAmountMasked(currencyApplyMask(String(Math.round((account.amount || 0) * 100))));
    } else {
      setFormData({
        description: '',
        amount: 0,
        dueDate: todayStr,
        category: '',
        supplierName: '',
        invoiceNumber: '',
        paymentMethod: PaymentMethod.CASH,
        notes: '',
        recurrence: RecurrenceType.NONE,
        installments: 1
      });
      setAmountMasked(currencyApplyMask('0'));
    }
    setErrors({});
  }, [account, isOpen]);

  /**
   * Valida os dados do formulário
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Data de vencimento é obrigatória';
    }

    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (formData.installments && formData.installments < 1) {
      newErrors.installments = 'Número de parcelas deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Manipula mudanças nos campos do formulário
   */
  const handleInputChange = (field: keyof CreateAccountPayableDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  const handleAmountMaskedChange = (raw: string) => {
    const masked = currencyApplyMask(raw, 'pt-BR', 'BRL');
    setAmountMasked(masked);
    const num = currencyRemoveMaskToNumber(masked);
    handleInputChange('amount', num);
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };
  const searchClients = React.useCallback(async (term: string) => {
    const q = String(term || '').trim();
    if (q.length < 2) {
      setClientOptions([]);
      return;
    }
    setIsClientLoading(true);
    try {
      const res = await clientsService.listClients({ search: q, page: 1, per_page: 10 });
      const opts = res.data.map((c: ClientRecord) => ({
        value: c.id,
        label: c.name,
        description: c.email || undefined,
      }));
      setClientOptions(opts);
    } catch (e) {
      // ignore
    } finally {
      setIsClientLoading(false);
    }
  }, []);
  const loadInitialClients = React.useCallback(async () => {
    setIsClientLoading(true);
    try {
      const res = await clientsService.listClients({ page: 1, per_page: 10, excluido: 'n', permission_id: 7 });
      const opts = res.data.map((c: ClientRecord) => ({
        value: c.id,
        label: c.name,
        description: c.email || undefined,
      }));
      setClientOptions(opts);
    } catch (e) {
      // ignore
    } finally {
      setIsClientLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isOpen) {
      loadInitialClients();
    }
  }, [isOpen, loadInitialClients]);

  /**
   * Submete o formulário
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Sanitiza payload removendo strings vazias
      const payload: CreateAccountPayableDto = {
        ...formData,
        supplierName: formData.supplierName || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        notes: formData.notes || undefined,
      };
      if (account) {
        // Editar conta existente
        await financialService.accountsPayable.update(account.id, payload);
        toast.success('Conta a pagar atualizada com sucesso!');
      } else {
        // Criar nova conta
        await financialService.accountsPayable.create(payload);
        toast.success('Conta a pagar criada com sucesso!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar conta a pagar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar conta a pagar');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filtra categorias de despesa
   */
  const expenseCategories = localCategories.filter(cat => cat.type === 'expense' && cat.isActive);
  const categoryOptions = useComboboxOptions(expenseCategories, 'id', 'name');
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string; description?: string }[]>([]);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  /**
   * Manipula a criação de nova categoria
   */
  const handleCategoryCreated = (newCategory: FinancialCategory) => {
    setLocalCategories(prev => [...prev, newCategory]);
    setFormData(prev => ({ ...prev, category: newCategory.id }));
    setShowCategoryModal(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descrição */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição da conta a pagar"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <span className="text-sm text-red-500">{errors.description}</span>
              )}
            </div>

            {/* Valor */}
            <div>
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                value={amountMasked}
                onChange={(e) => handleAmountMaskedChange(e.target.value)}
                placeholder="R$ 0,00"
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <span className="text-sm text-red-500">{errors.amount}</span>
              )}
            </div>

            {/* Data de Vencimento */}
            <div>
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={errors.dueDate ? 'border-red-500' : ''}
              />
              {errors.dueDate && (
                <span className="text-sm text-red-500">{errors.dueDate}</span>
              )}
            </div>

            {/* Categoria (Combobox) */}
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={categoryOptions}
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                    placeholder="Selecione uma categoria"
                    searchPlaceholder="Pesquisar categorias..."
                    className={errors.category ? 'border-red-500' : ''}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCategoryModal(true)}
                  title="Criar nova categoria"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.category && (
                <span className="text-sm text-red-500">{errors.category}</span>
              )}
            </div>

            {/* Fornecedor */}
            <div>
              <Label htmlFor="supplierName">Fornecedor</Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) => handleInputChange('supplierName', e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>
            
            {/* Cliente (opcional, Combobox com criação rápida) */}
            <div>
              <Label htmlFor="clientId">Cliente (opcional)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={clientOptions}
                    value={formData.clientId || ''}
                    onValueChange={(value) => handleInputChange('clientId', value || undefined)}
                    placeholder="Selecionar cliente"
                    searchPlaceholder="Pesquisar clientes..."
                    loading={isClientLoading}
                    onSearch={searchClients}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowClientModal(true)}
                  title="Criar novo cliente"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Número da Nota Fiscal */}
            <div>
              <Label htmlFor="invoiceNumber">Número da NF</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                placeholder="Número da nota fiscal"
              />
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>Dinheiro</SelectItem>
                  <SelectItem value={PaymentMethod.CREDIT_CARD}>Cartão de Crédito</SelectItem>
                  <SelectItem value={PaymentMethod.DEBIT_CARD}>Cartão de Débito</SelectItem>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Transferência Bancária</SelectItem>
                  <SelectItem value={PaymentMethod.PIX}>PIX</SelectItem>
                  <SelectItem value={PaymentMethod.CHECK}>Cheque</SelectItem>
                  <SelectItem value={PaymentMethod.BOLETO}>Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recorrência */}
            <div>
              <Label htmlFor="recurrence">Recorrência</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value) => handleInputChange('recurrence', value as RecurrenceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecurrenceType.NONE}>Nenhuma</SelectItem>
                  <SelectItem value={RecurrenceType.DAILY}>Diária</SelectItem>
                  <SelectItem value={RecurrenceType.WEEKLY}>Semanal</SelectItem>
                  <SelectItem value={RecurrenceType.MONTHLY}>Mensal</SelectItem>
                  <SelectItem value={RecurrenceType.QUARTERLY}>Trimestral</SelectItem>
                  <SelectItem value={RecurrenceType.YEARLY}>Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número de Parcelas */}
            {formData.recurrence !== RecurrenceType.NONE && (
              <div>
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  value={formData.installments}
                  onChange={(e) => handleInputChange('installments', parseInt(e.target.value) || 1)}
                  className={errors.installments ? 'border-red-500' : ''}
                />
                {errors.installments && (
                  <span className="text-sm text-red-500">{errors.installments}</span>
                )}
              </div>
            )}

            {/* Observações */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : account ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Modal de Cadastro Rápido de Categoria */}
      <QuickCreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryCreated={handleCategoryCreated}
        categoryType="expense"
      />
      {/* Modal de Cadastro Rápido de Cliente */}
      {showClientModal && (
        <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <QuickClientForm 
              onClientCreated={(client) => {
                // Atualiza opções e seleciona novo cliente
                setClientOptions(prev => [{ value: client.id, label: client.name, description: client.email }, ...prev]);
                handleInputChange('clientId', client.id);
                setShowClientModal(false);
              }}
              onCancel={() => setShowClientModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default AccountPayableForm;
