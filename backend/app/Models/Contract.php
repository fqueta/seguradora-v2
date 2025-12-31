<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Contract extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $fillable = [
        'contract_number',
        'client_id',
        'owner_id',
        'product_id',
        'status',
        'start_date',
        'end_date',
        'c_number',
        'description',
        'value',
        'file_path',
        'type',
        'address',
    ];

    protected $casts = [
        'address' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function uniqueIds()
    {
        return ['uuid'];
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
