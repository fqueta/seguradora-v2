import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SupplierRecord } from '@/types/suppliers';
import { Mail, Phone } from 'lucide-react';

import { cpfApplyMask } from '@/lib/masks/cpf-apply-mask';
import { cnpjApplyMask } from '@/lib/masks/cnpj-apply-mask';

interface SuppliersTableProps {
  suppliers: SupplierRecord[];
  onEdit: (supplier: SupplierRecord) => void;
  onDelete: (supplier: SupplierRecord) => void;
  onView?: (supplier: SupplierRecord) => void;
  isLoading: boolean;
}

/**
 * Componente de tabela para exibição de fornecedores
 */
export function SuppliersTable({ suppliers, onEdit, onDelete, onView, isLoading }: SuppliersTableProps) {
  // Garantir que suppliers seja sempre um array válido
  const suppliersList = Array.isArray(suppliers) ? suppliers : [];
  
  if (isLoading) {
    return <div className="text-center py-4">Carregando fornecedores...</div>;
  }
  
  if (suppliersList.length === 0) {
    return <div className="text-center py-4">Nenhum fornecedor encontrado</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Localização</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliersList.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell>
              {supplier.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {supplier.email}</div>}
              {supplier.config?.celular && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {supplier.config.celular}</div>}
              {supplier.config?.telefone_comercial && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {supplier.config.telefone_comercial}</div>}
            </TableCell>
            <TableCell>
              {supplier.tipo_pessoa === 'pf' ? (supplier.cpf ? cpfApplyMask(supplier.cpf) : 'Não informado') : (supplier.cnpj ? cnpjApplyMask(supplier.cnpj) : 'Não informado')}
            </TableCell>
            <TableCell>
              {supplier.config?.cidade && `${supplier.config.cidade}/${supplier.config.uf}`}
            </TableCell>
            <TableCell>
              <Badge className={supplier.ativo === 's' ? "success" : "destructive"}>
                {supplier.ativo === 's' ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(supplier)}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(supplier)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(supplier)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
