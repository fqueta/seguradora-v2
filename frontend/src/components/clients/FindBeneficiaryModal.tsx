import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ShieldCheck, Loader2 } from 'lucide-react';
import { clientsService } from '@/services/clientsService';
import { toast } from 'sonner';

interface FindBeneficiaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindBeneficiaryModal({ open, onOpenChange }: FindBeneficiaryModalProps) {
  const [searchBy, setSearchBy] = useState<'cpf' | 'name'>('cpf');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // CPF Mask function
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove non-digits
      .replace(/(\d{3})(\d)/, '$1.$2') // Add first dot
      .replace(/(\d{3})(\d)/, '$1.$2') // Add second dot
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Add hyphen
      .replace(/(-\d{2})\d+?$/, '$1'); // Limit total length
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (searchBy === 'cpf') {
      value = maskCPF(value);
    }
    setSearchTerm(value);
  };

  const [isConsulting, setIsConsulting] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    // Remove mask for query if searching by CPF or just use as is
    const cleanSearch = searchBy === 'cpf' ? searchTerm.replace(/\D/g, '') : searchTerm;

    // Redirect to clients list with search parameter
    navigate(`/admin/clients?search=${encodeURIComponent(cleanSearch)}`);
    onOpenChange(false);
  };

  const handleConsult = async () => {
    if (!searchTerm.trim()) return;
    if (searchBy !== 'cpf') {
      toast.info('A consulta detalhada está disponível apenas para CPF.');
      return;
    }

    const cpfClean = searchTerm.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      toast.error('Informe um CPF válido para consulta.');
      return;
    }

    setIsConsulting(true);
    try {
      const response = await clientsService.consultCpf(cpfClean);
      if (response.exec && response.data) {
        toast.success(response.message || 'Cliente encontrado!');
        // Redirect to client view
        navigate(`/admin/clients/${response.data.id}/view`);
        onOpenChange(false);
      } else {
        toast.error(response.message || 'CPF não encontrado na base de dados.');
      }
    } catch (error: any) {
      toast.error(`Erro ao consultar CPF: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-white border-b relative">
          <DialogTitle className="text-xl font-medium text-slate-800">
            Encontrar beneficiário
          </DialogTitle>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
        </DialogHeader>

        <form onSubmit={handleSearch} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Consultar por</h3>
            
            <div className="flex flex-col sm:flex-row gap-0 rounded-md border border-slate-200 overflow-hidden">
              <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200">
                <Select value={searchBy} onValueChange={(value: any) => {
                  setSearchBy(value);
                  setSearchTerm(''); // Clear when switching
                }}>
                  <SelectTrigger className="border-none focus:ring-0 h-12 rounded-none bg-slate-50 shadow-none">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 flex items-center relative">
                <Input
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder={searchBy === 'cpf' ? "000.000.000-00" : "Informe o Nome"}
                  className="border-none focus-visible:ring-0 h-12 rounded-none shadow-none text-slate-600 placeholder:text-slate-400"
                  maxLength={searchBy === 'cpf' ? 14 : undefined}
                />
                <button 
                  type="submit"
                  className="absolute right-0 top-0 h-full w-12 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              className="rounded-md px-8 h-10 font-medium"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button 
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-8 h-10 font-medium"
              onClick={handleSearch}
            >
              Pesquisar
            </Button>
            {searchBy === 'cpf' && (
              <Button 
                type="button"
                variant="secondary"
                className="rounded-md px-6 h-10 font-medium flex items-center gap-2"
                onClick={handleConsult}
                disabled={isConsulting}
              >
                {isConsulting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isConsulting ? 'Consultando...' : 'Consultar CPF'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
