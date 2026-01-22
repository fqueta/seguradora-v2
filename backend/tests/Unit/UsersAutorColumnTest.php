<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UsersAutorColumnTest extends TestCase
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

    public function test_autor_persists_uuid_string(): void
    {
        $autor = User::create([
            'tipo_pessoa' => 'pf',
            'name' => 'Autor',
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

        $rawAutor = DB::table('users')->where('id', $client->id)->value('autor');

        $this->assertIsString($rawAutor);
        $this->assertSame($autor->id, $rawAutor);

        $columnType = Schema::getColumnType('users', 'autor');
        $this->assertContains($columnType, ['string', 'text', 'varchar']);
    }
}
