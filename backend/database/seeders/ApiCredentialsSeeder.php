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
        $slug = 'integracao-lsxmedical';
        $name = 'Integração LSX Medical';
        $url = 'https://clinicahomo.lsxmedical.com/api/clinic';
        $token = 'lStDj16-gHz6d1Uq7lGXnucjC1D9x2NtcjaQ4q98nGXETN5LiNpGb0zkx9HFVBZy';

        $encryptedToken = Crypt::encryptString($token);
        $config = json_encode([
            'url' => $url,
            'user' => '',
            'pass' => $encryptedToken,
        ]);

        $existing = ApiCredential::withoutGlobalScope('notDeleted')
            ->where('post_name', $slug)
            ->first();

        if ($existing) {
            $existing->update([
                'post_title' => $name,
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
