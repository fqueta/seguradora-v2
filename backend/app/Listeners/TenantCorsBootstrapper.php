<?php

namespace App\Listeners;

use App\Services\Qlib;
use Stancl\Tenancy\Events\TenancyInitialized;

class TenantCorsBootstrapper
{
    /**
     * Handle the event: after tenancy is initialized, inject tenant-specific
     * allowed_origins into CORS config using the option 'default_frontend_url'.
     */
    public function handle(TenancyInitialized $event): void
    {
        if (app()->runningInConsole()) {
            return;
        }

        $origins = config('cors.allowed_origins', []);

        // Get tenant-specific frontend URL (fallbacks handled inside qoption)
        try {
            $frontend = Qlib::qoption('default_frontend_url');
            if (is_string($frontend) && !empty($frontend)) {
                if (!in_array($frontend, $origins, true)) {
                    $origins[] = $frontend;
                }
            }
        } catch (\Illuminate\Database\QueryException $e) {
            // Ignore if table doesn't exist (e.g. during migration)
            if (!str_contains($e->getMessage(), 'no such table: options')) {
                throw $e;
            }
        }

        // Ensure same-origin (e.g., localhost dev) remains allowed via patterns
        config(['cors.allowed_origins' => $origins]);
    }
}

