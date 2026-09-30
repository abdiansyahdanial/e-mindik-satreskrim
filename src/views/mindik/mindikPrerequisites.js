export const MINDIK_CODES = {
  SPRIN_SIDIK: 'SPRIN_SIDIK',
  SPGAS_SIDIK: 'SPGAS_SIDIK',
  SP_TAP_TSK: 'S_TAP_TSK',
  SPDP: 'SPDP'
};

export function checkPrerequisite(targetCode, caseItem, activeCaseDocs = []) {
  const code = (targetCode || '').toUpperCase().trim();
  const publishedCodes = new Set(activeCaseDocs.map(d => (d.template_code || '').toUpperCase().trim()));

  const hasSprinSidik = 
    publishedCodes.has('SPRIN_SIDIK') || 
    publishedCodes.has('SP_SIDIK') || 
    Boolean(caseItem?.no_sprin_sidik) || 
    Boolean(caseItem?.references?.no_sprin_sidik) || 
    Boolean(caseItem?.references?.sprin_sidik);

  const hasSpGasSidik = 
    publishedCodes.has('SPGAS_SIDIK') || 
    publishedCodes.has('SP_GAS_SIDIK') || 
    Boolean(caseItem?.no_sp_gas_sidik) || 
    Boolean(caseItem?.references?.no_spgas_sidik) || 
    Boolean(caseItem?.references?.no_sprin_gas_sidik);

  const hasSpTapTsk = 
    publishedCodes.has('SP_TAP_TSK') || 
    publishedCodes.has('S_TAP_TSK') || 
    Boolean(caseItem?.references?.no_sp_tap_tsk);

  // 1. Level 1: Surat Perintah Penyidikan
  if (code === 'SPRIN_SIDIK' || code === 'SP_SIDIK') {
    return { allowed: true, unlocked: true, reason: '', badge: 'Gerbang Utama', isLocked: false };
  }

  // Wajib memiliki SP.Sidik sebelum melangkah ke dokumen lanjutan
  if (!hasSprinSidik) {
    return {
      allowed: false,
      unlocked: false,
      reason: 'SP.Sidik belum diterbitkan. Terbitkan dan simpan SP.Sidik terlebih dahulu.',
      badge: 'Perlu SP.Sidik',
      isLocked: true
    };
  }

  // 2. Level 2: Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)
  if (code === 'SPGAS_SIDIK' || code === 'SP_GAS_SIDIK') {
    return { allowed: true, unlocked: true, reason: '', badge: 'Siap Diterbitkan', isLocked: false };
  }

  // 3. Level 3: Penetapan Tersangka & SPDP
  if (code.includes('TAP_TSK') || code.includes('SP_TAP')) {
    if (!hasSpGasSidik) {
      return { allowed: false, unlocked: false, reason: 'Wajib membuat SP.Gas.Sidik terlebih dahulu.', badge: 'Perlu SP.Gas.Sidik', isLocked: true };
    }
    return { allowed: true, unlocked: true, reason: '', badge: 'Siap Diterbitkan', isLocked: false };
  }

  if (code.startsWith('SPDP')) {
    if (!hasSpGasSidik) {
      return { allowed: false, unlocked: false, reason: 'Wajib membuat SP.Gas.Sidik sebelum mengirim SPDP.', badge: 'Perlu SP.Gas.Sidik', isLocked: true };
    }
    return { allowed: true, unlocked: true, reason: '', badge: 'Siap Diterbitkan', isLocked: false };
  }

  // 4. Level 4: Tindakan / Pemanggilan
  if (code.includes('PANGGIL') || code.includes('KAP') || code.includes('HAN')) {
    if (!hasSpTapTsk && code.includes('TSK')) {
      return { allowed: false, unlocked: false, reason: 'Wajib menetapkan Tersangka (S.Tap.TSK) terlebih dahulu.', badge: 'Perlu SP.Tap TSK', isLocked: true };
    }
    return { allowed: true, unlocked: true, reason: '', badge: 'Siap Diterbitkan', isLocked: false };
  }

  return { allowed: true, unlocked: true, reason: '', badge: '', isLocked: false };
}
