import { Resend } from 'resend';

/**
 * Serverless / Dev API Handler for sending automated Resend emails
 * Official Police Theme (Kop Surat Kedinasan Satreskrim Polres Kolaka Timur)
 */
export default async function handler(req, res) {
  // Allow POST requests only
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'abdiansyahdanial@gmail.com';
  const EMAIL_FROM = process.env.EMAIL_FROM || process.env.VITE_EMAIL_FROM || 'onboarding@resend.dev';

  if (!RESEND_API_KEY) {
    console.warn('[send-email] RESEND_API_KEY is not defined in environment variables.');
    res.status(500).json({ error: 'RESEND_API_KEY is not defined in environment variables.' });
    return;
  }

  let resend;
  try {
    resend = new Resend(RESEND_API_KEY);
  } catch (err) {
    console.error('[send-email] Resend constructor error:', err);
    res.status(500).json({ error: err.message });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { type, officer } = body || {};

    if (!officer) {
      res.status(400).json({ error: 'Missing officer data in request body' });
      return;
    }

    const {
      nama = 'Personel Penyidik',
      pangkat = '-',
      nrp = '-',
      jabatan = '-',
      satker = 'Satreskrim Polres Kolaka Timur',
      unit = '-',
      phone = '-',
      email = '-',
    } = officer;

    const waktuWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA';

    // Helper: Kop Surat Dinas Resmi
    const kopHeaderHtml = `
      <div style="text-align: center; border-bottom: 2px solid #00D4FF; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase; line-height: 1.5;">
          KEPOLISIAN NEGARA REPUBLIK INDONESIA<br/>
          DAERAH SULAWESI TENGGARA<br/>
          RESOR KOLAKA TIMUR
        </div>
        <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
          Jl. Poros Kolaka - Kendari, Tirawuta, Kab. Kolaka Timur, Sulawesi Tenggara
        </div>
        <div style="margin-top: 10px; height: 1px; background: rgba(0, 212, 255, 0.3);"></div>
        <div style="margin-top: 2px; height: 2px; background: #00D4FF;"></div>
      </div>
    `;

    // 1. Tipe: Pendaftaran Akun Baru (Kirim ke Penyidik & Super Admin)
    if (type === 'NEW_REGISTRATION' || type === 'REGISTRATION_OFFICER') {
      const results = [];

      // Email a: Pemberitahuan ke Penyidik yang Mendaftar
      if (email && email.includes('@')) {
        const subjectOfficer = `[PEMBERITAHUAN] Pendaftaran Akun e-Mindik Satreskrim Diterima`;
        const htmlOfficer = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #060B18; color: #E2E8F0; margin: 0; padding: 24px; }
              .container { max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
              .content { padding: 28px 24px; }
              .card-info { background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.3); padding: 16px; border-radius: 8px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
              td { padding: 9px 12px; border-bottom: 1px solid #1E293B; }
              td.label { color: #94A3B8; width: 38%; font-weight: 600; }
              td.value { color: #F8FAFC; font-weight: 500; }
              .footer { padding: 18px 24px; background: #080E1D; border-top: 1px solid #1E293B; text-align: center; font-size: 11px; color: #64748B; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                ${kopHeaderHtml}
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #00D4FF; font-size: 18px; margin: 0 0 6px; letter-spacing: 0.5px; text-transform: uppercase;">
                    Pendaftaran Akun Berhasil Diterima
                  </h2>
                  <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid #F59E0B; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                    STATUS: MENUNGGU VERIFIKASI ADMIN
                  </div>
                </div>

                <p style="font-size: 13px; line-height: 1.6; color: #CBD5E1;">
                  Yth. <strong>${pangkat} ${nama}</strong>,<br/>
                  Pendaftaran akun dinas Anda pada sistem administrasi penyidikan <strong>e-Mindik Satreskrim Polres Kolaka Timur</strong> telah berhasil dicatat. Saat ini berkas registrasi Anda sedang dalam antrean peninjauan kedinasan oleh Super Admin / Kasat Reskrim.
                </p>

                <div class="card-info">
                  <strong style="color: #00D4FF; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Rincian Identitas Terdaftar:</strong>
                  <table>
                    <tr>
                      <td class="label">Nama Lengkap</td>
                      <td class="value">${pangkat} ${nama}</td>
                    </tr>
                    <tr>
                      <td class="label">NRP</td>
                      <td class="value" style="font-family: monospace; color: #00D4FF;">${nrp}</td>
                    </tr>
                    <tr>
                      <td class="label">Jabatan Dinas</td>
                      <td class="value">${jabatan}</td>
                    </tr>
                    <tr>
                      <td class="label">Unit Kerja</td>
                      <td class="value">${unit || 'Satreskrim'}</td>
                    </tr>
                    <tr>
                      <td class="label">Satuan Kerja</td>
                      <td class="value">${satker}</td>
                    </tr>
                    <tr>
                      <td class="label">Email Terdaftar</td>
                      <td class="value">${email}</td>
                    </tr>
                    <tr>
                      <td class="label">Waktu Pendaftaran</td>
                      <td class="value">${waktuWita}</td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 12px; line-height: 1.6; color: #94A3B8;">
                  Setelah permohonan disetujui, Anda akan menerima email notifikasi resmi bahwa akun telah aktif dan siap digunakan untuk manajemen perkara dan pencetakan dokumen mindik presisi.
                </p>
              </div>
              <div class="footer">
                Sistem Informasi Manajemen Administrasi Penyidikan Elektronik (e-Mindik)<br/>
                Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const resOfficer = await resend.emails.send({
            from: `Satreskrim Polres Koltim <${EMAIL_FROM}>`,
            to: [email],
            subject: subjectOfficer,
            html: htmlOfficer
          });
          results.push({ target: 'officer', res: resOfficer });
        } catch (e1) {
          console.warn('[send-email] Warning sending to officer:', e1.message);
        }
      }

      // Email b: Notifikasi ke Super Admin
      if (SUPERADMIN_EMAIL) {
        const subjectAdmin = `[VERIFIKASI AKUN] Pendaftaran Penyidik Baru - ${pangkat} ${nama}`;
        const htmlAdmin = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #060B18; color: #E2E8F0; margin: 0; padding: 24px; }
              .container { max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
              .content { padding: 28px 24px; }
              .alert-box { background: rgba(245, 158, 11, 0.12); border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; color: #FCD34D; font-size: 13px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
              td { padding: 9px 12px; border-bottom: 1px solid #1E293B; }
              td.label { color: #94A3B8; width: 38%; font-weight: 600; }
              td.value { color: #F8FAFC; font-weight: 500; }
              .footer { padding: 18px 24px; background: #080E1D; border-top: 1px solid #1E293B; text-align: center; font-size: 11px; color: #64748B; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                ${kopHeaderHtml}
                <div class="alert-box">
                  <strong>Pemberitahuan Super Admin:</strong> Terdapat personel baru yang mendaftar dan menunggu verifikasi kedinasan Anda.
                </div>
                <table>
                  <tr>
                    <td class="label">Nama Personel</td>
                    <td class="value"><strong>${nama}</strong></td>
                  </tr>
                  <tr>
                    <td class="label">Pangkat</td>
                    <td class="value">${pangkat}</td>
                  </tr>
                  <tr>
                    <td class="label">NRP</td>
                    <td class="value" style="font-family: monospace; color: #00D4FF;">${nrp}</td>
                  </tr>
                  <tr>
                    <td class="label">Jabatan</td>
                    <td class="value">${jabatan}</td>
                  </tr>
                  <tr>
                    <td class="label">Unit Kerja</td>
                    <td class="value">${unit || 'Satreskrim'}</td>
                  </tr>
                  <tr>
                    <td class="label">Satuan Kerja</td>
                    <td class="value">${satker}</td>
                  </tr>
                  <tr>
                    <td class="label">No. Handphone / WA</td>
                    <td class="value">${phone}</td>
                  </tr>
                  <tr>
                    <td class="label">Email</td>
                    <td class="value">${email}</td>
                  </tr>
                  <tr>
                    <td class="label">Waktu Registrasi</td>
                    <td class="value">${waktuWita}</td>
                  </tr>
                </table>
                <div style="text-align: center; margin-top: 24px;">
                  <p style="font-size: 12px; color: #94A3B8;">Buka portal e-Mindik dan buka modal <strong>Manajemen Akun (RBAC)</strong> untuk menyetujui akun ini.</p>
                </div>
              </div>
              <div class="footer">
                Sistem Informasi Manajemen Administrasi Penyidikan Elektronik (e-Mindik)<br/>
                Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const resAdmin = await resend.emails.send({
            from: `Satreskrim Polres Koltim <${EMAIL_FROM}>`,
            to: [SUPERADMIN_EMAIL],
            subject: subjectAdmin,
            html: htmlAdmin
          });
          results.push({ target: 'admin', res: resAdmin });
        } catch (e2) {
          console.warn('[send-email] Warning sending to superadmin:', e2.message);
        }
      }

      res.status(200).json({ success: true, results, message: 'Registration emails processed' });
      return;

    // 2. Tipe: Akun Telah Disetujui Super Admin
    } else if (type === 'ACCOUNT_APPROVED') {
      const subjectApproved = `[AKTIVASI AKUN] Akun e-Mindik Anda Telah Diaktifkan - Satreskrim Polres Kolaka Timur`;
      const htmlApproved = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #060B18; color: #E2E8F0; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
            .content { padding: 28px 24px; }
            .success-card { background: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; padding: 18px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
            .success-card h2 { margin: 0 0 6px; font-size: 18px; color: #4ADE80; text-transform: uppercase; letter-spacing: 0.5px; }
            .success-card p { margin: 0; font-size: 13px; color: #CBD5E1; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
            td { padding: 9px 12px; border-bottom: 1px solid #1E293B; }
            td.label { color: #94A3B8; width: 38%; font-weight: 600; }
            td.value { color: #F8FAFC; font-weight: 500; }
            .btn { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #0096FF 100%); color: #030712; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; margin-top: 24px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.35); }
            .footer { padding: 18px 24px; background: #080E1D; border-top: 1px solid #1E293B; text-align: center; font-size: 11px; color: #64748B; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              ${kopHeaderHtml}
              <div class="success-card">
                <h2>Selamat, Akun Dinas Anda Telah Aktif!</h2>
                <p>Verifikasi identitas kedinasan Anda telah disetujui secara resmi oleh Super Admin.</p>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #CBD5E1;">
                Yth. <strong>${pangkat} ${nama}</strong> (NRP: ${nrp}),<br/>
                Kini Anda telah memiliki wewenang penuh untuk masuk ke dalam sistem <strong>e-Mindik Satreskrim Polres Kolaka Timur</strong>. Anda dapat mulai mengelola berkas perkara pidana, menyusun administrasi penyidikan standar, dan mencetak dokumen presisi.
              </p>

              <table>
                <tr>
                  <td class="label">Nama Personel</td>
                  <td class="value">${pangkat} ${nama}</td>
                </tr>
                <tr>
                  <td class="label">NRP</td>
                  <td class="value" style="font-family: monospace; color: #00D4FF;">${nrp}</td>
                </tr>
                <tr>
                  <td class="label">Jabatan Dinas</td>
                  <td class="value">${jabatan}</td>
                </tr>
                <tr>
                  <td class="label">Unit Kerja</td>
                  <td class="value">${unit || 'Satreskrim'}</td>
                </tr>
                <tr>
                  <td class="label">Satuan Kerja</td>
                  <td class="value">${satker}</td>
                </tr>
                <tr>
                  <td class="label">Email Login</td>
                  <td class="value">${email}</td>
                </tr>
                <tr>
                  <td class="label">Status Akun</td>
                  <td class="value" style="color: #4ADE80; font-weight: 700;">AKTIF / TERVERIFIKASI</td>
                </tr>
              </table>

              <div style="text-align: center;">
                <p style="font-size: 12px; color: #94A3B8; margin-top: 20px;">
                  Silakan masuk menggunakan email dan kata sandi yang telah Anda daftarkan.
                </p>
              </div>
            </div>
            <div class="footer">
              Sistem Informasi Manajemen Administrasi Penyidikan Elektronik (e-Mindik)<br/>
              Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
            </div>
          </div>
        </body>
        </html>
      `;

      const data = await resend.emails.send({
        from: `Satreskrim Polres Koltim <${EMAIL_FROM}>`,
        to: [email],
        subject: subjectApproved,
        html: htmlApproved
      });

      res.status(200).json({ success: true, data, message: 'Activation email sent to officer' });
      return;
    } else {
      res.status(400).json({ error: 'Unknown email notification type' });
      return;
    }
  } catch (err) {
    console.error('[send-email] Error handling email dispatch:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch email' });
  }
}
