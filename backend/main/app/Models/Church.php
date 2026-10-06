<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Church extends Model
{
    protected $table = 'churches';

    protected $primaryKey = 'church_id';
    public $timestamps = false;

    protected $fillable = [
        'name',
        'address',
        'parent_id',
    ];

    /**
     * Parent district
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(
            Church::class,
            'parent_id',
            'church_id'
        );
    }

    /**
     * Churches / companies under this district
     */
    public function children(): HasMany
    {
        return $this->hasMany(
            Church::class,
            'parent_id',
            'church_id'
        );
    }
}