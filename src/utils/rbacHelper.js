/**
 * Helper normalisasi & pengecekan peran RBAC E-Mindik Satreskrim.
 * Mendukung peran: 'super_admin', 'admin', 'anggota', dan 'spkt' ('petugas_spkt').
 */

export function normalizeUserRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function isSpktRole(role) {
  const normalized = normalizeUserRole(role);
  return normalized === 'spkt' || normalized === 'petugas_spkt' || normalized === 'petugas spkt';
}

export function getRoleLabel(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === 'super_admin') return 'SUPER ADMIN';
  if (normalized === 'admin') return 'ADMIN';
  if (isSpktRole(normalized)) return 'PETUGAS SPKT';
  return 'ANGGOTA';
}

export function getRoleBadgeStyle(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === 'super_admin') {
    return {
      background: '#FF2A2A',
      border: '1px solid #FF2A2A',
      color: '#FFFFFF',
      borderRadius: '9999px'
    };
  }
  if (normalized === 'admin') {
    return {
      background: '#FFFFFF',
      border: '1px solid #FFFFFF',
      color: '#0B0E14',
      borderRadius: '9999px'
    };
  }
  if (isSpktRole(normalized)) {
    return {
      background: 'rgba(245, 158, 11, 0.16)',
      border: '1px solid rgba(245, 158, 11, 0.55)',
      color: '#FBBF24',
      borderRadius: '9999px'
    };
  }
  return {
    background: '#131924',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#FFFFFF',
    borderRadius: '9999px'
  };
}
