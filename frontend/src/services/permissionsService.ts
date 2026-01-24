import { 
  PermissionRecord, 
  CreatePermissionInput, 
  UpdatePermissionInput, 
  PermissionsListParams, 
  Paginated,
  MenuPermissionRow,
  MenuPermissionUpsert
} from '@/types/permissions';

import { BaseApiService } from './BaseApiService';

class PermissionsService extends BaseApiService {
  constructor() {
    super();
  }

  async listPermissions(params?: PermissionsListParams): Promise<Paginated<PermissionRecord>> {
    // Convert PermissionsListParams to Record<string, any> for buildUrlWithParams
    const queryParams: Record<string, any> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.page) queryParams.page = params.page;
    if (params?.per_page) queryParams.per_page = params.per_page;
    if (params?.excluido) queryParams.excluido = params.excluido;

    const response = await this.get<any>('/permissions', queryParams);
    return this.normalizePaginatedResponse<PermissionRecord>(response);
  }

  async getPermission(id: string): Promise<PermissionRecord> {
    return this.get<PermissionRecord>(`/permissions/${id}`);
  }

  async createPermission(payload: CreatePermissionInput): Promise<PermissionRecord> {
    return this.post<PermissionRecord>('/permissions', payload);
  }

  async updatePermission(id: string, payload: UpdatePermissionInput): Promise<PermissionRecord> {
    return this.put<PermissionRecord>(`/permissions/${id}`, payload);
  }

  async deletePermission(id: string): Promise<void> {
    return this.delete<void>(`/permissions/${id}`);
  }

  async restorePermission(id: string): Promise<void> {
    return this.put<void>(`/permissions/${id}/restore`);
  }

  async forceDeletePermission(id: string): Promise<void> {
    return this.delete<void>(`/permissions/${id}/force`);
  }

  /**
   * Get menu permissions for a specific permission ID
   */
  async getMenuPermissions(permissionId: string): Promise<MenuPermissionRow[]> {
    const response = await this.get<any>(`/permissions/${permissionId}/menu-permissions`);
    return this.flattenMenuPermissions(response);
  }

  /**
   * Recursively flatten nested menu permissions tree into MenuPermissionRow array
   */
  private flattenMenuPermissions(menuItems: any[]): MenuPermissionRow[] {
    const result: MenuPermissionRow[] = [];
    
    const toBool = (value: any): boolean => {
      return value === true || value === 1 || value === '1';
    };

    const processItem = (item: any): void => {
      if (item.menu_id !== undefined) {
        result.push({
          permission_id: '',
          menu_id: item.menu_id,
          parent_id: item.parent_id ?? null,
          can_view: toBool(item.can_view),
          can_create: toBool(item.can_create),
          can_edit: toBool(item.can_edit),
          can_delete: toBool(item.can_delete),
          can_upload: toBool(item.can_upload),
        });
      }

      if (item.items && Array.isArray(item.items)) {
        item.items.forEach(processItem);
      }
    };

    if (Array.isArray(menuItems)) {
      menuItems.forEach(processItem);
    }
    return result;
  }

  /**
   * Update menu permissions for a specific permission
   */
  async updateMenuPermissions(data: MenuPermissionUpsert): Promise<void> {
    return this.put<void>(`/permissions/${data.permission_id}/menu-permissions`, data);
  }
}

export const permissionsService = new PermissionsService();