<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            'ALTER TABLE baptisms MODIFY date_of_baptism DATE NULL'
        );
    }

    public function down(): void
    {
        DB::statement(
            'ALTER TABLE baptisms MODIFY date_of_baptism DATE NOT NULL'
        );
    }
};