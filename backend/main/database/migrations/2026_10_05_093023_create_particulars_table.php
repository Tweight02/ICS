<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('particulars', function (Blueprint $table) {
            $table->id('particular_id');
            $table->foreignId('program_id')
                ->constrained('programs','program_id')
                ->cascadeOnDelete();
            $table->string('particular_name');

            $table->index('particular_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('particulars');
    }
};
