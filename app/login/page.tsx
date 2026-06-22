'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap } from 'lucide-react';
import { useAuth, apiUrl } from '../providers';
import { useT, LanguageSwitcher } from '../i18n';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t, locale } = useT();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? 'login' : 'register';
      const res = await fetch(`${apiUrl()}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      await refresh();
      router.push('/');
    } catch {
      setError(t('login.networkError'));
      setLoading(false);
    }
  };

  const social = (provider: 'google' | 'vk') => {
    window.location.href = `${apiUrl()}/api/auth/${provider}`;
  };

  const inputCls =
    'w-full bg-panel border border-white/10 rounded-xl px-4 py-3 text-fg placeholder-fg-faint focus:outline-none focus:border-brand transition-colors';

  return (
    <div className="min-h-screen bg-ink text-fg font-sans flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center glow-brand">
            <Zap className="text-brand-ink fill-brand-ink" size={20} />
          </div>
          <span className="text-2xl font-bold tracking-tight">Shoom</span>
        </div>
        <p className="text-fg-muted text-center mb-8 text-sm">
          {mode === 'login' ? t('login.welcomeBack') : t('login.join')}
        </p>

        {/* Social */}
        <div className="space-y-2.5 mb-5">
          <button
            onClick={() => social('google')}
            className="w-full flex items-center justify-center gap-2.5 bg-panel border border-white/10 hover:border-white/25 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            <GoogleIcon /> {t('login.google')}
          </button>
          <button
            onClick={() => social('vk')}
            className="w-full flex items-center justify-center gap-2.5 bg-[#0077FF] hover:bg-[#0a82ff] text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            <VkIcon /> {t('login.vk')}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-fg-faint">{t('login.or')}</span>
          <span className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder={t('login.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
            />
          )}
          <input
            type="email"
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            required
          />
          <input
            type="password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            required
          />

          {error && (
            <div className="text-sidea-light text-sm text-center font-medium bg-sidea/10 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-brand-ink font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:scale-100 glow-brand"
          >
            {loading ? t('login.wait') : mode === 'login' ? t('login.signIn') : t('login.createAccount')}
          </button>
        </form>

        <p className="text-center text-sm text-fg-muted mt-6">
          {mode === 'login' ? t('login.noAccount') : t('login.haveAccount')}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-brand-light font-medium hover:underline"
          >
            {mode === 'login' ? t('login.signUp') : t('login.signIn')}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function VkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.16 17.3c-5.46 0-8.92-3.84-9.06-10.2h2.78c.1 4.67 2.23 6.66 3.86 7.07V7.1h2.66v3.98c1.58-.17 3.24-2 3.8-3.98h2.6a7.6 7.6 0 0 1-3.42 4.95 7.88 7.88 0 0 1 4 4.25h-2.86c-.62-1.9-2.06-3.37-4.12-3.57v3.57h-.94z" />
    </svg>
  );
}
