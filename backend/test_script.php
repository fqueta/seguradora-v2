<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Creating tenant...\n";
    $tenant = App\Models\Tenant::create([
        'id' => 'teste2',
        'ativo' => 's',
        'excluido' => 'n',
        'deletado' => 'n',
    ]);
    $tenant->domains()->create(['domain' => 'teste2.localhost']);
    echo "Tenant successfully created: " . $tenant->id . "\n";
} catch (\Exception $e) {
    file_put_contents(__DIR__ . '/error.log', $e->getMessage() . "\n" . $e->getTraceAsString());
    exit(1);
}
