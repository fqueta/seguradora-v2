export interface Mesa {
  id: string;
  name: string;
  description?: string;
  slug: string;
  token: string;
  active: boolean;
  capacity?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMesaInput {
  name: string;
  description?: string;
  active?: boolean;
  capacity?: number;
}

export interface UpdateMesaInput {
  name?: string;
  description?: string;
  active?: boolean;
  capacity?: number;
}

export interface MesaListParams {
  page?: number;
  per_page?: number;
  order_by?: string;
  order?: 'asc' | 'desc';
  name?: string;
  active?: boolean;
}
