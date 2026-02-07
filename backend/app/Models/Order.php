<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'status',
        'print_status',
        'fulfillment_type',
        'payment_method',
        'mesa_id',
        'priority',
        'customer_name',
        'customer_phone',
        'delivery_address',
        'notes',
        'admin_notes',
        'kitchen_notes',
        'token',
        'config',
        'print_template',
        'print_copies',
        'total_amount',
        'organization_id',
    ];

    protected $casts = [
        'delivery_address' => 'array',
        'config' => 'array',
        'total_amount' => 'decimal:2',
        'printed_at' => 'datetime',
        'organization_id' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
    public function mesa()
    {
        return $this->belongsTo(Mesa::class, 'mesa_id', 'ID');
    }

    public function calculateTotalAmount(): void
    {
        $total = $this->items()->sum('total_price');
        $this->update(['total_amount' => $total]);
    }
}
