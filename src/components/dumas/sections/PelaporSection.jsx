import React from 'react';
import { HudCorners } from '../../command/hud';

export default function PelaporSection({ data = {}, onChange }) {
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

      {/* Header Bagian 01 */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-red-950/40 border border-red-500/30 text-red-400 flex items-center justify-center font-mono font-bold text-xs">
            01
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono m-0">
              IDENTITAS PELAPOR / KORBAN
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5 mb-0">
              Data diri lengkap pihak yang mengadukan atau melapor perkara
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
          Pihak Pelapor
        </span>
      </div>

      {/* Grid Formulir Pelapor */}
      <div className="flex flex-col gap-4">
        {/* Baris 1: NIK & Nama Lengkap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pelapor_nik" className={labelClass}>
              NIK (NOMOR INDUK KEPENDUDUKAN) <span className="text-red-500">*</span>
            </label>
            <input
              id="pelapor_nik"
              name="pelapor_nik"
              type="text"
              maxLength={16}
              value={data.nik || ''}
              onChange={(e) => handleChange('nik', e.target.value)}
              placeholder="74**************"
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label htmlFor="pelapor_nama" className={labelClass}>
              NAMA LENGKAP <span className="text-red-500">*</span>
            </label>
            <input
              id="pelapor_nama"
              name="pelapor_nama"
              type="text"
              value={data.nama || ''}
              onChange={(e) => handleChange('nama', e.target.value)}
              placeholder="Nama lengkap beserta gelar (jika ada)"
              className={inputClass}
            />
          </div>
        </div>

        {/* Baris 2: Tempat & Tanggal Lahir (Single Text Input) */}
        <div>
          <label htmlFor="pelapor_tempat_tanggal_lahir" className={labelClass}>
            TEMPAT, TGL LAHIR
          </label>
          <input
            id="pelapor_tempat_tanggal_lahir"
            name="pelapor_tempat_tanggal_lahir"
            type="text"
            value={data.tempat_tanggal_lahir || data.ttl || (data.tempat_lahir ? `${data.tempat_lahir}${data.tanggal_lahir ? `, ${data.tanggal_lahir}` : ''}` : (data.tanggal_lahir || ''))}
            onChange={(e) => {
              handleChange('tempat_tanggal_lahir', e.target.value);
              handleChange('ttl', e.target.value);
            }}
            placeholder="Contoh: Kolaka, 12 Mei 1990"
            className={inputClass}
          />
        </div>

        {/* Baris 3: Jenis Kelamin, Agama, Kewarganegaraan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pelapor_jenis_kelamin" className={labelClass}>
              JENIS KELAMIN
            </label>
            <select
              id="pelapor_jenis_kelamin"
              name="pelapor_jenis_kelamin"
              value={data.jenis_kelamin || 'Laki-laki'}
              onChange={(e) => handleChange('jenis_kelamin', e.target.value)}
              className={inputClass}
            >
              <option value="Laki-laki" className="bg-zinc-900 text-white">Laki-laki</option>
              <option value="Perempuan" className="bg-zinc-900 text-white">Perempuan</option>
            </select>
          </div>

          <div>
            <label htmlFor="pelapor_agama" className={labelClass}>
              AGAMA
            </label>
            <select
              id="pelapor_agama"
              name="pelapor_agama"
              value={data.agama || 'Islam'}
              onChange={(e) => handleChange('agama', e.target.value)}
              className={inputClass}
            >
              <option value="Islam" className="bg-zinc-900 text-white">Islam</option>
              <option value="Kristen Protestan" className="bg-zinc-900 text-white">Kristen Protestan</option>
              <option value="Katolik" className="bg-zinc-900 text-white">Katolik</option>
              <option value="Hindu" className="bg-zinc-900 text-white">Hindu</option>
              <option value="Buddha" className="bg-zinc-900 text-white">Buddha</option>
              <option value="Konghucu" className="bg-zinc-900 text-white">Konghucu</option>
            </select>
          </div>

          <div>
            <label htmlFor="pelapor_kewarganegaraan" className={labelClass}>
              KEWARGANEGARAAN
            </label>
            <select
              id="pelapor_kewarganegaraan"
              name="pelapor_kewarganegaraan"
              value={data.kewarganegaraan || 'WNI'}
              onChange={(e) => handleChange('kewarganegaraan', e.target.value)}
              className={inputClass}
            >
              <option value="WNI" className="bg-zinc-900 text-white">WNI (Indonesia)</option>
              <option value="WNA" className="bg-zinc-900 text-white">WNA (Asing)</option>
            </select>
          </div>
        </div>

        {/* Baris 4: Pekerjaan & No Telepon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pelapor_pekerjaan" className={labelClass}>
              PEKERJAAN
            </label>
            <input
              id="pelapor_pekerjaan"
              name="pelapor_pekerjaan"
              type="text"
              value={data.pekerjaan || ''}
              onChange={(e) => handleChange('pekerjaan', e.target.value)}
              placeholder="Contoh: Wiraswasta, PNS, Petani, Karyawan"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="pelapor_telepon" className={labelClass}>
              NO. TELEPON / WHATSAPP <span className="text-red-500">*</span>
            </label>
            <input
              id="pelapor_telepon"
              name="pelapor_telepon"
              type="tel"
              value={data.telepon || data.kontak || ''}
              onChange={(e) => handleChange('telepon', e.target.value)}
              placeholder="08************"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

        {/* Baris 5: Alamat Lengkap Domisili KTP */}
        <div>
          <label htmlFor="pelapor_alamat" className={labelClass}>
            ALAMAT DOMISILI KTP
          </label>
          <textarea
            id="pelapor_alamat"
            name="pelapor_alamat"
            rows={3}
            value={data.alamat || ''}
            onChange={(e) => handleChange('alamat', e.target.value)}
            placeholder="Alamat lengkap tempat tinggal / domisili sesuai KTP"
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>
    </div>
  );
}
