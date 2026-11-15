import React, { useEffect } from 'react';
import { ShieldAlert, Clock, X } from 'lucide-react';

/**
 * AuthAlertModal - Modern In-Place Alert Modal for Satreskrim E-Mindik
 * Styled with Dark Charcoal Slate background, glowing red accents, and smooth transitions.
 */
export default function AuthAlertModal({
  isOpen,
  onClose,
  type = 'login_pending', // 'login_pending' | 'register_success'
  title,
  message,
  duration = 0, // Duration in ms before auto-closing (0 = manual only)
  showConfirmButton = false,
  confirmText = 'Mengerti'
}) {
  useEffect(() => {
    if (!isOpen || !duration) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const isPending = type === 'login_pending';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 15, 20, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
        animation: 'authModalFadeIn 0.25s ease-out forwards'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && showConfirmButton) onClose();
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #161310 0%, #1E1915 100%)',
          border: '1px solid rgba(251, 219, 175, 0.16)',
          borderRadius: '20px',
          maxWidth: '440px',
          width: '100%',
          padding: '32px 28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 38px rgba(224, 112, 32, 0.22)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'authModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top subtle red gradient accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #C45A18 0%, #FF5A1F 50%, #C45A18 100%)',
            boxShadow: '0 0 12px rgba(255, 90, 31, 0.6)'
          }}
        />

        {/* Close icon button if interactive */}
        {showConfirmButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup notifikasi"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(251, 219, 175, 0.65)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Glowing Icon Badge */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(224, 112, 32, 0.24) 0%, rgba(196, 90, 24, 0.08) 100%)',
            border: '2px solid rgba(255, 90, 31, 0.55)',
            boxShadow: '0 0 25px rgba(224, 112, 32, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            position: 'relative'
          }}
        >
          {isPending ? (
            <ShieldAlert size={36} color="#FF5A1F" />
          ) : (
            <Clock size={36} color="#FF5A1F" />
          )}
        </div>

        {/* Modal Title */}
        <h3
          className="heading-font"
          style={{
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 700,
            margin: '0 0 12px',
            letterSpacing: '0.04em',
            lineHeight: 1.35,
          }}
        >
          {title}
        </h3>

        {/* Modal Body Message */}
        <p
          style={{
            color: '#FBDBAF',
            fontSize: '13.5px',
            lineHeight: 1.65,
            margin: '0 0 24px',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {message}
        </p>

        {/* Auto-closing Countdown Progress Bar */}
        {duration > 0 && (
          <div
            style={{
              width: '100%',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: showConfirmButton ? '18px' : '4px'
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #C45A18, #FF5A1F)',
                width: '100%',
                animation: `authCountdown ${duration}ms linear forwards`,
                boxShadow: '0 0 8px rgba(255, 90, 31, 0.55)'
              }}
            />
          </div>
        )}

        {/* Action Button */}
        {showConfirmButton && (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: '#E07020',
              border: 'none',
              borderRadius: '9999px',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.3px',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(224, 112, 32, 0.35)',
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = '#0E0C0A';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#E07020';
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        )}
      </div>

      <style>{`
        @keyframes authModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes authModalScaleUp {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes authCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
