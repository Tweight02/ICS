<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stewardships', function (Blueprint $table) {
            $table->decimal('value', 12, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('stewardships', function (Blueprint $table) {
            $table->integer('value')->nullable()->change();
        });
    }
};
