<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use App\Helpers\StringHelper;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton('escola', function () {
            return new \App\Services\Escola();
        });
        $this->app->singleton('qlib', function () {
            return new \App\Services\Qlib();
        });
        $this->commands([
            \App\Console\Commands\ImportSqliteBackup::class,
        ]);
        // $this->app->singleton(StringHelper::class, function () {
        //     return new StringHelper();
        // });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Inertia::share('nav', [
            ['label' => 'Dashboard', 'href' => '/dashboard'],
            ['label' => 'Usuários', 'href' => '/users'],
            ['label' => 'Configurações', 'href' => '/settings'],
        ]);

        // Define custom rate limiters for public endpoints
        // pt-BR: Limitadores por IP para endpoints públicos de matrícula e interesse
        // en-US: IP-based rate limiters for public enrollment and interest endpoints
        RateLimiter::for('public-enroll-ip', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('public-interest-ip', function (Request $request) {
            return Limit::perMinute(40)->by($request->ip());
        });

        RateLimiter::for('public-form-token-ip', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Register custom validation rule for 'celular' (Brazilian mobile phone format)
        // Accepts: (XX) 9XXXX-XXXX or (XX) 9XXXXXXXX (11 digits, starts with 9 in 3rd digit)
        // Ignoring sanitization here, this validates the structure.
        \Illuminate\Support\Facades\Validator::extend('celular', function ($attribute, $value, $parameters, $validator) {
            // Remove non-digits
            $digits = preg_replace('/\D/', '', $value);
            $len = strlen($digits);

            // Case 1: Brazil DDI (55) + 11 digits = 13 digits
            // Structure: 55 (DD) 9XXXX-XXXX
            // Index 4 must be 9
            if ($len === 13 && str_starts_with($digits, '55')) {
                return (int)$digits[4] === 9;
            }

            // Case 2: National format (no DDI) = 11 digits
            // Structure: (DD) 9XXXX-XXXX
            // Index 2 must be 9
            if ($len === 11) {
                return (int)$digits[2] === 9;
            }

            // Case 3: Other international numbers (DDI != 55)
            // Allow if length is reasonable (e.g., 8-15 digits) to support other countries if needed
            // But if it starts with 55, it failed the length check above (e.g. 55 + landline)
            if (!str_starts_with($digits, '55') && $len >= 8 && $len <= 15) {
                return true;
            }

            return false;
        }, 'O campo :attribute deve ser um celular válido no formato (XX) 9XXXX-XXXX.');
    }
}
