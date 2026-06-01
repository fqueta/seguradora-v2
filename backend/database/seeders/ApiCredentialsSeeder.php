<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use App\Models\ApiCredential;

class ApiCredentialsSeeder extends Seeder
{
    public function run(): void
    {
        $slug = 'integracao-lsx-medical';
        $legacySlug = 'integracao-lsxmedical';
        $name = 'Integração LSX Medical';
        $url = 'https://clinicahomo.lsxmedical.com/api/clinic';
        $token = 'lStDj16-gHz6d1Uq7lGXnucjC1D9x2NtcjaQ4q98nGXETN5LiNpGb0zkx9HFVBZy';

        $encryptedToken = Crypt::encryptString($token);
        $config = json_encode([
            'url' => $url,
            'user' => '',
            'pass' => $encryptedToken,
        ]);

        $slugNormalized = Str::slug($slug);
        $legacySlugNormalized = Str::slug($legacySlug);

        $existing = ApiCredential::withoutGlobalScope('notDeleted')
            ->whereIn('post_name', [$slugNormalized, $legacySlugNormalized])
            ->first();

        if ($existing) {
            $existing->update([
                'post_title' => $name,
                'post_name' => $slugNormalized,
                'post_status' => 'publish',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'config' => $config,
            ]);
        } else {
            ApiCredential::create([
                'post_title' => $name,
                'post_name' => Str::slug($slug),
                'post_status' => 'publish',
                'post_author' => '1',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'token' => \App\Services\Qlib::token(),
                'config' => $config,
            ]);
        }

        $slugV2 = 'integracao-lsx-medical-v2';
        $nameV2 = 'Integração LSX Medical (Nova API)';
        $urlV2 = 'https://gateway.meditele.com.br';
        $tokenV2 = '';
        $clinicIdV2 = '';

        $encryptedTokenV2 = Crypt::encryptString($tokenV2);
        $configV2 = json_encode([
            'url' => $urlV2,
            'user' => '',
            'pass' => $encryptedTokenV2,
            'clinicId' => $clinicIdV2,
        ]);

        $existingV2 = ApiCredential::withoutGlobalScope('notDeleted')
            ->where('post_name', Str::slug($slugV2))
            ->first();

        if ($existingV2) {
            $existingV2->update([
                'post_title' => $nameV2,
                'post_name' => Str::slug($slugV2),
                'post_status' => 'draft',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'config' => $configV2,
            ]);
            $postIdV2 = $existingV2->ID ?? $existingV2->id;
        } else {
            $createdV2 = ApiCredential::create([
                'post_title' => $nameV2,
                'post_name' => Str::slug($slugV2),
                'post_status' => 'draft',
                'post_author' => '1',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'token' => \App\Services\Qlib::token(),
                'config' => $configV2,
            ]);
            $postIdV2 = $createdV2->ID ?? $createdV2->id;
        }
        \App\Services\Qlib::update_postmeta($postIdV2, 'clinicId', $clinicIdV2);
        \App\Services\Qlib::update_postmeta($postIdV2, 'clinic_id', $clinicIdV2);

        $slug2 = 'integracao-alloyal';
        $name2 = 'Integração Alloyal';
        $url2 = 'https://api.lecupon.com';
        $config2 = json_encode([
            'url' => $url2,
            'user' => '',
            'pass' => '',
        ]);
        $existing2 = ApiCredential::withoutGlobalScope('notDeleted')
            ->where('post_name', $slug2)
            ->first();
        if ($existing2) {
            $existing2->update([
                'post_title' => $name2,
                'post_status' => 'draft',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'config' => $config2,
            ]);
            $postId = $existing2->ID ?? $existing2->id;
        } else {
            $created2 = ApiCredential::create([
                'post_title' => $name2,
                'post_name' => Str::slug($slug2),
                'post_status' => 'draft',
                'post_author' => '1',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'token' => \App\Services\Qlib::token(),
                'config' => $config2,
            ]);
            $postId = $created2->ID ?? $created2->id;
        }
        \App\Services\Qlib::update_postmeta($postId, 'business_id', '2676');
    }
}
