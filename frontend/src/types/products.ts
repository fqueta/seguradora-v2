/**
 * Tipos relacionados a produtos
 */
export type ProductPlan = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/**
 * Produto base
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  unit?: string;
  image: string;
  rating: number;
  reviews: number;
  availability: 'available' | 'limited' | 'unavailable';
  terms: string[];
  plan?: ProductPlan;
  validUntil?: string;
  costPrice?: number;
  salePrice?: number;
  active?: boolean; // Adicionado para consistência
  stock: number;
  supplier_id?: string;
  supplierData?: { name: string; [key: string]: any };
  supplier_name?: string; // For listing display
}

/**
 * Dados para criar um novo produto
 */
export interface CreateProductInput {
  name: string;
  description?: string;
  category: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  unit: string;
  plan?: ProductPlan;
  active: boolean;
  image?: string;
  rating?: number;
  reviews?: number;
  availability: 'available' | 'limited' | 'unavailable';
  terms: string[];
  validUntil?: string;
  supplier_id?: string;
}

/**
 * Dados para atualizar um produto
 */
export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  unit?: string;
  plan?: ProductPlan;
  active?: boolean;
  image?: string;
  rating?: number;
  reviews?: number;
  availability?: 'available' | 'limited' | 'unavailable';
  terms?: string[];
  validUntil?: string;
  supplier_id?: string;
}

/**
 * Registro de produto (usado em listagens)
 */
export interface ProductRecord extends Product {
  // Campos adicionais que podem vir da API
}

/**
 * Filtros para busca de produtos
 */
export interface ProductFilters {
  search?: string;
  category?: string;
  active?: boolean;
  lowStock?: boolean;
}

/**
 * Categoria de produto
 */
export interface ProductCategory {
  id: string;
  name: string;
}

/**
 * Unidade de medida
 */
export interface ProductUnit {
  value: string;
  label: string;
}

/**
 * Resposta do resgate de produto
 */
export interface ProductRedemptionResponse {
  redemption_id: number;
  product_name: string;
  quantity: number;
  points_used: number;
  remaining_points: number;
  status: string;
  estimated_delivery: string;
}
/**
 * Propriedades do componente PointsStore
 */
export interface PointsStoreProps {
  linkLoja: string;
}
