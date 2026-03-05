<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class ExcelImportService
{
    /**
     * Parseia um arquivo Excel (xlsx/xls/csv) e retorna cabeçalhos e linhas associativas.
     * Retorna no máximo $limit linhas para pré-visualização.
     *
     * @param string $path Caminho relativo em storage/app ou caminho absoluto.
     * @param int $limit Quantidade máxima de linhas para leitura.
     * @return array{headers: array, rows: array<int, array>}
     */
    public function parseFile(string $path, int $limit = 200): array
    {
        $fullPath = $this->resolvePath($path);
        $spreadsheet = IOFactory::load($fullPath);
        $sheet = $spreadsheet->getActiveSheet();

        $highestRow = (int) $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);

        // Cabeçalhos na primeira linha
        $headers = [];
        $headerCounts = [];
        for ($col = 1; $col <= $highestColumnIndex; $col++) {
            $rawHeader = (string) $sheet->getCellByColumnAndRow($col, 1)->getValue();
            $normalized = $this->normalizeHeader($rawHeader);
            if (isset($headerCounts[$normalized])) {
                $headerCounts[$normalized]++;
                $normalized .= '_' . $headerCounts[$normalized];
            } else {
                $headerCounts[$normalized] = 1;
            }
            $headers[] = $normalized;
        }

        $rows = [];
        $max = min($highestRow, 1 + $limit);
        for ($row = 2; $row <= $max; $row++) {
            $assoc = [];
            for ($col = 1; $col <= $highestColumnIndex; $col++) {
                $value = $sheet->getCellByColumnAndRow($col, $row)->getValue();
                $headerKey = $headers[$col - 1] ?? 'col_'.$col;
                // Conversão de datas Excel (número serial) para nascimento
                if ($headerKey === 'nascimento' && is_numeric($value)) {
                    try {
                        $dt = Date::excelToDateTimeObject((float)$value);
                        $assoc[$headerKey] = $dt ? $dt->format('Y-m-d') : (string)$value;
                        continue;
                    } catch (\Throwable $e) {
                        // fallback para string
                    }
                }
                // Cast para string para lidar com objetos RichText
                $assoc[$headerKey] = $value !== null ? (string)$value : '';
            }
            // Ignorar linhas completamente vazias
            if ($this->isEmptyRow($assoc)) {
                continue;
            }
            $rows[] = $assoc;
        }

        // Identificar colunas vazias em todas as linhas
        $emptyColumns = array_fill_keys($headers, true);
        foreach ($rows as $row) {
            foreach ($row as $key => $val) {
                if (trim((string)$val) !== '') {
                    $emptyColumns[$key] = false;
                }
            }
        }

        // Filtrar headers e rows removendo colunas vazias
        $filteredHeaders = [];
        foreach ($headers as $h) {
            if (!($emptyColumns[$h] ?? false)) {
                $filteredHeaders[] = $h;
            }
        }

        $filteredRows = [];
        foreach ($rows as $row) {
            $filteredRow = [];
            foreach ($filteredHeaders as $h) {
                $filteredRow[$h] = $row[$h] ?? '';
            }
            $filteredRows[] = $filteredRow;
        }

        return [
            'headers' => $filteredHeaders,
            'rows' => $filteredRows,
        ];
    }

    /**
     * Normaliza nomes de cabeçalhos para facilitar o mapeamento.
     *
     * @param string $header
     * @return string
     */
    protected function normalizeHeader(string $header): string
    {
        $h = trim(mb_strtolower($header));
        $h = str_replace(['  ', "\t"], ' ', $h);
        $map = [
            'nome' => 'name',
            'razao social' => 'razao',
            'cpf' => 'cpf',
            'cpf do paciente' => 'cpf',
            'cpf do titular' => 'cpf',
            'documento titular' => 'cpf',
            'documento do titular' => 'cpf',
            'documento' => 'cpf',
            'cnpj' => 'cnpj',
            'email' => 'email',
            'celular' => 'celular',
            'telefone' => 'celular',
            'whatsapp' => 'whatsapp',
            'nascimento' => 'nascimento',
            'data de nascimento' => 'nascimento',
            'birth_date' => 'nascimento',
            'genero' => 'genero',
            'sexo' => 'genero',
            'cep' => 'cep',
            'endereco' => 'endereco',
            'logradouro' => 'endereco',
            'numero' => 'numero',
            'bairro' => 'bairro',
            'cidade' => 'cidade',
            'municipio' => 'cidade',
            'uf' => 'uf',
            'estado' => 'uf',
            'insurance_plan_code' => 'insurance_plan_code',
            'plan_adherence_date' => 'plan_adherence_date',
            'plan_expiry_date' => 'plan_expiry_date',
            'expiração' => 'data_de_expiracao',
            'data de expiração' => 'data_de_expiracao',
            'sobrenome' => 'sobrenome',
            'status de cadastro' => 'status_cadastro',
            'subdomínio da clínica' => 'subdominio',
            'tipo (dependente ou titular)' => 'tipo',
        ];
        return $map[$h] ?? $h;
    }

    /**
     * Verifica se a linha está vazia (todas as colunas vazias).
     *
     * @param array $assoc
     * @return bool
     */
    protected function isEmptyRow(array $assoc): bool
    {
        foreach ($assoc as $v) {
            if (is_string($v) && trim($v) !== '') {
                return false;
            }
        }
        return true;
    }

    /**
     * Resolve caminho relativo em storage/app para absoluto.
     *
     * @param string $path
     * @return string
     */
    protected function resolvePath(string $path): string
    {
        if (is_file($path)) {
            return $path;
        }
        if (Storage::exists($path)) {
            return Storage::path($path);
        }
        // Tentar dentro de 'imports'
        $candidate = 'imports/' . ltrim($path, '/');
        if (Storage::exists($candidate)) {
            return Storage::path($candidate);
        }
        // Fallback: retorna como absoluto em storage/app
        return storage_path('app/' . ltrim($path, '/'));
    }
}
