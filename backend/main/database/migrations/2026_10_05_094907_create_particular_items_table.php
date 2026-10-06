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
        Schema::create('particular_items', function (Blueprint $table) {
            $table->id('item_id');
            $table->foreignId('particular_id')
                ->constrained('particulars', 'particular_id')
                ->cascadeOnDelete();
            $table->foreignId('quarter_id')
                ->constrained('quarters', 'quarter_id')
                ->cascadeOnDelete();
            $table->integer('value')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('particular_items');
    }
};
