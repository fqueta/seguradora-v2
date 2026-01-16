/**
 * Tipos relacionados a contratos de seguros
 */

export type ContractStatus = 'pending' | 'active' | 'cancelled' | 'approved' | 'draft';

/**
 * Registro de contrato retornado pela API
 */
export interface ContractRecord {
  id: number;
  uuid: string;
  contract_number?: string;
  client_id?: string | number;
  owner_id?: string | number;
  product_id?: string | number;
  status: string; // ContractStatus
  start_date?: string;
  end_date?: string;
  c_number?: string;
  description?: string;
  value?: number;
  file_path?: string;
  type?: string;
  address?: any;
  created_at?: string;
  updated_at?: string;
  client?: any;
  owner?: any;
  product?: any;
  events?: ContractEvent[];
}

export interface ContractEvent {
  id: number;
  contract_id: number;
  user_id?: number;
  event_type: string;
  description?: string;
  from_status?: string;
  to_status?: string;
  metadata?: any;
  payload?: any;
  created_at?: string;
  updated_at?: string;
  user?: any;
}

/**
 * Payload para criar contrato
 */
export interface CreateContractInput {
  contract_number?: string;
  client_id?: string | number;
  owner_id?: string | number;
  product_id?: string | number;
  status?: string;
  start_date?: string;
  end_date?: string;
  c_number?: string;
  description?: string;
  value?: number;
  file_path?: string;
  type?: string;
  address?: any;
}

/**
 * Payload para atualizar contrato
 */
export interface UpdateContractInput extends Partial<CreateContractInput> {}

/**
 * Filtros de listagem
 */
export interface ContractsListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  client_id?: string | number;
  organization_id?: string | number;
  owner_id?: string | number;
  vigencia_inicio?: string;
  vigencia_fim?: string;
}
