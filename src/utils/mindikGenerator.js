/**
 * Utility re-export to provide consistent imports across src/utils/mindikGenerator.js
 * and src/services/mindikGenerator.js
 */
export * from '../services/mindikGenerator.js';
export { 
  buildMindikPayload, 
  buildMindikVariables, 
  buildDocxDataMap, 
  formatTanggalIndonesia,
  formatNomorSuratHeader,
  formatTanggalSuratHeader,
  MAP_PANGKAT_LENGKAP,
  formatPangkatLengkap,
  getPenyidikPenangan
} from '../services/mindikGenerator.js';

