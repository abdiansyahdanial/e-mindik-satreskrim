/**
 * Service Notifikasi Email E-Mindik (Resend Integration)
 * Kop Resmi Satreskrim Polres Kolaka Timur
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
    // 1. Prioritaskan serverless / dev API endpoint (/api/send-email)
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

    // 2. Direct Resend REST fallback jika API endpoint tidak terjangkau (dan API key tersedia)
    if (!RESEND_API_KEY) {
      return { success: false, reason: 'No VITE_RESEND_API_KEY for direct fallback' };
    }

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

    const kopHtml = `
      <div style="text-align: center; border-bottom: 2px solid #00D4FF; padding-bottom: 14px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase;">
          KEPOLISIAN NEGARA REPUBLIK INDONESIA<br/>
          DAERAH SULAWESI TENGGARA<br/>
          RESOR KOLAKA TIMUR
        </div>
        <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
          Jl. Poros Kolaka - Kendari, Tirawuta, Kab. Kolaka Timur, Sulawesi Tenggara
        </div>
        <div style="margin-top: 8px; height: 1px; background: rgba(0, 212, 255, 0.3);"></div>
        <div style="margin-top: 2px; height: 2px; background: #00D4FF;"></div>
      </div>
    `;

    if (type === 'NEW_REGISTRATION') {
      // Direct send to officer
      if (email && email.includes('@')) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `Satreskrim Polres Koltim <${EMAIL_FROM}>`,
            to: [email],
            subject: `[PEMBERITAHUAN] Pendaftaran Akun e-Mindik Satreskrim Diterima`,
            html: `
              <div style="font-family: Arial, sans-serif; background: #060B18; color: #E2E8F0; padding: 24px;">
                <div style="max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 10px; padding: 24px;">
                  ${kopHtml}
                  <h3 style="color: #00D4FF; margin-top: 0; text-transform: uppercase;">Pendaftaran Akun Berhasil Diterima</h3>
                  <p>Yth. <strong>${pangkat} ${nama}</strong> (NRP: ${nrp}),</p>
                  <p>Pendaftaran akun Anda pada sistem e-Mindik Satreskrim Polres Kolaka Timur telah diterima dan saat ini sedang menunggu verifikasi kedinasan oleh Super Admin.</p>
                </div>
              </div>
            `
          })
        }).catch(() => {});
      }

      // Direct send to superadmin
      if (SUPERADMIN_EMAIL) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `Satreskrim Polres Koltim <${EMAIL_FROM}>`,
            to: [SUPERADMIN_EMAIL],
            subject: `[VERIFIKASI AKUN] Pendaftaran Penyidik Baru - ${pangkat} ${nama}`,
            html: `
              <div style="font-family: Arial, sans-serif; background: #060B18; color: #E2E8F0; padding: 24px;">
                <div style="max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 10px; padding: 24px;">
                  ${kopHtml}
                  <h3 style="color: #FCD34D; margin-top: 0;">Pemberitahuan Pendaftaran Akun Penyidik Baru</h3>
                  <p><strong>Nama:</strong> ${pangkat} ${nama}</p>
                  <p><strong>NRP:</strong> ${nrp}</p>
                  <p><strong>Jabatan:</strong> ${jabatan} (${unit})</p>
                  <p><strong>Satker:</strong> ${satker}</p>
                  <p><strong>No. HP:</strong> ${phone}</p>
                  <p><strong>Email:</strong> ${email}</p>
                </div>
              </div>
            `
          })
        }).catch(() => {});
      }

      return { success: true, via: 'direct' };
    } else if (type === 'ACCOUNT_APPROVED') {
      if (email && email.includes('@')) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `Satreskrim Polres Koltim <${EMAIL_FROM}>`,
            to: [email],
            subject: `[AKTIVASI AKUN] Akun e-Mindik Anda Telah Diaktifkan - Satreskrim Polres Kolaka Timur`,
            html: `
              <div style="font-family: Arial, sans-serif; background: #060B18; color: #E2E8F0; padding: 24px;">
                <div style="max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #22C55E; border-radius: 10px; padding: 24px;">
                  ${kopHtml}
                  <h3 style="color: #4ADE80; margin-top: 0;">Selamat, Akun Anda Telah Diaktifkan!</h3>
                  <p>Yth. <strong>${pangkat} ${nama}</strong> (NRP: ${nrp}),</p>
                  <p>Identitas kedinasan Anda telah diverifikasi dan disetujui oleh Super Admin. Anda sekarang dapat masuk ke sistem e-Mindik.</p>
                  <p><strong>Email Login:</strong> ${email}</p>
                </div>
              </div>
            `
          })
        }).catch(() => {});
      }
      return { success: true, via: 'direct' };
    }

    return { success: false };
  } catch (err) {
    console.warn('[EmailService] Background email notice (handled):', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Kirim notifikasi email pendaftaran (baik ke pendaftar dan ke Super Admin)
 * Dijalankan non-blocking di background.
 */
export function sendRegistrationEmails(officerData) {
  setTimeout(() => {
    dispatchEmail({
      type: 'NEW_REGISTRATION',
      officer: officerData
    }).catch(err => console.warn('[EmailService] Background sendRegistrationEmails notice:', err));
  }, 50);
}

// Alias for backward compatibility
export const sendSuperadminNewUserEmail = sendRegistrationEmails;

/**
 * 2. Kirim notifikasi email ke penyidik saat Super Admin menekan persetujuan (Approve)
 * Dijalankan non-blocking di background.
 */
export function sendAccountApprovedEmail(officerData) {
  setTimeout(() => {
    dispatchEmail({
      type: 'ACCOUNT_APPROVED',
      officer: officerData
    }).catch(err => console.warn('[EmailService] Background sendAccountApprovedEmail notice:', err));
  }, 50);
}
