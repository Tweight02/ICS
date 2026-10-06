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
        Schema::create('comments', function (Blueprint $table) {
            $table->id('comment_id');
            $table->foreignId('quarter_id')
                ->constrained('quarters', 'quarter_id')
                ->cascadeOnDelete();
            $table->foreignId('commented_by')
                ->constrained('users', 'user_id')
                ->cascadeOnDelete();
            $table->string('details');
            $table->date('date_commented');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
