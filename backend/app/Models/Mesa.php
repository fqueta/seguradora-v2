<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Services\Qlib;

class Mesa extends Model
{
    use HasFactory;

    protected $table = 'posts';
    protected $primaryKey = 'ID';
    public $incrementing = true;
    protected $keyType = 'int';
    protected $fillable = [
        'post_author',
        'post_content',
        'post_title',
        'post_excerpt',
        'post_status',
        'comment_status',
        'ping_status',
        'post_password',
        'post_name',
        'to_ping',
        'pinged',
        'post_content_filtered',
        'post_parent',
        'guid',
        'menu_order',
        'post_value1',
        'post_value2',
        'post_type',
        'post_mime_type',
        'comment_count',
        'config',
        'token',
        'organization_id',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
    ];
    protected $casts = [
        'config' => 'array',
        'post_author' => 'string',
        'post_parent' => 'integer',
        'menu_order' => 'integer',
        'comment_count' => 'integer',
        'post_value1' => 'decimal:2',
        'post_value2' => 'decimal:2',
        'organization_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::addGlobalScope('mesasOnly', function (Builder $builder) {
            $builder->where('post_type', 'mesas');
        });
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
        static::creating(function ($model) {
            $model->post_type = 'mesas';
            if (empty($model->token)) {
                $model->token = Qlib::token();
            }
        });
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'post_author');
    }

    public function generateSlug($title)
    {
        $slug = Str::slug($title);
        $count = static::where('post_name', $slug)->count();
        if ($count > 0) {
            $slug = $slug . '-' . ($count + 1);
        }
        return $slug;
    }

    public function getNameAttribute()
    {
        return $this->post_title;
    }

    public function getDescriptionAttribute()
    {
        return $this->post_content;
    }

    public function getSlugAttribute()
    {
        return $this->post_name;
    }

    public function getActiveAttribute()
    {
        return $this->post_status === 'publish';
    }

    public function getCapacityAttribute()
    {
        return $this->config['capacity'] ?? null;
    }

    public function setNameAttribute($value)
    {
        $this->attributes['post_title'] = $value;
        $this->attributes['post_name'] = $this->generateSlug($value);
    }

    public function setDescriptionAttribute($value)
    {
        $this->attributes['post_content'] = $value;
    }

    public function setActiveAttribute($value)
    {
        $this->attributes['post_status'] = $value ? 'publish' : 'draft';
    }

    public function setCapacityAttribute($value)
    {
        $config = $this->config ?? [];
        $config['capacity'] = $value;
        $this->attributes['config'] = $config;
    }
}
