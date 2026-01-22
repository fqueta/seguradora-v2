<?php

namespace Tests\Unit;

use App\Http\Controllers\api\ClientController;
use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use ReflectionClass;
use Tests\TestCase;

class ClientAutorNameOnIndexMappingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', [
            '--path' => 'database/migrations/tenant',
            '--realpath' => false,
            '--force' => true,
        ]);
    }

    public function test_index_mapping_populates_autor_name_from_uuid_autor(): void
    {
        $autor = User::create([
            'tipo_pessoa' => 'pf',
            'name' => 'Autor Name',
            'status' => 'actived',
            'genero' => 'ni',
            'verificado' => 'n',
            'ativo' => 's',
            'excluido' => 'n',
            'deletado' => 'n',
        ]);

        $client = Client::create([
            'tipo_pessoa' => 'pf',
            'name' => 'Cliente',
            'status' => 'actived',
            'genero' => 'ni',
            'verificado' => 'n',
            'ativo' => 's',
            'excluido' => 'n',
            'deletado' => 'n',
            'token' => 'token-test',
            'autor' => $autor->id,
        ]);

        $reflection = new ReflectionClass(ClientController::class);
        $controller = $reflection->newInstanceWithoutConstructor();
        $method = $reflection->getMethod('mapIndexItemOutput');
        $method->setAccessible(true);

        $mapped = $method->invoke($controller, $client);

        $this->assertSame('Autor Name', $mapped['autor_name']);
    }
}

