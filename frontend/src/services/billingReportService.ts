import { BaseApiService } from './BaseApiService';
import type { BillingReportParams, BillingReportData } from '@/types/billingReport';

class BillingReportService extends BaseApiService {
    async generate(params: BillingReportParams): Promise<BillingReportData> {
        return this.post<BillingReportData>('/reports/billing/generate', params);
    }

    async exportExcel(params: BillingReportParams): Promise<BillingReportData> {
        return this.post<BillingReportData>('/reports/billing/export-excel', params);
    }

    async exportPdf(params: BillingReportParams): Promise<BillingReportData> {
        return this.post<BillingReportData>('/reports/billing/export-pdf', params);
    }
}

export const billingReportService = new BillingReportService();
