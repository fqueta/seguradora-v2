<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'document',
        'email',
        'phone',
        'address',
        'active',
        'config',
        'alloyal_business_id',
    ];

    protected $casts = [
        'active' => 'boolean',
        'config' => 'array',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function clients()
    {
        return $this->hasMany(Client::class);
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }
}
