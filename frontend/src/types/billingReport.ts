export interface BillingReportParams {
    organization_id: number;
    product_id: string;
    reference_month: number;
    reference_year: number;
}

export interface BillingReportHeader {
    organization_name: string;
    product_name: string;
    monthly_value_per_life: number;
    cycle_start: string;
    cycle_end: string;
    cycle_days: number;
    total_lives: number;
    lives_with_billing: number;
    lives_outside_cycle: number;
    total_to_charge: number;
    calculation_basis: string;
}

export interface BillingReportLine {
    name: string;
    cpf: string;
    product_name: string;
    validity_start: string;
    cycle_start: string;
    cycle_end: string;
    calculated_start: string | null;
    calculated_end: string | null;
    cycle_days: number;
    covered_days: number;
    monthly_value: number;
    charged_value: number;
    observation: string;
}

export interface BillingReportData {
    header: BillingReportHeader;
    lines: BillingReportLine[];
}
