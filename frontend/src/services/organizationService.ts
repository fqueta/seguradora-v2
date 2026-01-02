import { createGenericService } from './GenericApiService';
import { Organization, OrganizationCreateInput, OrganizationUpdateInput } from '@/types/organization';

export const organizationService = createGenericService<Organization, OrganizationCreateInput, OrganizationUpdateInput>('/organizations');
