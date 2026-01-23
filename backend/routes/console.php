<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\FileStorage;
use App\Models\Tenant;

/**
 * files:normalize-urls
 * pt-BR: Normaliza URLs de arquivos antigos para armazenar apenas caminhos/URLs relativos
 *        em `guid` e `config.file.url`. Útil quando o domínio do sistema muda.
 * en-US: Normalize old file records to store only host-agnostic relative
 *        paths/URLs in `guid` and `config.file.url`. Useful when host changes.
 */
Artisan::command('files:normalize-urls {--dry-run} {--chunk=200} {--limit=0}', function () {
    /**
     * normalizePath
     * pt-BR: Remove host e prefixos como \"/storage\" e \"/tenancy/assets\" de um caminho.
     * en-US: Strip host and prefixes like \"/storage\" and \"/tenancy/assets\" from a path.
     */
    $normalizePath = function (?string $value): ?string {
        if (!$value) return $value;
        $path = parse_url($value, PHP_URL_PATH) ?: $value;
        // Remove prefixos conhecidos
        $path = ltrim($path, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }
        if (str_starts_with($path, 'tenancy/assets/')) {
            $path = substr($path, strlen('tenancy/assets/'));
        }
        return ltrim($path, '/');
    };

    /**
     * buildRelativeUrl
     * pt-BR: Constrói URL relativa padronizada (`/storage/<path>`) a partir do caminho.
     * en-US: Build standardized relative URL (`/storage/<path>`) from given path.
     */
    $buildRelativeUrl = function (?string $path): ?string {
        if (!$path) return $path;
        $clean = ltrim($path, '/');
        return '/storage/' . $clean;
    };

    $dry = (bool) $this->option('dry-run');
    $chunk = (int) ($this->option('chunk') ?? 200);
    $limit = (int) ($this->option('limit') ?? 0);

    $this->info("Normalizando FileStorage URLs (dry-run=" . ($dry ? 'yes' : 'no') . ", chunk={$chunk}, limit={$limit})...");

    $query = FileStorage::where('post_type', 'file_storage')->orderBy('ID');
    if ($limit > 0) {
        $query->limit($limit);
        $items = $query->get();
        $process = function($items) use ($dry, $normalizePath, $buildRelativeUrl) {
            $count = 0; $changed = 0;
            foreach ($items as $item) {
                $count++;
                $config = $item->config ?? [];
                $before = ['guid' => $item->guid, 'url' => $config['file']['url'] ?? null, 'path' => $config['file']['path'] ?? null];

                $path = $normalizePath($config['file']['path'] ?? null);
                // Se não há path, tente derivar do guid/url
                if (!$path) {
                    $guidPath = $normalizePath($item->guid ?? null);
                    $urlPath = $normalizePath($config['file']['url'] ?? null);
                    $path = $guidPath ?: $urlPath ?: null;
                }

                // Atualiza config.file.path
                if ($path) {
                    $config['file']['path'] = $path;
                }
                // Atualiza URLs relativas
                $relative = $buildRelativeUrl($path);
                if ($relative) {
                    $config['file']['url'] = $relative;
                    $item->guid = $relative;
                }

                $after = ['guid' => $item->guid, 'url' => $config['file']['url'] ?? null, 'path' => $config['file']['path'] ?? null];
                $hasDiff = ($before != $after);
                if ($hasDiff) {
                    $changed++;
                    if ($dry) {
                        $this->line("[DRY] ID={$item->ID} guid: '{$before['guid']}' => '{$after['guid']}' | url: '{$before['url']}' => '{$after['url']}' | path: '{$before['path']}' => '{$after['path']}'");
                    } else {
                        $item->config = $config;
                        $item->save();
                        $this->line("[SAVE] ID={$item->ID} guid: '{$before['guid']}' => '{$after['guid']}' | url: '{$before['url']}' => '{$after['url']}' | path: '{$before['path']}' => '{$after['path']}'");
                    }
                }
            }
            return [$count, $changed];
        };

        [$count, $changed] = $process($items);
        $this->info("Processados: {$count}, alterados: {$changed}.");
        return 0;
    }

    $total = 0; $updated = 0;
    FileStorage::where('post_type','file_storage')->orderBy('ID')->chunkById($chunk, function($items) use ($dry, $normalizePath, $buildRelativeUrl, &$total, &$updated) {
        foreach ($items as $item) {
            $total++;
            $config = $item->config ?? [];
            $before = ['guid' => $item->guid, 'url' => $config['file']['url'] ?? null, 'path' => $config['file']['path'] ?? null];

            $path = $normalizePath($config['file']['path'] ?? null);
            if (!$path) {
                $guidPath = $normalizePath($item->guid ?? null);
                $urlPath = $normalizePath($config['file']['url'] ?? null);
                $path = $guidPath ?: $urlPath ?: null;
            }

            if ($path) {
                $config['file']['path'] = $path;
            }
            $relative = $buildRelativeUrl($path);
            if ($relative) {
                $config['file']['url'] = $relative;
                $item->guid = $relative;
            }

            $after = ['guid' => $item->guid, 'url' => $config['file']['url'] ?? null, 'path' => $config['file']['path'] ?? null];
            $hasDiff = ($before != $after);
            if ($hasDiff) {
                $updated++;
                if ($dry) {
                    $this->line("[DRY] ID={$item->ID} guid: '{$before['guid']}' => '{$after['guid']}' | url: '{$before['url']}' => '{$after['url']}' | path: '{$before['path']}' => '{$after['path']}'");
                } else {
                    $item->config = $config;
                    $item->save();
                    $this->line("[SAVE] ID={$item->ID} guid: '{$before['guid']}' => '{$after['guid']}' | url: '{$before['url']}' => '{$after['url']}' | path: '{$before['path']}' => '{$after['path']}'");
                }
            }
        }
    });

    $this->info("Processados: {$total}, alterados: {$updated}.");
    return 0;
})->describe('Normaliza URLs do FileStorage para caminhos relativos (sem host).');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * tenant:create
 * pt-BR: Cria um tenant com ID, nome e domínio informados; gera base MySQL.
 * en-US: Create a tenant with given ID, name and domain; create MySQL database.
 */
