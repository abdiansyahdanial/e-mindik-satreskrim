import {
  toCanonicalMindikCode,
  normalizeCanonicalTemplateCode,
  CHAIN_RULES,
  PREREQUISITE_LABELS,
  PREREQUISITE_SATISFIERS,
  isValidOfficialDocNumber,
  getChainRuleForCode,
  getArchiveRowDocNumber,
  resolveLatestArchiveDoc
} from '../../constants/mindikChainRegistry.js';

export const MINDIK_CODES = {
  SPRIN_SIDIK: 'SPRIN_SIDIK',
  SPGAS_SIDIK: 'SPGAS_SIDIK',
  TAP_TSK: 'TAP_TSK',
  SP_TAP_TSK: 'TAP_TSK',
  SPDP: 'SPDP_TSK',
  SPRIN_HAN_DAN_BA: 'SPRIN_HAN_DAN_BA',
  SPRIN_KAP_DAN_BA: 'SPRIN_KAP_DAN_BA',
  PENGANTAR_BP_TAHAP1: 'PENGANTAR_BP_TAHAP1',
  PENGANTAR_BP_KEMBALI_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_TAHAP2: 'PENGANTAR_TAHAP2'
};

export { toCanonicalMindikCode, normalizeCanonicalTemplateCode, CHAIN_RULES, isValidOfficialDocNumber };

/**
 * Evaluasi prasyarat rantai formil KUHAP berbasis CHAIN_RULES dan kode kanonik.
 * Memastikan dokumen prasyarat benar-benar ada di activeCaseDocs (public.documents)
 * dan memiliki nomor surat dinas yang sah (bukan placeholder '....').
 */
