import { useEffect, useRef } from 'react'
import './LoginPage.css'

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

// Animated constellation of dots in the background
function Constellation() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let w, h

    const resize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 55
    const dots = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.8 + 0.5,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      // Connect nearby dots
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(132,210,150,${0.18 * (1 - dist / 130)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      // Draw dots
      for (const d of dots) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(132,210,150,0.55)'
        ctx.fill()
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="constellation-canvas" aria-hidden="true" />
}

export default function LoginPage() {
  const handleSignIn = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      window.location.href = 'http://localhost:8080/api/v1/auth/login'
    } else {
      window.location.href = '/api/v1/auth/login'
    }
  }


  return (
    <div className="login-shell" role="main">
      <Constellation />

      {/* Ambient glow orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />

      <div className="login-card" role="dialog" aria-label="Sign in to RecruitIngest">
        {/* Logo */}
        <div className="login-logo" aria-hidden="true">
          <div className="login-brand-mark">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="login-header">
          <h1 className="login-title">
            Recruit<span>Ingest</span>
          </h1>
          <p className="login-subtitle">
            AI-powered recruiter intelligence platform
          </p>
        </div>

        <div className="login-divider" aria-hidden="true">
          <span />
          <small>Sign in to continue</small>
          <span />
        </div>

        <button
          id="google-signin-btn"
          className="google-signin-btn"
          type="button"
          onClick={handleSignIn}
          aria-label="Sign in with Google"
        >
          <span className="google-btn-icon">
            <GoogleIcon />
          </span>
          <span>Continue with Google</span>
        </button>

        <p className="login-access-note" role="note">
          <ShieldIcon />
          Access restricted to approved testers
        </p>

        <p className="login-hint">
          Not approved yet? Contact the admin to be added as a tester in the GCP console.
        </p>
      </div>

      <p className="login-footer-text" aria-label="Copyright">
        © 2026 RecruitIngest · orbitary.ai
      </p>
    </div>
  )
}
