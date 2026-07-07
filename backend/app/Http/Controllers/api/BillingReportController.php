<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\BillingReportService;

class BillingReportController extends Controller
{
    protected $billingReportService;

    public function __construct(BillingReportService $billingReportService)
    {
        $this->billingReportService = $billingReportService;
    }

    /**
     * Gera o relatório de cobrança mensal para uma organização e produto.
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'organization_id' => 'required|integer|exists:organizations,id',
            'product_id' => 'required|string',
            'reference_month' => 'required|integer|min:1|max:12',
            'reference_year' => 'required|integer|min:2020|max:2050',
        ]);

        $data = $this->billingReportService->generate(
            (int) $validated['organization_id'],
            $validated['product_id'],
            (int) $validated['reference_month'],
            (int) $validated['reference_year']
        );

        return response()->json($data);
    }

    /**
     * Exportação para Excel (retorna o JSON dos dados do relatório).
     * O frontend cuidará da montagem da planilha.
     */
    public function exportExcel(Request $request)
    {
        return $this->generate($request);
    }

    /**
     * Exportação para PDF (retorna o JSON dos dados do relatório).
     * O frontend cuidará da montagem do PDF.
     */
    public function exportPdf(Request $request)
    {
        return $this->generate($request);
    }
}