Artisan::command('tenant:create {id} {--name=} {--domain=}', function () {
    /**
     * handle
     * pt-BR: Fluxo: cria registro do tenant, cria base de dados e associa domínio.
     * en-US: Flow: create tenant record, create database and attach domain.
     */
    $id = (string) $this->argument('id');
    $name = (string) ($this->option('name') ?? $id);
    $domain = (string) ($this->option('domain') ?? ($id . '.localhost'));

    try {
        // Cria o registro do tenant com slug em data
        $tenant = Tenant::create([
            'id' => $id,
            'name' => $name,
            'data' => ['slug' => $id],
        ]);

        // Cria a base MySQL do tenant (prefixo definido em tenancy.php)
        $tenant->createDatabase();

        // Adiciona o domínio
        $tenant->domains()->create([
            'domain' => $domain,
        ]);

        $this->info("Tenant '{$id}' criado com sucesso.");
        $this->line("- Nome: {$name}");
        $this->line("- Domínio: {$domain}");
        $this->line("- Database: prefixo conforme config (ex.: yellow_{$id})");
        return 0;
    } catch (\Throwable $e) {
        $this->error("Falha ao criar tenant '{$id}': " . $e->getMessage());
        return 1;
    }
})->describe('Cria um tenant com base de dados e domínio.');

/**
 * tenant:attach-domain
 * pt-BR: Anexa um domínio ao tenant informado (id existente).
 * en-US: Attach a domain to the given tenant (existing id).
 */
Artisan::command('tenant:attach-domain {id} {domain}', function () {
    /**
     * handle
     * pt-BR: Busca o tenant por ID e cria/garante o domínio associado.
     * en-US: Find tenant by ID and create/ensure attached domain.
     */
    $id = (string) $this->argument('id');
    $domain = (string) $this->argument('domain');
    $tenant = Tenant::find($id);
    if (!$tenant) {
        $this->error("Tenant '{$id}' não encontrado.");
        return 1;
    }
    $tenant->domains()->firstOrCreate(['domain' => $domain]);
    $this->info("Domínio '{$domain}' anexado ao tenant '{$id}'.");
    return 0;
})->describe('Anexa um domínio a um tenant existente.');
