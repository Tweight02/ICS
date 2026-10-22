<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    //
    protected $table = 'departments';
    public $timestamps = false;

    protected $primaryKey = 'department_id';

    protected $fillable = [
        'department_name'
    ];

    public function programs(){
        return $this->hasMany(Program::class, 'department_id', 'department_id');
    }
}

