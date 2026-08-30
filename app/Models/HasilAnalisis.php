<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HasilAnalisis extends Model
{
    protected $table = 'hasil_analisis';

    protected $primaryKey = 'id_analisis';

    protected $fillable = [
        'visitor_id',
        'lagu_id',
        'hasil_pitch_id',
        'key_rekomendasi',
        'transpose',
        'nada_terendah_vokal',
        'nada_tertinggi_vokal',
    ];

    public function lagu(): BelongsTo
    {
        return $this->belongsTo(
            Lagu::class,
            'lagu_id',
            'id_lagu'
        );
    }

    public function hasilPitch(): BelongsTo
    {
        return $this->belongsTo(
            HasilPitch::class,
            'hasil_pitch_id',
            'id_pitch'
        );
    }
}