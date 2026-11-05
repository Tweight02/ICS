<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('users')->whereNull('department_id')->exists()) {
            $departmentId = DB::table('departments')->value('department_id');

            if ($departmentId === null) {
                throw new RuntimeException(
                    'Cannot require user departments while users without departments still exist.'
                );
            }

            DB::table('users')
                ->whereNull('department_id')
                ->update(['department_id' => $departmentId]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable(false)->change();
        });
    }
};
