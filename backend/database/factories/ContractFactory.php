<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\User;
use App\Models\Client;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContractFactory extends Factory
{
    protected $model = Contract::class;

    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-1 year', 'now');
        $endDate = fake()->dateTimeBetween('now', '+1 year');
        
        return [
            'contract_number' => fake()->unique()->numerify('CNT-#####'),
            'client_id' => Client::factory(), // Will create a client if not overridden
            'owner_id' => User::factory(),    // Will create a user (owner) if not overridden
            'product_id' => 1,                // Default, should be overridden or valid
            'organization_id' => 1,           // Default
            'status' => fake()->randomElement(['active', 'pending', 'cancelled', 'approved', 'draft', 'rejected']),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'value' => fake()->randomFloat(2, 100, 10000),
            'description' => fake()->sentence(),
            'created_at' => $startDate,
            'updated_at' => now(),
        ];
    }
}
