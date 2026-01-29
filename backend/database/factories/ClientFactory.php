<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        $tipoPessoa = fake()->randomElement(['pf', 'pj']);
        
        $uniqueSuffix = Str::random(8); // Add random suffix to ensure uniqueness against existing DB records
        return [
            'name' => fake()->name(),
            'email' => fake()->userName() . '.' . $uniqueSuffix . '@example.com',
            'password' => Hash::make('password'), // password
            'tipo_pessoa' => $tipoPessoa,
            'cpf' => $tipoPessoa === 'pf' ? fake()->cpf(false) : null,
            'cnpj' => $tipoPessoa === 'pj' ? fake()->cnpj(false) : null,
            'razao' => $tipoPessoa === 'pj' ? fake()->company() : null,
            'status' => 'actived',
            'permission_id' => 10,
            'client_permission' => [10],
            'organization_id' => 1,
            'config' => [],
            'remember_token' => Str::random(10),
            'email_verified_at' => now(),
            'created_at' => fake()->dateTimeBetween('-1 year', 'now'),
            'updated_at' => now(),
        ];
    }
}
