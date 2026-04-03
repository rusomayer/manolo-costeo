'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleGoogleLogin() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    const supabase = createClient();
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Revisá tu email para confirmar la cuenta.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = nextUrl;
      }
    }

    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={{ fontSize: 48 }}>&#9749;</span>
          <h1 style={styles.title}>Manolo Costeo</h1>
          <p style={styles.subtitle}>Registra y controla los gastos de tu local</p>
        </div>

        <button onClick={handleGoogleLogin} style={styles.googleBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>o</span>
        </div>

        <form onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesion'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}

        <p style={styles.toggle}>
          {isSignUp ? 'Ya tenes cuenta?' : 'No tenes cuenta?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
            style={styles.toggleBtn}
          >
            {isSignUp ? 'Iniciar sesion' : 'Crear cuenta'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'var(--bg-secondary)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius)',
    padding: 32,
    border: '1px solid var(--border)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 8,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  googleBtn: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  divider: {
    position: 'relative' as const,
    textAlign: 'center' as const,
    margin: '24px 0',
    borderTop: '1px solid var(--border)',
  },
  dividerText: {
    position: 'relative' as const,
    top: -10,
    background: 'var(--bg-primary)',
    padding: '0 12px',
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    marginTop: 16,
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: '#dc35451a',
    color: 'var(--danger)',
    fontSize: 13,
  },
  success: {
    marginTop: 16,
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: '#1987541a',
    color: 'var(--success)',
    fontSize: 13,
  },
  toggle: {
    marginTop: 20,
    textAlign: 'center' as const,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  },
};
