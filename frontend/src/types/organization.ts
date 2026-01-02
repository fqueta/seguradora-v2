export interface Organization {
    id: number;
    name: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    active: boolean;
    config?: any;
    created_at?: string;
    updated_at?: string;
    users?: any[];
}

export interface OrganizationCreateInput {
    name: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    active: boolean;
    config?: any;
}

export interface OrganizationUpdateInput extends Partial<OrganizationCreateInput> {}

export interface OrganizationListParams {
    page?: number;
    per_page?: number;
    search?: string;
    active?: boolean;
}
