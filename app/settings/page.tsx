'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, AtSign, Lock, FileText, Globe, Camera, Loader2 } from 'lucide-react';
import { useAuth, apiUrl, avatarSrc } from '../providers';
import { useT } from '../i18n';

type Locale = 'en' | 'ru' | 'es';
const BIO_MAX = 140;

export default function SettingsPage() {
  const { t, locale, setLocale } = useT();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  // Redirect anonymous users away — settings are self-only.
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // --- Avatar ---
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);

  // --- Profile (display name + bio) ---
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);

  // --- Handle ---
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [handleMsg, setHandleMsg] = useState('');
  const [handleBusy, setHandleBusy] = useState(false);

  // --- Password ---
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setHandle(user.username || '');
    }
  }, [user]);

  // Debounced handle availability check.
  useEffect(() => {
    const h = handle.trim().toLowerCase();
    if (!user || h === (user.username || '')) { setHandleState('idle'); setHandleMsg(''); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(h)) { setHandleState('invalid'); return; }
    setHandleState('checking');
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`${apiUrl()}/api/auth/username-available?u=${encodeURIComponent(h)}`);
        const d = await r.json();
        setHandleState(d.available ? 'ok' : 'taken');
      } catch { setHandleState('idle'); }
    }, 400);
    return () => clearTimeout(id);
  }, [handle, user]);

  const inputCls =
    'w-full bg-panel-2 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:border-brand placeholder-fg-faint';

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setAvatarMsg(t('settings.avatarTooBig')); return; }
    setAvatarMsg('');
    setAvatarPreview(URL.createObjectURL(f));
  };

  const saveAvatar = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setAvatarBusy(true); setAvatarMsg('');
    try {
      const fd = new FormData();
      fd.append('avatar', f);
      const r = await fetch(`${apiUrl()}/api/me/avatar`, { method: 'POST', credentials: 'include', body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { await refresh(); setAvatarPreview(null); setAvatarMsg(t('settings.saved')); if (fileRef.current) fileRef.current.value = ''; }
      else setAvatarMsg(d.error || t('settings.failed'));
    } catch { setAvatarMsg(t('settings.failed')); }
    finally { setAvatarBusy(false); }
  };

  const saveProfile = async () => {
    setProfileBusy(true); setProfileMsg('');
    try {
      const r = await fetch(`${apiUrl()}/api/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: displayName, bio }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { await refresh(); setProfileMsg(t('settings.saved')); }
      else setProfileMsg(d.error || t('settings.failed'));
    } catch { setProfileMsg(t('settings.failed')); }
    finally { setProfileBusy(false); }
  };

  const saveHandle = async () => {
    if (handleState !== 'ok') return;
    setHandleBusy(true); setHandleMsg('');
    try {
      const r = await fetch(`${apiUrl()}/api/auth/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: handle.trim().toLowerCase() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { await refresh(); setHandleMsg(t('settings.saved')); setHandleState('idle'); }
      else if (r.status === 429) {
        const when = d.nextAllowedAt ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(d.nextAllowedAt)) : '';
        setHandleMsg(t('settings.handleCooldown', { date: when }));
      }
      else setHandleMsg(d.error || t('settings.failed'));
    } catch { setHandleMsg(t('settings.failed')); }
    finally { setHandleBusy(false); }
  };

  const savePassword = async () => {
    setPwMsg('');
    if (newPw.length < 8) { setPwMsg(t('settings.pwTooShort')); return; }
    if (newPw !== confirmPw) { setPwMsg(t('settings.pwMismatch')); return; }
    setPwBusy(true);
    try {
      const r = await fetch(`${apiUrl()}/api/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setPwMsg(t('settings.saved')); setCurPw(''); setNewPw(''); setConfirmPw(''); }
      else setPwMsg(d.error || t('settings.failed'));
    } catch { setPwMsg(t('settings.failed')); }
    finally { setPwBusy(false); }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-ink text-fg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
      </div>
    );
  }

  const card = 'rounded-2xl border border-white/[0.07] bg-panel p-5';
  const sectionTitle = 'flex items-center gap-2 text-sm font-semibold mb-3';
  const saveBtn = 'inline-flex items-center gap-1.5 text-sm font-semibold bg-brand text-brand-ink glow-brand px-4 py-2 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100';
  const msgCls = (m: string) => `text-xs ${m === t('settings.saved') ? 'text-sidea-light' : 'text-rage-light'}`;

  return (
    <div className="min-h-screen bg-ink text-fg font-sans selection:bg-brand/30">
      <div className="max-w-xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors">
            <ArrowLeft size={16} /> {t('profile.back')}
          </button>
          <h1 className="text-lg font-bold">{t('settings.title')}</h1>
        </div>

        {/* Avatar */}
        <section className={card}>
          <div className={sectionTitle}><Camera size={15} className="text-brand-light" /> {t('settings.avatar')}</div>
          <div className="flex items-center gap-4">
            {avatarPreview || avatarSrc(user.avatar_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview || avatarSrc(user.avatar_url)!} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand/20 text-brand-light flex items-center justify-center text-2xl font-bold">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickAvatar} className="hidden" />
              <div className="flex items-center gap-2">
                <button onClick={() => fileRef.current?.click()} className="text-sm font-medium bg-panel-2 border border-white/15 hover:border-white/30 px-3.5 py-2 rounded-xl transition-colors">
                  {t('settings.choosePhoto')}
                </button>
                {avatarPreview && (
                  <button onClick={saveAvatar} disabled={avatarBusy} className={saveBtn}>
                    {avatarBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {t('settings.save')}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-fg-faint mt-1.5">{t('settings.avatarHint')}</p>
            </div>
          </div>
          {avatarMsg && <p className={`mt-2 ${msgCls(avatarMsg)}`}>{avatarMsg}</p>}
        </section>

        {/* Profile: nickname + bio */}
        <section className={card}>
          <div className={sectionTitle}><FileText size={15} className="text-brand-light" /> {t('settings.profile')}</div>
          <label className="block text-xs text-fg-muted mb-1">{t('settings.nickname')}</label>
          <input className={inputCls} value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} />
          <label className="block text-xs text-fg-muted mb-1 mt-3">{t('settings.bio')}</label>
          <textarea
            className={`${inputCls} resize-none h-20`}
            value={bio}
            maxLength={BIO_MAX}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('settings.bioPlaceholder')}
          />
          <div className="text-right text-[11px] text-fg-faint mt-0.5">{bio.length}/{BIO_MAX}</div>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={saveProfile} disabled={profileBusy || !displayName.trim()} className={saveBtn}>
              {profileBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {t('settings.save')}
            </button>
            {profileMsg && <span className={msgCls(profileMsg)}>{profileMsg}</span>}
          </div>
        </section>

        {/* Handle */}
        <section className={card}>
          <div className={sectionTitle}><AtSign size={15} className="text-brand-light" /> {t('settings.handle')}</div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint text-sm">@</span>
            <input
              className={`${inputCls} pl-7`}
              value={handle}
              maxLength={20}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
            />
          </div>
          <div className="h-4 mt-1 text-[11px]">
            {handleState === 'checking' && <span className="text-fg-faint">{t('settings.handleChecking')}</span>}
            {handleState === 'ok' && <span className="text-sidea-light">{t('settings.handleAvailable')}</span>}
            {handleState === 'taken' && <span className="text-rage-light">{t('settings.handleTaken')}</span>}
            {handleState === 'invalid' && <span className="text-rage-light">{t('settings.handleInvalid')}</span>}
          </div>
          <p className="text-[11px] text-fg-faint">{t('settings.handleHint')}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={saveHandle} disabled={handleBusy || handleState !== 'ok'} className={saveBtn}>
              {handleBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {t('settings.save')}
            </button>
            {handleMsg && <span className={msgCls(handleMsg)}>{handleMsg}</span>}
          </div>
        </section>

        {/* Language */}
        <section className={card}>
          <div className={sectionTitle}><Globe size={15} className="text-brand-light" /> {t('settings.language')}</div>
          <div className="flex gap-2">
            {(['en', 'ru', 'es'] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  locale === l ? 'bg-brand text-brand-ink' : 'bg-panel-2 border border-white/15 text-fg-muted hover:text-fg'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Password */}
        <section className={card}>
          <div className={sectionTitle}><Lock size={15} className="text-brand-light" /> {t('settings.password')}</div>
          <input type="password" className={`${inputCls} mb-2`} placeholder={t('settings.currentPassword')} value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          <input type="password" className={`${inputCls} mb-2`} placeholder={t('settings.newPassword')} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <input type="password" className={inputCls} placeholder={t('settings.confirmPassword')} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={savePassword} disabled={pwBusy || !newPw} className={saveBtn}>
              {pwBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {t('settings.save')}
            </button>
            {pwMsg && <span className={msgCls(pwMsg)}>{pwMsg}</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
