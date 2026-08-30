<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hasil_pitch', function (Blueprint $table) {
            $table->id('id_pitch');

            $table->foreignId('lagu_id')
                ->constrained('lagu', 'id_lagu')
                ->cascadeOnDelete();

            $table->string('key_hasil');
            $table->integer('transpose');

            $table->string('path_pitch');

            $table->timestamps();

            $table->unique([
                'lagu_id',
                'transpose',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hasil_pitch');
    }
};