<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Contract;
use App\Models\Product;
use Carbon\Carbon;

class BillingReportService
{
    public function generate(int $organizationId, string $productId, int $referenceMonth, int $referenceYear)
    {
        $organization = Organization::findOrFail($organizationId);
        $config = $organization->config ?? [];
        
        // Obter dia de início do ciclo (padrão 1)
        $cycleStartDay = isset($config['billing']['cycle_start_day']) ? (int) $config['billing']['cycle_start_day'] : 1;

        // Calcular período do ciclo
        if ($cycleStartDay === 1) {
            $cycleStart = Carbon::create($referenceYear, $referenceMonth, 1)->startOfDay();
            $cycleEnd = Carbon::create($referenceYear, $referenceMonth, 1)->endOfMonth()->endOfDay();
        } else {
            $cycleEnd = Carbon::create($referenceYear, $referenceMonth, $cycleStartDay)->subDay()->endOfDay();
            $cycleStart = Carbon::create($referenceYear, $referenceMonth, $cycleStartDay)->subMonth()->startOfDay();
        }

        // Zerar horas para cálculo exato de dias inteiros
        $cStart = Carbon::parse($cycleStart->toDateString())->startOfDay();
        $cEnd = Carbon::parse($cycleEnd->toDateString())->startOfDay();
        $cycleDays = (int) $cStart->diffInDays($cEnd) + 1;

        // Buscar contratos aprovados da organização
        $query = Contract::where('organization_id', $organizationId)
            ->where('status', 'approved');

        // Se produto for específico, filtra. Se for 'all', busca todos.
        if ($productId !== 'all' && !empty($productId)) {
            $query->where('product_id', $productId);
        }

        $contracts = $query->with([
            'client' => function ($q) {
                $q->select('id', 'name', 'cpf', 'cnpj');
            },
            'product' => function ($q) {
                // posts table maps: ID -> id, post_title -> name
                $q->select('ID', 'post_title');
            }
        ])->get();

        $lines = [];
        $totalLives = 0;
        $livesWithBilling = 0;
        $livesOutsideCycle = 0;
        $totalToCharge = 0.0;

        // Mapeamento de precificação configurada na organização
        $pricingMap = [];
        if (isset($config['billing']['products_pricing'])) {
            foreach ($config['billing']['products_pricing'] as $pricing) {
                $pricingMap[(string) $pricing['product_id']] = (float) $pricing['monthly_value_per_life'];
            }
        }

        foreach ($contracts as $contract) {
            $client = $contract->client;
            if (!$client) {
                continue;
            }

            $totalLives++;

            // Descobrir valor mensal do produto para este contrato
            $contractProductId = (string) $contract->product_id;
            $monthlyValue = 0.0;

            if (isset($pricingMap[$contractProductId])) {
                $monthlyValue = $pricingMap[$contractProductId];
            } else {
                // Tenta do cadastro de produto se não estiver na organização
                $product = $contract->product;
                if ($product) {
                    $monthlyValue = (float) ($product->sale_price ?? $product->post_value2 ?? 0.0);
                }
            }

            $startDate = Carbon::parse($contract->start_date)->startOfDay();
            $endDate = $contract->end_date ? Carbon::parse($contract->end_date)->endOfDay() : null;

            // Verificar se a vigência do contrato coincide com o ciclo
            $hasCoverage = true;
            if ($startDate->gt($cycleEnd)) {
                $hasCoverage = false;
            }
            if ($endDate && $endDate->lt($cycleStart)) {
                $hasCoverage = false;
            }

            $productName = $contract->product->post_title ?? $contract->product->name ?? 'Produto';

            if (!$hasCoverage) {
                $livesOutsideCycle++;
                $lines[] = [
                    'name' => $client->name,
                    'cpf' => $client->cpf ?? $client->cnpj ?? '',
                    'product_name' => $productName,
                    'validity_start' => $startDate->toDateString(),
                    'cycle_start' => $cycleStart->toDateString(),
                    'cycle_end' => $cycleEnd->toDateString(),
                    'calculated_start' => null,
                    'calculated_end' => null,
                    'cycle_days' => $cycleDays,
                    'covered_days' => 0,
                    'monthly_value' => $monthlyValue,
                    'charged_value' => 0.0,
                    'observation' => 'Fora do ciclo de vigência',
                ];
                continue;
            }

            // Calcular vigência apurada dentro do ciclo
            $calculatedStart = $startDate->gt($cycleStart) ? $startDate : $cycleStart;
            $calculatedEnd = ($endDate && $endDate->lt($cycleEnd)) ? $endDate : $cycleEnd;

            // Zerar horas para cálculo exato de dias inteiros
            $calcStart = Carbon::parse($calculatedStart->toDateString())->startOfDay();
            $calcEnd = Carbon::parse($calculatedEnd->toDateString())->startOfDay();
            $coveredDays = (int) $calcStart->diffInDays($calcEnd) + 1;
            
            // Valor cobrado proporcional
            $chargedValue = ($coveredDays / $cycleDays) * $monthlyValue;
            $chargedValue = round($chargedValue, 2);

            $totalToCharge += $chargedValue;
            $livesWithBilling++;

            $isProportional = $coveredDays < $cycleDays;
            $observation = $isProportional 
                ? "Proporcional aos dias cobertos no ciclo ({$coveredDays} dias de {$cycleDays})"
                : 'Ciclo completo';

            $lines[] = [
                'name' => $client->name,
                'cpf' => $client->cpf ?? $client->cnpj ?? '',
                'product_name' => $productName,
                'validity_start' => $startDate->toDateString(),
                'cycle_start' => $cycleStart->toDateString(),
                'cycle_end' => $cycleEnd->toDateString(),
                'calculated_start' => $calculatedStart->toDateString(),
                'calculated_end' => $calculatedEnd->toDateString(),
                'cycle_days' => $cycleDays,
                'covered_days' => $coveredDays,
                'monthly_value' => $monthlyValue,
                'charged_value' => $chargedValue,
                'observation' => $observation,
            ];
        }

        // Ordenar linhas por nome do cliente
        usort($lines, function ($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });

        // Configurar nome do produto no header
        $headerProductName = 'Todos os Produtos';
        $headerMonthlyValue = 0.0;
        
        if ($productId !== 'all' && !empty($productId)) {
            $product = Product::find($productId);
            if ($product) {
                $headerProductName = $product->name ?? $product->post_title ?? 'Produto';
            }
            if (isset($pricingMap[(string) $productId])) {
                $headerMonthlyValue = $pricingMap[(string) $productId];
            }
        }

        $calculationBasis = $productId !== 'all' && !empty($productId)
            ? sprintf('Proporcional aos dias cobertos no ciclo, considerando R$ %s por mês/vida ativa.', number_format($headerMonthlyValue, 2, ',', '.'))
            : 'Proporcional aos dias cobertos no ciclo, calculado individualmente por produto contratado.';

        return [
            'header' => [
                'organization_name' => $organization->name,
                'product_name' => $headerProductName,
                'monthly_value_per_life' => $headerMonthlyValue,
                'cycle_start' => $cycleStart->toDateString(),
                'cycle_end' => $cycleEnd->toDateString(),
                'cycle_days' => $cycleDays,
                'total_lives' => $totalLives,
                'lives_with_billing' => $livesWithBilling,
                'lives_outside_cycle' => $livesOutsideCycle,
                'total_to_charge' => round($totalToCharge, 2),
                'calculation_basis' => $calculationBasis,
            ],
            'lines' => $lines,
        ];
    }
}
