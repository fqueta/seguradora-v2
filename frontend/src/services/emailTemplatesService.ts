import { BaseApiService } from './BaseApiService';
import { PaginatedResponse } from '@/types/index';

export interface EmailTemplate {
  ID?: number;
  post_title: string; // Subject
  post_content: string; // Body
  post_name: string; // Slug
  post_status: 'publish' | 'draft';
  post_type: 'email_template';
  config?: any;
  organization_id?: number | string | null;
  organization?: { name: string };
  created_at?: string;
  updated_at?: string;
}

/**
 * EmailTemplatesService
 * pt-BR: Serviço para gerenciamento de templates de e-mail (armazenados como posts).
 * en-US: Service for managing email templates (stored as posts).
 */
class EmailTemplatesService extends BaseApiService {
  /**
   * list
   * pt-BR: Lista todos os templates de e-mail.
   * en-US: Lists all email templates.
   */
  async list(params?: any): Promise<PaginatedResponse<EmailTemplate>> {
    const response = await this.get<any>('/posts', { ...params, post_type: 'email_template' });
    return this.normalizePaginatedResponse<EmailTemplate>(response);
  }

  /**
   * getById
   * pt-BR: Obtém um template pelo ID.
   * en-US: Gets a template by ID.
   */
  async getById(id: string | number): Promise<EmailTemplate> {
    const response = await this.get<any>(`/posts/${id}`);
    return response.data ?? response;
  }

  /**
   * create
   * pt-BR: Cria um novo template de e-mail.
   * en-US: Creates a new email template.
   */
  async create(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await this.post<any>('/posts', { ...data, post_type: 'email_template' });
    return response.data ?? response;
  }

  /**
   * update
   * pt-BR: Atualiza um template de e-mail existente.
   * en-US: Updates an existing email template.
   */
  async update(id: string | number, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await this.put<any>(`/posts/${id}`, { ...data, post_type: 'email_template' });
    return response.data ?? response;
  }

  /**
   * deleteById
   * pt-BR: Exclui um template de e-mail.
   * en-US: Deletes an email template.
   */
  async deleteById(id: string | number): Promise<void> {
    await this.delete(`/posts/${id}`);
  }

  /**
   * listTrash
   * pt-BR: Lista templates na lixeira.
   * en-US: Lists trashed email templates.
   */
  async listTrash(params?: any): Promise<PaginatedResponse<EmailTemplate>> {
    const response = await this.get<any>('/posts/trash', { ...params, post_type: 'email_template' });
    return this.normalizePaginatedResponse<EmailTemplate>(response);
  }

  /**
   * restore
   * pt-BR: Restaura um template da lixeira.
   * en-US: Restores a template from trash.
   */
  async restore(id: string | number): Promise<void> {
    await this.put(`/posts/${id}/restore`, {});
  }

  /**
   * forceDelete
   * pt-BR: Exclui permanentemente um template.
   * en-US: Permanently deletes a template.
   */
  async forceDelete(id: string | number): Promise<void> {
    await this.delete(`/posts/${id}/force`);
  }

  /**
   * getShortcodes
   * pt-BR: Obtém os shortcodes disponíveis para um contexto.
   * en-US: Gets available shortcodes for a context.
   */
  async getShortcodes(context: string = 'contract'): Promise<Record<string, string>> {
     const response = await this.get<any>(`/email-templates/shortcodes/${context}`);
     return response.data ?? response;
   }
  /**
   * sendTest
   * pt-BR: Envia um e-mail de teste para o endereço fornecido.
   * en-US: Sends a test email to the provided address.
   */
  async sendTest(email: string, title: string, content: string, context: string = 'contract', config?: Record<string, any>): Promise<void> {
    await this.post('/email-templates/test', {
      email,
      post_title: title,
      post_content: content,
      context,
      config: config || undefined,
    });
  }
}

export const emailTemplatesService = new EmailTemplatesService();
