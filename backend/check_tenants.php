<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Checking Tenant 'yellow'...\n";
    $tenant = App\Models\Tenant::find('yellow');
    if (!$tenant) {
        echo "Tenant 'yellow' NOT found.\n";
    } else {
        echo "Tenant 'yellow' FOUND.\n";
        echo "ID: " . $tenant->id . "\n";
        echo "Active: " . $tenant->ativo . "\n";
        
        echo "Domains:\n";
        foreach ($tenant->domains as $domain) {
            echo " - " . $domain->domain . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
