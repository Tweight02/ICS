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
        Schema::create('stewardships', function (Blueprint $table) {
            $table->id('stewardship_id');
            $table->foreignId('item_id')
                ->constrained('particular_items', 'item_id')
                ->cascadeOnDelete();
            $table->string('type');
            $table->string('month');
            $table->integer('value')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stewardships');
    }
};
