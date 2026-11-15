import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HudCorners } from '../../command/hud';

export default function TerlaporSection({
  terlaporList = [],
  onAddTerlapor,
  onUpdateTerlapor,
  onRemoveTerlapor,
  saksiList = [],
  onAddSaksi,
  onUpdateSaksi,
  onRemoveSaksi
}) {
  const inputClass = "w-full bg-[#0E0C0A]/75 backdrop-blur-sm border border-[#FBDBAF]/15 text-white placeholder-[#FBDBAF]/40 rounded-lg px-3 py-2 text-xs focus:border-[#FF5A1F]/80 focus:ring-1 focus:ring-[#FF5A1F]/50 outline-none transition-all";
  const labelClass = "block text-[10px] font-mono font-semibold text-[#FBDBAF]/70 mb-1 uppercase tracking-wider";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-[#FAF6F0]">
      {/* ============================================================ */}
      {/* KOLOM 02: DATA SAKSI-SAKSI */}
      {/* ============================================================ */}
      <div className="relative group/card bg-[#161310]/85 backdrop-blur-xl border border-[#FBDBAF]/15 rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.45)] flex flex-col gap-4">
        <HudCorners size="md" />

        {/* Header Bagian Saksi */}
        <div className="flex items-center justify-between border-b border-[#FBDBAF]/12 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#E07020]/15 border border-[#E07020]/35 text-[#FF7A33] flex items-center justify-center font-mono font-bold text-xs">
              02
            </div>
            <div>
              <h3 className="heading-font text-xs sm:text-sm font-bold text-white uppercase tracking-wider m-0">
                DATA SAKSI-SAKSI
              </h3>
              <p className="text-[11px] text-[#FBDBAF]/65 mt-0.5 mb-0">
                Keterangan saksi fakta atau pendukung ({saksiList.length})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddSaksi}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-[#FF7A33] bg-[#E07020]/15 hover:bg-[#E07020]/25 border border-[#E07020]/35 transition-all cursor-pointer"
          >
            <Plus size={12} />
            <span>Tambah Saksi</span>
          </button>
        </div>

        {/* Daftar Saksi */}
        <div className="flex flex-col gap-3.5 max-h-[650px] overflow-y-auto pr-1">
          {saksiList.map((saksi, idx) => (
            <div
              key={saksi.id || idx}
              className="relative group/card bg-[#0E0C0A]/65 backdrop-blur-sm border border-[#FBDBAF]/15 rounded-xl p-3.5 flex flex-col gap-3 transition-all hover:border-[#E07020]/40"
            >
              <HudCorners size="sm" />

              {/* Header Subcard Saksi */}
              <div className="flex items-center justify-between border-b border-[#FBDBAF]/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF7A33] inline-block" />
                  <span className="font-mono font-bold text-white text-[11px] uppercase">
                    SAKSI {idx + 1}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E07020]/15 text-[#FBDBAF] border border-[#E07020]/35">
                    {saksi.role_label || 'Saksi Fakta'}
                  </span>
                </div>

                {saksiList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSaksi(idx)}
                    className="text-[#FF7A33] hover:text-white bg-[#E07020]/15 hover:bg-[#E07020]/30 border border-[#E07020]/35 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all"
                    title="Hapus Saksi"
                  >
                    <Trash2 size={11} /> Hapus
                  </button>
                )}
              </div>

              {/* Form Input Saksi */}
              <div className="flex flex-col gap-2.5">
                <div>
                  <label htmlFor={`saksi_nama_${idx}`} className={labelClass}>
                    NAMA LENGKAP <span className="text-[#FF5A1F]">*</span>
                  </label>
                  <input
                    id={`saksi_nama_${idx}`}
                    type="text"
                    value={saksi.nama || ''}
                    onChange={(e) => onUpdateSaksi(idx, 'nama', e.target.value)}
                    placeholder="Nama lengkap saksi"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`saksi_nik_${idx}`} className={labelClass}>NIK</label>
                    <input
                      id={`saksi_nik_${idx}`}
                      type="text"
                      maxLength={16}
                      value={saksi.nik || ''}
                      onChange={(e) => onUpdateSaksi(idx, 'nik', e.target.value)}
                      placeholder="74********"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`saksi_ttl_${idx}`} className={labelClass}>TEMPAT, TGL LAHIR</label>
                    <input
                      id={`saksi_ttl_${idx}`}
                      type="text"
                      value={saksi.ttl || ''}
                      onChange={(e) => onUpdateSaksi(idx, 'ttl', e.target.value)}
                      placeholder="Tempat, Tgl Lahir"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`saksi_pekerjaan_${idx}`} className={labelClass}>PEKERJAAN</label>
                    <input
                      id={`saksi_pekerjaan_${idx}`}
                      type="text"
                      value={saksi.pekerjaan || ''}
                      onChange={(e) => onUpdateSaksi(idx, 'pekerjaan', e.target.value)}
                      placeholder="Pekerjaan"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`saksi_agama_${idx}`} className={labelClass}>AGAMA</label>
                    <select
                      id={`saksi_agama_${idx}`}
                      value={saksi.agama || 'Islam'}
                      onChange={(e) => onUpdateSaksi(idx, 'agama', e.target.value)}
                      className={inputClass}
                    >
                      <option value="Islam" className="bg-zinc-900 text-white">Islam</option>
                      <option value="Kristen Protestan" className="bg-zinc-900 text-white">Kristen</option>
                      <option value="Katolik" className="bg-zinc-900 text-white">Katolik</option>
                      <option value="Hindu" className="bg-zinc-900 text-white">Hindu</option>
                      <option value="Buddha" className="bg-zinc-900 text-white">Buddha</option>
                      <option value="Konghucu" className="bg-zinc-900 text-white">Konghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`saksi_alamat_${idx}`} className={labelClass}>ALAMAT DOMISILI</label>
                  <input
                    id={`saksi_alamat_${idx}`}
                    type="text"
                    value={saksi.alamat || ''}
                    onChange={(e) => onUpdateSaksi(idx, 'alamat', e.target.value)}
                    placeholder="Alamat domisili lengkap KTP"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`saksi_kontak_${idx}`} className={labelClass}>NOMOR HP / WHATSAPP</label>
                  <input
                    id={`saksi_kontak_${idx}`}
                    type="tel"
                    value={saksi.kontak || ''}
                    onChange={(e) => onUpdateSaksi(idx, 'kontak', e.target.value)}
                    placeholder="08************"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* KOLOM 03: PIHAK TERLAPOR */}
      {/* ============================================================ */}
      <div className="relative group/card bg-[#161310]/85 backdrop-blur-xl border border-[#FBDBAF]/15 rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.45)] flex flex-col gap-4">
        <HudCorners size="md" />

        {/* Header Bagian Terlapor */}
        <div className="flex items-center justify-between border-b border-[#FBDBAF]/12 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#E07020]/15 border border-[#E07020]/35 text-[#FF7A33] flex items-center justify-center font-mono font-bold text-xs">
              03
            </div>
            <div>
              <h3 className="heading-font text-xs sm:text-sm font-bold text-white uppercase tracking-wider m-0">
                PIHAK TERLAPOR
              </h3>
              <p className="text-[11px] text-[#FBDBAF]/65 mt-0.5 mb-0">
                Pihak yang dilaporkan / terlapor ({terlaporList.length})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddTerlapor}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-[#FF7A33] bg-[#E07020]/15 hover:bg-[#E07020]/25 border border-[#E07020]/35 transition-all cursor-pointer"
          >
            <Plus size={12} />
            <span>Tambah Terlapor</span>
          </button>
        </div>

        {/* Daftar Terlapor */}
        <div className="flex flex-col gap-3.5 max-h-[650px] overflow-y-auto pr-1">
          {terlaporList.map((terlapor, idx) => (
            <div
              key={terlapor.id || idx}
              className="relative group/card bg-[#0E0C0A]/65 backdrop-blur-sm border border-[#E07020]/35 rounded-xl p-3.5 flex flex-col gap-3 transition-all hover:border-[#FF5A1F]/55"
            >
              <HudCorners size="sm" />

              {/* Header Subcard Terlapor */}
              <div className="flex items-center justify-between border-b border-[#FBDBAF]/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A1F] inline-block" />
                  <span className="font-mono font-bold text-white text-[11px] uppercase">
                    TERLAPOR {idx + 1}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E07020]/15 text-[#FF7A33] border border-[#E07020]/35">
                    {terlapor.role_label || 'Terlapor Utama'}
                  </span>
                </div>

                {terlaporList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveTerlapor(idx)}
                    className="text-[#FF7A33] hover:text-white bg-[#E07020]/15 hover:bg-[#E07020]/30 border border-[#E07020]/35 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all"
                    title="Hapus Terlapor"
                  >
                    <Trash2 size={11} /> Hapus
                  </button>
                )}
              </div>

              {/* Form Input Terlapor */}
              <div className="flex flex-col gap-2.5">
                <div>
                  <label htmlFor={`terlapor_nama_${idx}`} className={labelClass}>
                    NAMA LENGKAP <span className="text-[#FF5A1F]">*</span>
                  </label>
                  <input
                    id={`terlapor_nama_${idx}`}
                    type="text"
                    value={terlapor.nama || ''}
                    onChange={(e) => onUpdateTerlapor(idx, 'nama', e.target.value)}
                    placeholder="Nama lengkap pihak terlapor"
                    className={`${inputClass} border-[#E07020]/35 focus:border-[#FF5A1F]`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`terlapor_nik_${idx}`} className={labelClass}>NIK</label>
                    <input
                      id={`terlapor_nik_${idx}`}
                      type="text"
                      maxLength={16}
                      value={terlapor.nik || ''}
                      onChange={(e) => onUpdateTerlapor(idx, 'nik', e.target.value)}
                      placeholder="74********"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`terlapor_ttl_${idx}`} className={labelClass}>TEMPAT, TGL LAHIR</label>
                    <input
                      id={`terlapor_ttl_${idx}`}
                      type="text"
                      value={terlapor.ttl || ''}
                      onChange={(e) => onUpdateTerlapor(idx, 'ttl', e.target.value)}
                      placeholder="Tempat, Tgl Lahir"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`terlapor_pekerjaan_${idx}`} className={labelClass}>PEKERJAAN</label>
                    <input
                      id={`terlapor_pekerjaan_${idx}`}
                      type="text"
                      value={terlapor.pekerjaan || ''}
                      onChange={(e) => onUpdateTerlapor(idx, 'pekerjaan', e.target.value)}
                      placeholder="Pekerjaan"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`terlapor_agama_${idx}`} className={labelClass}>AGAMA</label>
                    <select
                      id={`terlapor_agama_${idx}`}
                      value={terlapor.agama || 'Islam'}
                      onChange={(e) => onUpdateTerlapor(idx, 'agama', e.target.value)}
                      className={inputClass}
                    >
                      <option value="Islam" className="bg-zinc-900 text-white">Islam</option>
                      <option value="Kristen Protestan" className="bg-zinc-900 text-white">Kristen</option>
                      <option value="Katolik" className="bg-zinc-900 text-white">Katolik</option>
                      <option value="Hindu" className="bg-zinc-900 text-white">Hindu</option>
                      <option value="Buddha" className="bg-zinc-900 text-white">Buddha</option>
                      <option value="Konghucu" className="bg-zinc-900 text-white">Konghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`terlapor_alamat_${idx}`} className={labelClass}>ALAMAT DOMISILI</label>
                  <input
                    id={`terlapor_alamat_${idx}`}
                    type="text"
                    value={terlapor.alamat || ''}
                    onChange={(e) => onUpdateTerlapor(idx, 'alamat', e.target.value)}
                    placeholder="Alamat tempat tinggal terlapor"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`terlapor_kontak_${idx}`} className={labelClass}>NOMOR HP / KONTAK</label>
                  <input
                    id={`terlapor_kontak_${idx}`}
                    type="tel"
                    value={terlapor.kontak || ''}
                    onChange={(e) => onUpdateTerlapor(idx, 'kontak', e.target.value)}
                    placeholder="08************"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
