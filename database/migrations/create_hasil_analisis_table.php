<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hasil_analisis', function (Blueprint $table) {
            $table->id('id_analisis');

            $table->uuid('visitor_id');

            $table->foreignId('lagu_id')
                ->constrained('lagu', 'id_lagu')
                ->cascadeOnDelete();

            $table->foreignId('hasil_pitch_id')
                ->constrained('hasil_pitch', 'id_pitch')
                ->cascadeOnDelete();

            $table->string('key_rekomendasi')->nullable();
            $table->integer('transpose');

            $table->string('nada_terendah_vokal')->nullable();
            $table->string('nada_tertinggi_vokal')->nullable();

            $table->timestamps();

            $table->index('visitor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hasil_analisis');
    }
};