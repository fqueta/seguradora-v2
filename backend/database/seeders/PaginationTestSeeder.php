<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use App\Models\Contract;
use App\Models\Product;
use App\Models\User;
use App\Models\Organization;

class PaginationTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure there is an organization
        $org = Organization::first();
        if (!$org) {
            $org = Organization::create(['name' => 'Default Organization', 'active' => true]);
        }

        // 2. Ensure there is a product
        $product = Product::first();
        if (!$product) {
            $product = Product::create([
                'post_title' => 'Seguro de Vida - Padrão',
                'post_content' => 'Cobertura completa para vida.',
                'post_status' => 'publish',
                'post_type' => 'products',
                'post_author' => 1,
            ]);
        }

        // 3. Ensure there is an owner (User)
        $owner = User::first();
        if (!$owner) {
            $owner = User::factory()->create();
        }

        // 4. Create Clients and Contracts
        $this->command->info('Creating 300 Clients and their Contracts...');
        
        Client::factory(300)->create([
            'organization_id' => $org->id,
            'autor' => $owner->id,
        ])->each(function ($client) use ($owner, $product, $org) {
            
            // For each client, create 1 to 3 contracts
            $numContracts = rand(1, 3);
            
            Contract::factory($numContracts)->create([
                'client_id' => $client->id,
                'owner_id' => $owner->id,
                'product_id' => $product->ID, // Product uses 'ID' as primary key
                'organization_id' => $org->id,
            ]);
        });

        $this->command->info('Pagination Test Data Created Successfully!');
    }
}
