<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContractEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id',
        'user_id',
        'event_type',
        'description',
        'from_status',
        'to_status',
        'metadata',
        'payload',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