export function checkPrerequisite(targetCode, caseItem, activeCaseDocs = [], targetTitle = '') {
  const rule = getChainRuleForCode(targetCode, targetTitle);
  const canonical = rule.canonicalCode;
  const safeDocs = Array.isArray(activeCaseDocs) ? activeCaseDocs : [];

  const isReqSatisfied = (reqKey) => {
    if (reqKey === 'LP') {
      return Boolean(caseItem && (caseItem.id || caseItem.nomor_lp || caseItem.no_lp));
    }

    const satisfierCodes = PREREQUISITE_SATISFIERS[reqKey] || [reqKey];
    const validDoc = resolveLatestArchiveDoc(safeDocs, satisfierCodes, false);
    if (validDoc) return true;

    // Cek apakah tersimpan sah di public.documents tanpa placeholder titik ('....')
    const persistedDoc = resolveLatestArchiveDoc(safeDocs, satisfierCodes, true);
    if (persistedDoc) {
      const rawNo = getArchiveRowDocNumber(persistedDoc);
      const hasPlaceholderDots = /\.{3,}|\u2026|_{3,}/.test(String(rawNo || ''));
      const isPersistedRow = Boolean(persistedDoc.id && persistedDoc.created_at);
      if (isPersistedRow && !hasPlaceholderDots && Boolean(rawNo)) {
        return true;
      }
    }
    return false;
  };

  const missingPrerequisites = [];
  (rule.required || []).forEach((reqKey) => {
    if (!isReqSatisfied(reqKey)) {
      missingPrerequisites.push({
        code: reqKey,
        label: PREREQUISITE_LABELS[reqKey] || reqKey
      });
    }
  });

  const missingRecommended = [];
  (rule.recommended || []).forEach((recKey) => {
    if (!isReqSatisfied(recKey)) {
      missingRecommended.push({
        code: recKey,
        label: PREREQUISITE_LABELS[recKey] || recKey
      });
    }
  });

  if (missingPrerequisites.length > 0) {
    const firstMissing = missingPrerequisites[0];
    const missingNames = missingPrerequisites.map(m => m.label).join(', ');
    let badge = `Perlu ${firstMissing.code}`;
    if (firstMissing.code === 'SPRIN_SIDIK') badge = 'Perlu SP.Sidik';
    else if (firstMissing.code === 'TAP_TSK') badge = 'Perlu SP.Tap.Tsk';
    else if (firstMissing.code === 'SPDP') badge = 'Perlu SPDP';
    else if (firstMissing.code === 'SPRIN_HAN_DAN_BA') badge = 'Perlu SP.Han';
    else if (firstMissing.code === 'LP') badge = 'Pilih LP';

    return {
      allowed: false,
      unlocked: false,
      isLocked: true,
      level: rule.level,
      canonicalCode: canonical,
      subjectMode: rule.subjectMode,
      missingPrerequisites,
      recommendedMissing: missingRecommended,
      badge,
      reason: `Wajib menerbitkan & menyimpan dengan nomor surat sah: ${missingNames} terlebih dahulu.`
    };
  }

  let infoNotice = '';
  let infoNoticeType = 'warning';
  if (canonical === 'SPRIN_HAN_DAN_BA' || canonical === 'SPRIN_HAN' || canonical === 'BA_HAN') {
    const hasSpKap = isReqSatisfied('SPRIN_KAP_DAN_BA');
    if (!hasSpKap) {
      const spglTskDoc = resolveLatestArchiveDoc(safeDocs, ['SPGL_TSK_1', 'SPGL_TSK_2', 'SPGL_TSK', 'SPRIN_BAWA_TSK_DAN_BA'], false);
      if (spglTskDoc) {
        const spglNo = getArchiveRowDocNumber(spglTskDoc);
        const spglDate = spglTskDoc.formatted_date || spglTskDoc.tgl_surat || '';
        infoNoticeType = 'success';
        infoNotice = `Dasar formil kehadiran tersangka terpenuhi melalui Surat Panggilan Tersangka Nomor: ${spglNo}${spglDate ? ` (${spglDate})` : ''} (SP.Kap tidak diperlukan apabila tersangka hadir memenuhi panggilan).`;
      } else {
        infoNoticeType = 'warning';
        infoNotice = 'Perhatian Formil KUHAP: SP.Kap belum diterbitkan. Apabila tersangka tidak ditangkap, wajib diterbitkan Surat Panggilan Tersangka terlebih dahulu karena tersangka yang hadir menghadap penyidik harus berdasarkan Surat Perintah Penangkapan atau Surat Panggilan Tersangka.';
      }
    }
  } else if (canonical === 'SPGL_SAKSI_2') {
    const spglSaksi1Doc = resolveLatestArchiveDoc(safeDocs, ['SPGL_SAKSI_1', 'SPGL_SAKSI'], false);
    if (spglSaksi1Doc) {
      const spgl1No = getArchiveRowDocNumber(spglSaksi1Doc);
      const spgl1Date = spglSaksi1Doc.formatted_date || spglSaksi1Doc.tgl_surat || '';
      infoNoticeType = 'success';
      infoNotice = `Rujukan Panggilan Ke-1 terhubung otomatis: Nomor ${spgl1No}${spgl1Date ? `, tanggal ${spgl1Date}` : ''}.`;
    } else {
      infoNoticeType = 'warning';
      infoNotice = rule.recommendedNote || 'Surat Panggilan Saksi Ke-1 belum ditemukan di arsip perkara ini.';
    }
  } else if (canonical === 'SPGL_TSK_2') {
    const spglTsk1Doc = resolveLatestArchiveDoc(safeDocs, ['SPGL_TSK_1', 'SPGL_TSK'], false);
    if (spglTsk1Doc) {
      const spgl1No = getArchiveRowDocNumber(spglTsk1Doc);
      const spgl1Date = spglTsk1Doc.formatted_date || spglTsk1Doc.tgl_surat || '';
      infoNoticeType = 'success';
      infoNotice = `Rujukan Panggilan Ke-1 terhubung otomatis: Nomor ${spgl1No}${spgl1Date ? `, tanggal ${spgl1Date}` : ''}.`;
    } else {
      infoNoticeType = 'warning';
      infoNotice = rule.recommendedNote || 'Surat Panggilan Tersangka Ke-1 belum ditemukan di arsip perkara ini.';
    }
  } else if (canonical === 'PENGANTAR_BP_KEMBALI_P19') {
    const tahap1Doc = resolveLatestArchiveDoc(safeDocs, ['PENGANTAR_BP_TAHAP1', 'PENGANTAR_TAHAP_1', 'PENGANTAR_TAHAP1'], false);
    if (tahap1Doc) {
      const t1No = getArchiveRowDocNumber(tahap1Doc);
      const t1Date = tahap1Doc.formatted_date || tahap1Doc.tgl_surat || '';
      infoNoticeType = 'success';
      infoNotice = `Rujukan Surat Pengantar Berkas Perkara Tahap I terhubung otomatis: Nomor ${t1No}${t1Date ? `, tanggal ${t1Date}` : ''}.`;
    } else {
      infoNoticeType = 'warning';
      infoNotice = rule.recommendedNote || 'Surat Pengantar Berkas Perkara Tahap I sebelumnya belum ditemukan di arsip perkara ini.';
    }
  } else if (missingRecommended.length > 0) {
    infoNotice = rule.recommendedNote || `Opsional: ${missingRecommended.map(m => m.label).join(', ')} belum diterbitkan.`;
  }

  const badge = rule.level === 1 && (canonical === 'SPRIN_SIDIK' || canonical === 'SPRIN_SIDIK_MORE_5')
    ? 'Gerbang Utama'
    : 'Siap Diterbitkan';

  return {
    allowed: true,
    unlocked: true,
    isLocked: false,
    level: rule.level,
    canonicalCode: canonical,
    subjectMode: rule.subjectMode,
    missingPrerequisites: [],
    recommendedMissing: missingRecommended,
    infoNotice,
    infoNoticeType,
    badge,
    reason: ''
  };
}
