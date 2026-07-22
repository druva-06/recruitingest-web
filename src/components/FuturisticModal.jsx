import React from 'react';

export function FuturisticModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  loading = false,
}) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      accentColor: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.12)',
      badgeBorder: 'rgba(239, 68, 68, 0.25)',
      buttonBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      buttonShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
      icon: '🗑️',
    },
    warning: {
      accentColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      badgeBorder: 'rgba(245, 158, 11, 0.25)',
      buttonBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      buttonShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
      icon: '⚠️',
    },
    info: {
      accentColor: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.12)',
      badgeBorder: 'rgba(59, 130, 246, 0.25)',
      buttonBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      buttonShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
      icon: '🔄',
    },
    success: {
      accentColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      badgeBorder: 'rgba(16, 185, 129, 0.25)',
      buttonBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      buttonShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
      icon: '✅',
    },
  };

  const style = typeStyles[type] || typeStyles.danger;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(10, 15, 30, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'futuristicFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px 24px 24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)',
          animation: 'futuristicPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Futuristic Top Glowing Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: style.buttonBg,
          }}
        />

        {/* Icon & Content */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px',
              borderRadius: '16px',
              background: style.badgeBg,
              border: `1px solid ${style.badgeBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
            }}
          >
            {style.icon}
          </div>

          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '19px',
              fontWeight: '700',
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.55',
              color: '#64748b',
              whiteSpace: 'pre-line',
            }}
          >
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            marginTop: '26px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          {cancelText && (
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '11px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#f8fafc';
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: '12px',
              border: 'none',
              background: style.buttonBg,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: style.buttonShadow,
              transition: 'all 0.15s ease',
              opacity: loading ? 0.8 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'futuristicSpin 0.7s linear infinite',
                  }}
                />
                Processing…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes futuristicFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes futuristicPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes futuristicSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
