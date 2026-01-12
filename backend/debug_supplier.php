<?php
$tenant = App\Models\Tenant::first();
if ($tenant) {
    tenancy()->initialize($tenant);
    
    // Check Supplier UUID
    $supplier = App\Models\User::where('name', 'like', 'Sul América%')->first();
    echo "Supplier ID: " . ($supplier ? $supplier->id : 'NOT FOUND') . "\n";
    
    // Check Products
    $products = App\Models\Product::whereBetween('ID', [3, 11])->get();
    foreach ($products as $p) {
        echo "Product ID: {$p->ID} | Author: {$p->post_author} | Supplier Config: " . ($p->config['supplier_id'] ?? 'NULL') . "\n";
    }
}
