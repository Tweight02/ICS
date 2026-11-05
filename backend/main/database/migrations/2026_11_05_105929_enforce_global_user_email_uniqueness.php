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
        $duplicateEmailsExist = DB::table('users')
            ->select('email')
            ->groupBy('email')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($duplicateEmailsExist) {
            throw new RuntimeException(
                'Cannot enforce global email uniqueness while duplicate email addresses exist. Resolve them before retrying this migration.'
            );
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_email_church_id_unique');
            $table->unique('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_email_unique');
            $table->unique(['email', 'church_id']);
        });
    }
};
