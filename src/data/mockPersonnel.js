// Mock personel Satreskrim Polres Kolaka Timur
export const mockPersonnel = [
  {
    id: 'usr-001',
    nama: 'IPTU Wahyu Hidayat, S.H.',
    pangkat: 'IPTU',
    nrp: '78120567',
    jabatan: 'KASAT RESKRIM',
    role: 'Kasat',
    phone: '081234567890',
  },
  {
    id: 'usr-002',
    nama: 'AIPTU Andi Firmansyah',
    pangkat: 'AIPTU',
    nrp: '85010234',
    jabatan: 'KANIT PPA',
    role: 'Kanit',
    phone: '081234567891',
  },
  {
    id: 'usr-003',
    nama: 'AIPDA Muh. Rizal Akbar',
    pangkat: 'AIPDA',
    nrp: '87050412',
    jabatan: 'PENYIDIK',
    role: 'Penyidik',
    phone: '081234567892',
  },
  {
    id: 'usr-004',
    nama: 'BRIPKA Sulfikar',
    pangkat: 'BRIPKA',
    nrp: '89070823',
    jabatan: 'PENYIDIK',
    role: 'Penyidik',
    phone: '081234567893',
  },
  {
    id: 'usr-005',
    nama: 'BRIPKA La Ode Muhamad Sahrul',
    pangkat: 'BRIPKA',
    nrp: '90011545',
    jabatan: 'PENYIDIK PEMBANTU',
    role: 'Penyidik',
    phone: '081234567894',
  },
  {
    id: 'usr-006',
    nama: 'AIPTU Samsul Bahri, S.H.',
    pangkat: 'AIPTU',
    nrp: '84030112',
    jabatan: 'KANIT IDIK I',
    role: 'Kanit',
    phone: '081234567895',
  },
  {
    id: 'usr-007',
    nama: 'AIPDA Irfan Saputra',
    pangkat: 'AIPDA',
    nrp: '88060789',
    jabatan: 'PENYIDIK',
    role: 'Penyidik',
    phone: '081234567896',
  },
  {
    id: 'usr-008',
    nama: 'BRIPKA Haerul Anwar',
    pangkat: 'BRIPKA',
    nrp: '91020345',
    jabatan: 'PENYIDIK',
    role: 'Penyidik',
    phone: '081234567897',
  },
  {
    id: 'usr-009',
    nama: 'BRIGPOL Ahmad Dani',
    pangkat: 'BRIGPOL',
    nrp: '93040567',
    jabatan: 'PENYIDIK PEMBANTU',
    role: 'Penyidik',
    phone: '081234567898',
  },
  {
    id: 'usr-010',
    nama: 'BRIGPOL Wa Ode Fitriani',
    pangkat: 'BRIGPOL',
    nrp: '94050678',
    jabatan: 'PENYIDIK PEMBANTU',
    role: 'Penyidik',
    phone: '081234567899',
  },
  {
    id: 'usr-011',
    nama: 'AIPTU Harun Al Rasyid, S.H.',
    pangkat: 'AIPTU',
    nrp: '83020190',
    jabatan: 'KANIT IDIK II',
    role: 'Kanit',
    phone: '081234567800',
  },
  {
    id: 'usr-012',
    nama: 'AIPDA La Ode Arman',
    pangkat: 'AIPDA',
    nrp: '86090234',
    jabatan: 'PENYIDIK',
    role: 'Penyidik',
    phone: '081234567801',
  },
];

// Helper: get personnel by ID
export function getPersonnelById(id) {
  return mockPersonnel.find((p) => p.id === id) || null;
}

// Helper: get display name with rank
export function getDisplayName(person) {
  if (!person) return '-';
  return `${person.pangkat} ${person.nama.replace(/^(IPTU|AIPTU|AIPDA|BRIPKA|BRIGPOL|KOMPOL|AKP)\s*/i, '')}`;
}
