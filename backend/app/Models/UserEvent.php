<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserEvent extends Model
{
    protected $fillable = [
        'user_id',
        'author_id',
        'event_type',
        'description',
        'from_data',
        'to_data',
        'metadata',
        'payload',
    ];

    protected $casts = [
        'from_data' => 'array',
        'to_data' => 'array',
        'metadata' => 'array',
        'payload' => 'array',
    ];

    /**
     * The user targeted by the event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The user who performed the action.
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
