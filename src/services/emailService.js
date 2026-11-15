/**
 * Service Notifikasi Email E-Mindik (Serverless Resend Integration)
 * Kop Resmi Satreskrim Polres Kolaka Timur
 * 
 * BATASAN KETAT:
 * Pengiriman email WAJIB melalui endpoint serverless (/api/send-email) secara asynchronous
 * (background process) non-blocking tanpa mengekspos API key di sisi frontend.
 */

import { getSupabaseAuthHeaders } from '../supabaseClient.js';

/**
 * Dispatch email via backend serverless API (/api/send-email).
 * Guaranteed never to throw or block caller execution.
 */
async function dispatchEmail(payload) {
  try {
    const headers = await getSupabaseAuthHeaders({ 'Content-Type': 'application/json' });
    const resp = await fetch('/api/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      const result = await resp.json();
      console.log('[EmailService] Email successfully dispatched via /api/send-email:', result);
      return { success: true, via: 'api', data: result };
    }

    const errText = await resp.text().catch(() => '');
    console.warn(`[EmailService] /api/send-email returned status ${resp.status}:`, errText);
    return { success: false, status: resp.status, error: errText };
  } catch (err) {
    console.warn('[EmailService] Background email notice (offline/unreachable):', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Kirim notifikasi email pendaftaran (baik ke pendaftar dan ke Super Admin)
 * Dijalankan non-blocking di background melalui /api/send-email.
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
 * Dijalankan non-blocking di background melalui /api/send-email.
 */
export function sendAccountApprovedEmail(officerData) {
  setTimeout(() => {
    dispatchEmail({
      type: 'ACCOUNT_APPROVED',
      officer: officerData
    }).catch(err => console.warn('[EmailService] Background sendAccountApprovedEmail notice:', err));
  }, 50);
}

