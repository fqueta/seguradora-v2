<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MesasSeeder extends Seeder
{
    public function run(): void
    {
        $postType = 'mesas';

        $items = [];
        for ($i = 1; $i <= 10; $i++) {
            $nome = 'Mesa ' . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
            $slug = 'mesa-' . str_pad((string)$i, 2, '0', STR_PAD_LEFT);
            $items[] = [
                'post_title' => $nome,
                'post_name'  => $slug,
                'capacity'   => $i <= 4 ? 4 : 6,
            ];
        }

        $postNames = array_column($items, 'post_name');

        DB::table('posts')
            ->where('post_type', $postType)
            ->whereNotIn('post_name', $postNames)
            ->delete();

        foreach ($items as $item) {
            DB::table('posts')->updateOrInsert(
                [
                    'post_name' => $item['post_name'],
                    'post_type' => $postType,
                ],
                [
                    'post_title'      => $item['post_title'],
                    'post_status'     => 'publish',
                    'comment_status'  => 'closed',
                    'ping_status'     => 'closed',
                    'config'          => json_encode(['capacity' => $item['capacity']]),
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]
            );
        }
    }
}
