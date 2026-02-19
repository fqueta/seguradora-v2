<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserEvent;
use Illuminate\Support\Facades\Request;

class UserEventLogger
{
    /**
     * Registra um evento genérico para um usuário.
     *
     * @param User|string $user Usuário alvo ou seu ID.
     * @param string $type Tipo do evento (ex: login, user_updated, password_change).
     * @param string|null $description Descrição legível.
     * @param array $from Dados anteriores.
     * @param array $to Novos dados.
     * @param array $metadata Metadados extras (IP, User Agent, etc).
     * @param string|array|null $payload Payload bruto se necessário.
     * @param string|null $authorId ID do usuário que realizou a ação.
     * @return UserEvent
     */
    public static function log(
        User|string $user,
        string $type,
        ?string $description = null,
        array $from = [],
        array $to = [],
        array $metadata = [],
        $payload = null,
        ?string $authorId = null
    ): UserEvent {
        $userId = $user instanceof User ? $user->id : $user;
        
        // Auto-fill author if not provided
        if (!$authorId && auth()->check()) {
            $authorId = auth()->id();
        }

        // Base metadata
        $baseMetadata = [
            'ip' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ];

        return UserEvent::create([
            'user_id'     => $userId,
            'author_id'   => $authorId,
            'event_type'  => $type,
            'description' => $description,
            'from_data'   => $from,
            'to_data'     => $to,
            'metadata'    => array_merge($baseMetadata, $metadata),
            'payload'     => is_array($payload) ? $payload : (is_string($payload) ? json_decode($payload, true) : $payload),
        ]);
    }

    /**
     * Registra uma alteração de campo específico.
     */
    public static function logChange(User $user, string $type, array $oldValues, array $newValues, ?string $description = null): UserEvent
    {
        return self::log(
            $user,
            $type,
            $description ?: "Alteração de dados do usuário: " . implode(', ', array_keys($newValues)),
            $oldValues,
            $newValues
        );
    }
}
