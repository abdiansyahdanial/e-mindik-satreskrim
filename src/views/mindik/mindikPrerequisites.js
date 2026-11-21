import {
  toCanonicalMindikCode,
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
  SPRIN_KAP_DAN_BA: 'SPRIN_KAP_DAN_BA'
};

export { toCanonicalMindikCode, CHAIN_RULES, isValidOfficialDocNumber };

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
  if (missingRecommended.length > 0) {
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
    badge,
    reason: ''
  };
}
