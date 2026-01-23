<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Tenancy;
use App\Models\Tenant;

class ImportSqliteBackup extends Command
{
    /**
     * Handle
     * pt-BR: Importa dados das tabelas principais (users, contracts, contract_events, contract_meta)
     *        de uma fonte SQLite (sqlite_backup) para o banco MySQL do tenant informado.
     * en-US: Imports core tables (users, contracts, contract_events, contract_meta)
     *        from SQLite source (sqlite_backup) into target tenant's MySQL database.
     */
    protected $signature = 'import:sqlite 
        {--tenant=api-yellow : Tenant ID to import into}
        {--chunk=500 : Chunk size}
        {--dry-run : Only show counts without writing}
        {--truncate : Truncate target tables before import}';

    protected $description = 'Import core tables from sqlite_backup into tenant MySQL';

    public function handle(): int
    {
        $tenantId = (string) $this->option('tenant');
        $chunk = (int) $this->option('chunk');
        $dry = (bool) $this->option('dry-run');
        $truncate = (bool) $this->option('truncate');

        $this->info("Import from sqlite_backup → tenant '{$tenantId}' (chunk={$chunk}, dry-run=" . ($dry ? 'yes' : 'no') . ", truncate=" . ($truncate ? 'yes' : 'no') . ")");

        /** Initialize tenant context */
        /** @var Tenancy $tenancy */
        $tenancy = app(Tenancy::class);
        $tenant = Tenant::find($tenantId);
        if (!$tenant) {
            $this->error("Tenant '{$tenantId}' not found.");
            return 1;
        }
        $tenancy->initialize($tenant);

        $src = DB::connection('sqlite_backup');
        $dst = DB::connection('tenant');

        /** Optionally truncate destination tables in order */
        if ($truncate && !$dry) {
            $this->warn('Truncating destination tables (order: contract_events, contract_meta, contracts, users)...');
            $dst->statement('SET FOREIGN_KEY_CHECKS=0');
            foreach (['contract_events', 'contract_meta', 'contracts', 'users'] as $t) {
                try { $dst->table($t)->truncate(); } catch (\Throwable $e) { /* ignore */ }
            }
            $dst->statement('SET FOREIGN_KEY_CHECKS=1');
        }

        /** Import in FK-safe order */
        $importers = [
            'users' => function () use ($src, $dst, $chunk, $dry) {
                $count = 0;
                $src->table('users')->orderBy('id')->chunk($chunk, function ($rows) use (&$count, $dst, $dry) {
                    foreach ($rows as $r) {
                        $count++;
                        $data = (array) $r;
                        /** Sanitize enums/arrays */
                        $data['config'] = isset($data['config']) ? $this->toJsonArray($data['config']) : [];
                        $data['client_permission'] = isset($data['client_permission']) ? $this->toJsonArray($data['client_permission']) : [];
                        $data['preferencias'] = isset($data['preferencias']) ? $this->toJsonArray($data['preferencias']) : [];
                        /** organization_id may not exist → set null */
                        if (!isset($data['organization_id'])) $data['organization_id'] = null;
                        /** permission_id fallback null */
                        if (!isset($data['permission_id'])) $data['permission_id'] = null;
                        if ($dry) continue;
                        $dst->table('users')->updateOrInsert(['id' => $data['id'] ?? null], $this->filterColumns($dst, 'users', $data));
                    }
                });
                $this->info("users: {$count} rows processed");
            },
            'contracts' => function () use ($src, $dst, $chunk, $dry) {
                $count = 0;
                $src->table('contracts')->orderBy('id')->chunk($chunk, function ($rows) use (&$count, $dst, $dry) {
                    foreach ($rows as $r) {
                        $count++;
                        $data = (array) $r;
                        /** JSON cast */
                        $data['address'] = isset($data['address']) ? $this->toJsonArray($data['address']) : [];
                        /** FK: client_id/owner_id must exist in users or be null */
                        foreach (['client_id','owner_id'] as $fk) {
                            if (isset($data[$fk]) && !$this->exists($dst, 'users', ['id' => $data[$fk]])) {
                                $data[$fk] = null;
                            }
                        }
                        if ($dry) continue;
                        $dst->table('contracts')->updateOrInsert(['id' => $data['id'] ?? null], $this->filterColumns($dst, 'contracts', $data));
                    }
                });
                $this->info("contracts: {$count} rows processed");
            },
            'contract_events' => function () use ($src, $dst, $chunk, $dry) {
                $count = 0;
                $src->table('contract_events')->orderBy('id')->chunk($chunk, function ($rows) use (&$count, $dst, $dry) {
                    foreach ($rows as $r) {
                        $count++;
                        $data = (array) $r;
                        $data['metadata'] = isset($data['metadata']) ? $this->toJsonArray($data['metadata']) : [];
                        /** FK: contract_id & user_id */
                        if (isset($data['contract_id']) && !$this->exists($dst, 'contracts', ['id' => $data['contract_id']])) {
                            continue; /** skip orphan */
                        }
                        if (isset($data['user_id']) && !$this->exists($dst, 'users', ['id' => $data['user_id']])) {
                            $data['user_id'] = null;
                        }
                        if ($dry) continue;
                        $dst->table('contract_events')->updateOrInsert(['id' => $data['id'] ?? null], $this->filterColumns($dst, 'contract_events', $data));
                    }
                });
                $this->info("contract_events: {$count} rows processed");
            },
            'contract_meta' => function () use ($src, $dst, $chunk, $dry) {
                $count = 0;
                $src->table('contract_meta')->orderBy('id')->chunk($chunk, function ($rows) use (&$count, $dst, $dry) {
                    foreach ($rows as $r) {
                        $count++;
                        $data = (array) $r;
                        /** FK: contract_id */
                        if (isset($data['contract_id']) && !$this->exists($dst, 'contracts', ['id' => $data['contract_id']])) {
                            continue; /** skip orphan */
                        }
                        if ($dry) continue;
                        $dst->table('contract_meta')->updateOrInsert(['id' => $data['id'] ?? null], $this->filterColumns($dst, 'contract_meta', $data));
                    }
                });
                $this->info("contract_meta: {$count} rows processed");
            },
        ];

        /** Execute importers */
        foreach (['users','contracts','contract_events','contract_meta'] as $t) {
            $this->line("→ importing {$t}...");
            try {
                $dst->statement('SET FOREIGN_KEY_CHECKS=0');
                $importers[$t]();
            } finally {
                $dst->statement('SET FOREIGN_KEY_CHECKS=1');
            }
        }

        $this->info('Import completed.');
        return 0;
    }

    /** Helpers */
    private function exists($conn, string $table, array $where): bool
    {
        return $conn->table($table)->where($where)->exists();
    }

    private function toJsonArray($value): array
    {
        if (is_array($value)) return $value;
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    private function filterColumns($conn, string $table, array $data): array
    {
        $columns = $conn->getSchemaBuilder()->getColumnListing($table);
        $filtered = array_filter($data, fn($k) => in_array($k, $columns), ARRAY_FILTER_USE_KEY);
        /** Encode arrays to JSON for known JSON columns */
        $jsonCols = [
            'users' => ['config','preferencias','client_permission'],
            'contracts' => ['address'],
            'contract_events' => ['metadata','payload'],
            'contract_meta' => ['meta_value'],
        ];
        $targets = $jsonCols[$table] ?? [];
        foreach ($targets as $col) {
            if (array_key_exists($col, $filtered) && is_array($filtered[$col])) {
                $filtered[$col] = json_encode($filtered[$col], JSON_UNESCAPED_UNICODE);
            }
        }
        return $filtered;
    }
}
