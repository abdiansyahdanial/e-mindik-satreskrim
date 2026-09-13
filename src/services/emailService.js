/**
 * Service Notifikasi Email E-Mindik (Resend Integration)
 * 
 * BATASAN KETAT:
 * Pengiriman email WAJIB asynchronous (background process) non-blocking
 * agar aplikasi tidak pernah hang/freeze meskipun jaringan lambat atau offline.
 */

const RESEND_API_KEY = import.meta.env?.VITE_RESEND_API_KEY;
const SUPERADMIN_EMAIL = import.meta.env?.VITE_SUPERADMIN_EMAIL || 'abdiansyahdanial@gmail.com';
const EMAIL_FROM = import.meta.env?.VITE_EMAIL_FROM || 'onboarding@resend.dev';

/**
 * Dispatch email via backend API (/api/send-email) with direct Resend REST fallback.
 * Guaranteed never to throw or block caller execution.
 */
async function dispatchEmail(payload) {
  try {
    // 1. Try local dev middleware / serverless function endpoint first
    try {
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const result = await resp.json();
        console.log('[EmailService] Email successfully dispatched via /api/send-email:', result);
        return { success: true, via: 'api' };
      }
    } catch (apiErr) {
      console.warn('[EmailService] /api/send-email not reachable, attempting direct fallback...', apiErr.message);
    }

    // 2. Fallback to direct Resend API call if needed (e.g., pure static preview)
    const { type, officer } = payload;
    const {
      nama = 'Penyidik Satreskrim',
      pangkat = '-',
      nrp = '-',
      jabatan = '-',
      satker = 'Satreskrim Polres Kolaka Timur',
      unit = '-',
      phone = '-',
      email = ''
    } = officer || {};

    let to = SUPERADMIN_EMAIL;
    let subject = `[VERIFIKASI AKUN] Pendaftaran Penyidik Baru - ${pangkat} ${nama}`;
    let html = '';

    if (type === 'NEW_REGISTRATION') {
      to = SUPERADMIN_EMAIL;
      subject = `[VERIFIKASI AKUN] Pendaftaran Penyidik Baru - ${pangkat} ${nama}`;
      html = `
        <div style="font-family: Arial, sans-serif; background: #060B18; color: #E2E8F0; padding: 24px;">
          <div style="max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 10px; padding: 24px;">
            <h2 style="color: #00D4FF; margin-top: 0;">E-MINDIK SATRESKRIM POLRES KOLAKA TIMUR</h2>
            <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid #00D4FF; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
              <strong>Pemberitahuan:</strong> Pendaftaran akun penyidik baru memerlukan persetujuan Super Admin.
            </div>
            <p><strong>Nama:</strong> ${nama}</p>
            <p><strong>Pangkat:</strong> ${pangkat}</p>
            <p><strong>NRP:</strong> ${nrp}</p>
            <p><strong>Jabatan:</strong> ${jabatan}</p>
            <p><strong>Unit:</strong> ${unit}</p>
            <p><strong>Satker:</strong> ${satker}</p>
            <p><strong>No. HP/WA:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email}</p>
          </div>
        </div>
      `;
    } else if (type === 'ACCOUNT_APPROVED') {
      to = email;
      subject = `Akun e-Mindik Anda Telah Diaktifkan`;
      html = `
        <div style="font-family: Arial, sans-serif; background: #060B18; color: #E2E8F0; padding: 24px;">
          <div style="max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #22C55E; border-radius: 10px; padding: 24px;">
            <h2 style="color: #22C55E; margin-top: 0;">E-MINDIK SATRESKRIM POLRES KOLAKA TIMUR</h2>
            <h3 style="color: #4ADE80;">Akun Anda Telah Diaktifkan!</h3>
            <p>Yth. <strong>${pangkat} ${nama}</strong> (NRP: ${nrp}),</p>
            <p>Identitas kedinasan Anda telah diverifikasi dan disetujui oleh Super Admin. Anda sekarang dapat masuk ke sistem E-Mindik.</p>
            <p><strong>Email Login:</strong> ${email}</p>
          </div>
        </div>
      `;
    }

    if (to && RESEND_API_KEY) {
      const resendDirect = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `E-Mindik Satreskrim <${EMAIL_FROM}>`,
          to: [to],
          subject,
          html
        })
      });

      if (resendDirect.ok) {
        console.log('[EmailService] Email successfully sent via direct Resend REST API');
        return { success: true, via: 'direct' };
      }
    }

    return { success: false };
  } catch (err) {
    // Non-destructive: log error silently without crashing application
    console.warn('[EmailService] Background email notice (handled):', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Kirim notifikasi email ke SUPERADMIN_EMAIL saat personel baru mendaftar
 * Dijalankan non-blocking di background.
 */
export function sendSuperadminNewUserEmail(officerData) {
  // Fire-and-forget background execution
  setTimeout(() => {
    dispatchEmail({
      type: 'NEW_REGISTRATION',
      officer: officerData
    }).catch(err => console.warn('[EmailService] Background sendSuperadminNewUserEmail notice:', err));
  }, 50);
}

/**
 * 2. Kirim notifikasi email ke penyidik saat Super Admin menekan persetujuan (Approve)
 * Dijalankan non-blocking di background.
 */
export function sendAccountApprovedEmail(officerData) {
  // Fire-and-forget background execution
  setTimeout(() => {
    dispatchEmail({
      type: 'ACCOUNT_APPROVED',
      officer: officerData
    }).catch(err => console.warn('[EmailService] Background sendAccountApprovedEmail notice:', err));
  }, 50);
}
