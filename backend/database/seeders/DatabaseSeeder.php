<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Qlib;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);
        if(Qlib::is_crm_aero()){
            $var_cal = [
                    PermissionSeeder::class,
                    OrganizationUserSeeder::class,
                    UserSeeder::class,
                    // escolaridadeSeeder::class,
                    // estadocivilSeeder::class,
                    // ProfissaoSeeder::class,
                    MenuSeeder::class, //cadastra menus permissõs e menu_permissions
                    MenuPermissionSeederAdmin::class,
                    MenuPermissionSeederGerente::class,
                    MenuPermissionSeederConsultor::class,
                    MenuPermissionSeederDiretor::class,
                    MenuPermissionSeederEscritorio::class,
                    MenuPermissionSeederVendedor::class,
                    // MenuPermissionSeeder::class,
                    DashboardMetricsSeeder::class,
                    CategorySeeder::class,
                    FinancialCategoriesSeeder::class,
                    OptionsTableSeeder::class,
                    ProductUnitsSeeder::class,
                    // EnrollmentSituationsSeeder::class,
                    FunnelStageSeeder::class,
                    // AircraftAttendanceSeeder::class,
                    // AeronavesSeeder::class,
                    ApiCredentialsSeeder::class,
                    ApiCredentialsAlloyalSeeder::class,
                    // CursosSeeder::class,
                    // TurmasSeeder::class,
                    // QoptionSeeder::class,
            ];

        }else{
            $var_cal = [
                    PermissionSeeder::class,
                    OrganizationUserSeeder::class,
                    UserSeeder::class,
                    MenuSeeder::class, //cadastra menus permissõs e menu_permissions
                    MenuPermissionSeederAdmin::class,
                    MenuPermissionSeederGerente::class,
                    MenuPermissionSeederConsultor::class,
                    MenuPermissionSeederDiretor::class,
                    MenuPermissionSeederEscritorio::class,
                    MenuPermissionSeederVendedor::class,
                    // DashboardMetricsSeeder::class,
                    CategorySeeder::class,
                    FinancialCategoriesSeeder::class,
                    OptionsTableSeeder::class,
                    ProductUnitsSeeder::class,
                    // EnrollmentSituationsSeeder::class,
                    FunnelStageSeeder::class,
                    // AircraftAttendanceSeeder::class,
                    // AeronavesSeeder::class,
                    // AeronavesSeeder::class,
                    SupplierSeeder::class,
                    SulamericaProductSeeder::class,
                    LsxProductSeeder::class,
                    ApiCredentialsSeeder::class,
                    ApiCredentialsAlloyalSeeder::class,
                    LsxProductsSeeder::class,
            ];

        }
        // Executa TenantSeeder apenas no contexto central (fora do tenant)
        if (!(function_exists('tenant') && tenant())) {
            $var_cal[] = TenantSeeder::class;
        }
        $this->call($var_cal);
    }
}
