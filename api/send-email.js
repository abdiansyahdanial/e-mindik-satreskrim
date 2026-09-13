import { Resend } from 'resend';

/**
 * Serverless / Dev API Handler for sending automated Resend emails
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

    if (type === 'NEW_REGISTRATION') {
      // 1. Send email to Super Admin
      const subject = `[VERIFIKASI AKUN] Pendaftaran Penyidik Baru - ${pangkat} ${nama}`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #060B18; color: #E2E8F0; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { background: linear-gradient(135deg, #0A192F 0%, #0F172A 100%); border-bottom: 2px solid #00D4FF; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; color: #00D4FF; letter-spacing: 1px; text-transform: uppercase; }
            .header p { margin: 6px 0 0; font-size: 12px; color: #94A3B8; }
            .badge { display: inline-block; background: rgba(0, 212, 255, 0.15); color: #00D4FF; border: 1px solid #00D4FF; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; margin-top: 10px; }
            .content { padding: 28px 24px; }
            .alert-box { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; color: #FCD34D; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13.5px; }
            td { padding: 10px 12px; border-bottom: 1px solid #1E293B; }
            td.label { color: #94A3B8; width: 38%; font-weight: 600; }
            td.value { color: #F8FAFC; font-weight: 500; }
            .footer { padding: 20px 24px; background: #080E1D; border-top: 1px solid #1E293B; text-align: center; font-size: 11.5px; color: #64748B; }
            .btn { display: inline-block; background: #00D4FF; color: #030712; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 13px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>E-MINDIK SATRESKRIM</h1>
              <p>Kepolisian Resor Kolaka Timur</p>
              <div class="badge">NOTIFIKASI PENDAFTARAN PENYIDIK</div>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>Perhatian Super Admin:</strong> Personel baru telah melakukan registrasi mandiri dan menunggu verifikasi kedinasan Anda.
              </div>
              <table>
                <tr>
                  <td class="label">Nama Lengkap & Gelar</td>
                  <td class="value"><strong>${nama}</strong></td>
                </tr>
                <tr>
                  <td class="label">Pangkat</td>
                  <td class="value">${pangkat}</td>
                </tr>
                <tr>
                  <td class="label">NRP</td>
                  <td class="value" style="font-family: monospace;">${nrp}</td>
                </tr>
                <tr>
                  <td class="label">Jabatan Dinas</td>
                  <td class="value">${jabatan}</td>
                </tr>
                <tr>
                  <td class="label">Unit Kerja</td>
                  <td class="value">${unit || 'Belum Ditentukan'}</td>
                </tr>
                <tr>
                  <td class="label">Satuan Kerja</td>
                  <td class="value">${satker}</td>
                </tr>
                <tr>
                  <td class="label">No. WhatsApp / HP</td>
                  <td class="value">${phone}</td>
                </tr>
                <tr>
                  <td class="label">Email Terdaftar</td>
                  <td class="value">${email}</td>
                </tr>
                <tr>
                  <td class="label">Waktu Pendaftaran</td>
                  <td class="value">${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA</td>
                </tr>
              </table>
              <div style="text-align: center;">
                <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">Silakan masuk ke aplikasi E-Mindik dengan akun Super Admin untuk menyetujui akun ini.</p>
              </div>
            </div>
            <div class="footer">
              Sistem Manajemen Administrasi Penyidikan Elektronik (E-Mindik)<br/>
              Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
            </div>
          </div>
        </body>
        </html>
      `;

      const data = await resend.emails.send({
        from: `E-Mindik Satreskrim <${EMAIL_FROM}>`,
        to: [SUPERADMIN_EMAIL],
        subject,
        html: htmlContent,
      });

      res.status(200).json({ success: true, data, message: 'Email sent to superadmin' });
      return;

    } else if (type === 'ACCOUNT_APPROVED') {
      // 2. Send email to approved Officer
      const subject = `Akun e-Mindik Anda Telah Diaktifkan`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #060B18; color: #E2E8F0; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { background: linear-gradient(135deg, #0A192F 0%, #0F172A 100%); border-bottom: 2px solid #22C55E; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; color: #22C55E; letter-spacing: 1px; text-transform: uppercase; }
            .header p { margin: 6px 0 0; font-size: 12px; color: #94A3B8; }
            .badge { display: inline-block; background: rgba(34, 197, 94, 0.15); color: #22C55E; border: 1px solid #22C55E; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; margin-top: 10px; }
            .content { padding: 28px 24px; }
            .success-card { background: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
            .success-card h2 { margin: 0 0 8px; font-size: 17px; color: #4ADE80; }
            .success-card p { margin: 0; font-size: 13px; color: #CBD5E1; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13.5px; }
            td { padding: 9px 12px; border-bottom: 1px solid #1E293B; }
            td.label { color: #94A3B8; width: 38%; font-weight: 600; }
            td.value { color: #F8FAFC; font-weight: 500; }
            .footer { padding: 20px 24px; background: #080E1D; border-top: 1px solid #1E293B; text-align: center; font-size: 11.5px; color: #64748B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>E-MINDIK SATRESKRIM</h1>
              <p>Kepolisian Resor Kolaka Timur</p>
              <div class="badge">KONFIRMASI AKTIVASI AKUN</div>
            </div>
            <div class="content">
              <div class="success-card">
                <h2>Selamat, Akun Dinas Anda Telah Aktif!</h2>
                <p>Verifikasi identitas kedinasan Anda telah disetujui oleh Super Admin Satreskrim Polres Kolaka Timur.</p>
              </div>
              <p style="font-size: 13px; line-height: 1.6; color: #94A3B8;">
                Yth. <strong>${pangkat} ${nama}</strong> (NRP: ${nrp}),<br/>
                Kini Anda telah memiliki akses penuh ke sistem E-Mindik untuk pencatatan berkas perkara, pembuatan administrasi penyidikan presisi, dan manajemen perkara pidana.
              </p>
              <table>
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
                  <td class="label">Email Login</td>
                  <td class="value">${email}</td>
                </tr>
              </table>
              <div style="text-align: center; margin-top: 28px;">
                <p style="font-size: 12.5px; color: #CBD5E1;">Silakan buka portal E-Mindik dan masuk menggunakan email serta kata sandi yang telah Anda daftarkan.</p>
              </div>
            </div>
            <div class="footer">
              Sistem Manajemen Administrasi Penyidikan Elektronik (E-Mindik)<br/>
              Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
            </div>
          </div>
        </body>
        </html>
      `;

      const data = await resend.emails.send({
        from: `E-Mindik Satreskrim <${EMAIL_FROM}>`,
        to: [email],
        subject,
        html: htmlContent,
      });

      res.status(200).json({ success: true, data, message: 'Email sent to officer' });
      return;
    } else {
      res.status(400).json({ error: 'Unknown email notification type' });
      return;
    }
  } catch (err) {
    console.error('Resend email error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}
