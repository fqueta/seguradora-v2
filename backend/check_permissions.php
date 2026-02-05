<?php
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$perms = DB::table('permissions')->get();
foreach ($perms as $p) {
    echo "ID: " . $p->id . " - Name: " . $p->name . "\n";
}
