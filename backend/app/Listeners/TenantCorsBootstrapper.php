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
        $frontend = Qlib::qoption('default_frontend_url');
        if (is_string($frontend) && !empty($frontend)) {
            if (!in_array($frontend, $origins, true)) {
                $origins[] = $frontend;
            }
        }

        // Ensure same-origin (e.g., localhost dev) remains allowed via patterns
        config(['cors.allowed_origins' => $origins]);
    }
}

