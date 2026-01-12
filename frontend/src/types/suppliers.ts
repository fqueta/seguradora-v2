export interface SupplierConfig {
  nome_fantasia?: string;
  celular?: string;
  telefone_residencial?: string;
  telefone_comercial?: string;
  rg?: string;
  nascimento?: string;
  escolaridade?: string;
  profissao?: string;
  tipo_pj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
}

export interface SupplierRecord {
  id: string;
  tipo_pessoa: "pf" | "pj";
  email: string;
  name: string;
  password?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: SupplierConfig;
  genero: "m" | "f" | "ni";
  ativo: "s" | "n";
  created_at?: string;
  updated_at?: string;
}

export interface CreateSupplierInput {
  tipo_pessoa: "pf" | "pj";
  email: string;
  name: string;
  password?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: SupplierConfig;
  genero: "m" | "f" | "ni";
  ativo: "s" | "n";
}

export interface UpdateSupplierInput {
  tipo_pessoa?: "pf" | "pj";
  email?: string;
  name?: string;
  password?: string;
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: SupplierConfig;
  genero?: "m" | "f" | "ni";
  ativo?: "s" | "n";
}

export interface SuppliersListParams {
  search?: string;
  page?: number;
  per_page?: number;
}
