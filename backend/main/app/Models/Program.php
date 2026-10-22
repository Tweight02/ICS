<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Program extends Model
{
    protected $table = 'programs';
    protected $primaryKey = 'program_id';
    public $timestamps = false;

    protected $fillable = [
        'department_id',
        'program_name',
        'parent_id',
    ];

    public function particulars()
    {
        return $this->hasMany(Particular::class, 'program_id', 'program_id');
    }
}
