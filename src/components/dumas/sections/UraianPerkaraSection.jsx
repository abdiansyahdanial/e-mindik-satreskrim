import React from 'react';
import { HudCorners } from '../../command/hud';

export default function UraianPerkaraSection({ caseInfo = {}, onChange }) {
  const handleChange = (field, value) => {
    if (typeof onChange === 'function') {
      onChange(field, value);
    }
  };

  const inputClass = "w-full bg-black/40 backdrop-blur-sm border border-white/10 text-white placeholder-zinc-500 rounded-lg px-3.5 py-2.5 text-xs focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 outline-none transition-all";
  const labelClass = "block text-[11px] font-mono font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="relative group/card bg-[#05070a]/70 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.37)] text-zinc-100">
      <HudCorners size="md" />

      {/* Header Bagian 04 */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-red-950/40 border border-red-500/30 text-red-400 flex items-center justify-center font-mono font-bold text-xs">
            04
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono m-0">
              PERISTIWA &amp; DUGAAN PASAL PIDANA
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5 mb-0">
              Rincian dugaan peristiwa tindak pidana, tempus, locus, dan kronologis
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
          Kronologi Perkara
        </span>
      </div>

      {/* Grid Input Perkara */}
      <div className="flex flex-col gap-4">
        {/* Baris 1: Dugaan Tindak Pidana & Dugaan Pasal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dumas_tindak_pidana" className={labelClass}>
              DUGAAN TINDAK PIDANA <span className="text-red-500">*</span>
            </label>
            <input
              id="dumas_tindak_pidana"
              name="tindak_pidana"
              type="text"
              value={caseInfo.tindak_pidana || caseInfo.dugaan_tindak_pidana || ''}
              onChange={(e) => handleChange('tindak_pidana', e.target.value)}
              placeholder="Contoh: Penggelapan Dana Kas / Penipuan"
              className={`${inputClass} font-semibold`}
            />
          </div>

          <div>
            <label htmlFor="dumas_pasal" className={labelClass}>
              DUGAAN PASAL YANG DISANGKAKAN
            </label>
            <input
              id="dumas_pasal"
              name="pasal"
              type="text"
              value={caseInfo.pasal || caseInfo.pasal_disangkakan || ''}
              onChange={(e) => handleChange('pasal', e.target.value)}
              placeholder="Contoh: Pasal 372 KUHP dan/atau Pasal 378 KUHP"
              className={`${inputClass} font-semibold`}
            />
          </div>
        </div>

        {/* Baris 2: Waktu Kejadian & TKP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dumas_waktu_kejadian" className={labelClass}>
              WAKTU KEJADIAN (TEMPUS DELICTI)
            </label>
            <input
              id="dumas_waktu_kejadian"
              name="waktu_kejadian"
              type="text"
              value={caseInfo.waktu_kejadian || caseInfo.waktu || ''}
              onChange={(e) => handleChange('waktu_kejadian', e.target.value)}
              placeholder="Contoh: Senin, 14 September 2026 - Pukul 10.30 WITA"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="dumas_tkp" className={labelClass}>
              TEMPAT KEJADIAN (LOCUS DELICTI)
            </label>
            <input
              id="dumas_tkp"
              name="tkp"
              type="text"
              value={caseInfo.tkp || caseInfo.locus_delicti || ''}
              onChange={(e) => handleChange('tkp', e.target.value)}
              placeholder="Contoh: Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
              className={inputClass}
            />
          </div>
        </div>

        {/* Baris 3: Narasi Kronologi Kejadian Lengkap */}
        <div>
          <label htmlFor="dumas_uraian" className={labelClass}>
            RINGKASAN POSISI KASUS / URAIAN KRONOLOGIS KEJADIAN LENGKAP <span className="text-red-500">*</span>
          </label>
          <textarea
            id="dumas_uraian"
            name="uraian"
            rows={8}
            value={caseInfo.uraian || caseInfo.uraian_kejadian || ''}
            onChange={(e) => handleChange('uraian', e.target.value)}
            placeholder="Salinan lengkap kronologis atau uraian kejadian persis sesuai dokumen laporan/aduan..."
            className={`${inputClass} resize-y min-h-[160px] leading-relaxed`}
          />
        </div>
      </div>
    </div>
  );
}
