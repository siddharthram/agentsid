'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Globe, FileText, ArrowLeft, Link as LinkIcon, Check, AlertTriangle, Loader2, Mail, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'form' | 'verify' | 'done';

export default function OrgCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');

  // Form state
  const [orgName, setOrgName] = useState('');
  const [handle, setHandle] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Verification state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifiedMethod, setVerifiedMethod] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authed, setAuthed] = useState(false);

  // Auto-generate handle from org name
  useEffect(() => {
    if (step === 'form') {
      const generated = orgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 40);
      setHandle(generated);
    }
  }, [orgName, step]);

  // Auto-suggest email from domain
  useEffect(() => {
    if (domain && !verifyEmail) {
      setVerifyEmail(`admin@${domain}`);
    }
  }, [domain, verifyEmail]);

  // Check session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.entity_type === 'human') {
            setAuthed(true);
          }
        }
      } catch {}
      setCheckingAuth(false);
    }
    checkAuth();
  }, []);

  // === Step 1: Create org ===
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          handle,
          domain: domain || undefined,
          description: description || undefined,
          website_url: websiteUrl || undefined,
          linkedin_company_url: linkedinUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create organisation');
        return;
      }

      // If domain was provided, go to email verification step
      if (domain) {
        setStep('verify');
        setSuccess(`"${orgName}" created! Now let's verify your domain.`);
      } else {
        // No domain — skip verification, go to done
        setStep('done');
        setVerifiedMethod('linkedin_creator');
        setSuccess(`"${orgName}" created and verified via your LinkedIn account!`);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // === Step 2a: Send verification code ===
  const handleSendCode = async () => {
    setLoading(true);
    setError(null);

    // Validate email matches domain
    const emailDomain = verifyEmail.split('@')[1]?.toLowerCase();
    if (emailDomain !== domain.toLowerCase()) {
      setError(`Email must be at ${domain}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/orgs/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_handle: handle, email: verifyEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send code');
        return;
      }

      setCodeSent(true);
      setSuccess(`Code sent to ${verifyEmail}`);
    } catch {
      setError('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  // === Step 2b: Verify code ===
  const handleVerifyCode = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orgs/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_handle: handle, code: verifyCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      setStep('done');
      setVerifiedMethod('domain_email');
      setSuccess(`"${orgName}" is now domain-verified via ${verifyEmail}!`);
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // === Step 2c: Skip verification ===
  const handleSkip = () => {
    setStep('done');
    setVerifiedMethod('linkedin_creator');
    setSuccess(`"${orgName}" created! Verified via your LinkedIn account.`);
  };

  // === Auth check screens ===
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-bg dark:bg-bg-accent flex items-center justify-center">
        <div className="text-text-muted">Checking session...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-bg dark:bg-bg-accent text-text flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-warning/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-text-strong mb-2">Sign In Required</h1>
          <p className="text-text-muted mb-6">
            You need a verified human account to register an organisation.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 px-6 py-3 bg-info hover:bg-info/80 text-white rounded-lg font-semibold transition-colors"
          >
            Sign in with LinkedIn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-accent text-text flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-rise">
          <div className="w-16 h-16 bg-teal/15 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'done' ? (
              <Check className="w-8 h-8 text-ok" />
            ) : step === 'verify' ? (
              <Mail className="w-8 h-8 text-teal" />
            ) : (
              <Building2 className="w-8 h-8 text-teal" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-strong mb-2">
            {step === 'done'
              ? 'Organisation Created!'
              : step === 'verify'
              ? 'Verify Your Domain'
              : 'Register an Organisation'}
          </h1>
          <p className="text-text-muted">
            {step === 'done'
              ? 'Your organisation is live on AgentSid.'
              : step === 'verify'
              ? `We'll send a code to an email at ${domain}`
              : 'Create a profile for your company or team.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Details', 'Verify', 'Done'].map((label, i) => {
            const stepIndex = step === 'form' ? 0 : step === 'verify' ? 1 : 2;
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-ok text-white'
                      : isActive
                      ? 'bg-teal text-white'
                      : 'bg-bg-elevated text-text-muted'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${isActive ? 'text-text-strong' : 'text-text-muted'}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-6 flex items-center gap-3 animate-rise">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-sm text-text">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-ok/10 border border-ok/30 rounded-lg p-4 mb-6 flex items-center gap-3 animate-rise">
            <Check className="w-5 h-5 text-ok flex-shrink-0" />
            <p className="text-sm text-text">{success}</p>
          </div>
        )}

        {/* === STEP 1: Create Form === */}
        {step === 'form' && (
          <form onSubmit={handleCreate}>
            <div className="bg-card rounded-xl p-6 animate-rise">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Organisation Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Intermezzo AI" required
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Handle *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                    <input type="text" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="intermezzo-ai" required
                      className="w-full pl-8 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                  </div>
                  <p className="text-xs text-text-muted mt-1">agentsid.ai/profile/{handle || '...'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Domain</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="intermezzo.ai"
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                  </div>
                  <p className="text-xs text-text-muted mt-1">We&apos;ll send a verification code to an email at this domain</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your organisation do?" rows={3}
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors resize-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Website</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://intermezzo.ai"
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">LinkedIn Company Page</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/company/intermezzo-ai"
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading || !orgName || !handle}
                className="w-full mt-6 flex items-center justify-center gap-3 px-6 py-3 bg-teal hover:bg-teal/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Building2 className="w-5 h-5" />}
                {loading ? 'Creating...' : 'Create Organisation'}
              </button>
            </div>
          </form>
        )}

        {/* === STEP 2: Email Verification === */}
        {step === 'verify' && (
          <div className="bg-card rounded-xl p-6 animate-rise">
            {!codeSent ? (
              <>
                <p className="text-sm text-text-muted mb-4">
                  Enter an email address at <strong className="text-text-strong">{domain}</strong> where you can receive a verification code.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="email" value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)}
                        placeholder={`admin@${domain}`}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['admin', 'info', 'contact', 'ceo'].map((prefix) => (
                        <button key={prefix} type="button" onClick={() => setVerifyEmail(`${prefix}@${domain}`)}
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${
                            verifyEmail === `${prefix}@${domain}`
                              ? 'bg-teal/20 text-teal border border-teal/30'
                              : 'bg-bg-elevated text-text-muted hover:text-text border border-border'
                          }`}>
                          {prefix}@{domain}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSendCode} disabled={loading || !verifyEmail}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-teal hover:bg-teal/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted mb-4">
                  We sent a 6-digit code to <strong className="text-text-strong">{verifyEmail}</strong>. Enter it below.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Verification Code</label>
                    <input type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456" maxLength={6}
                      className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text text-center text-2xl font-mono tracking-[0.5em] placeholder:text-text-muted placeholder:tracking-[0.5em] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors" />
                  </div>
                  <button onClick={handleVerifyCode} disabled={loading || verifyCode.length !== 6}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-teal hover:bg-teal/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                  <button onClick={() => { setCodeSent(false); setVerifyCode(''); setError(null); setSuccess(null); }}
                    className="w-full text-sm text-text-muted hover:text-text transition-colors">
                    Didn&apos;t receive it? Send again
                  </button>
                </div>
              </>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <button onClick={handleSkip} className="w-full text-sm text-text-muted hover:text-text transition-colors">
                Skip — verify later
              </button>
            </div>
          </div>
        )}

        {/* === STEP 3: Done === */}
        {step === 'done' && (
          <div className="bg-card rounded-xl p-6 animate-rise text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4"
              style={{ background: verifiedMethod === 'domain_email' ? 'rgba(0,200,150,0.15)' : 'rgba(0,120,200,0.15)',
                       color: verifiedMethod === 'domain_email' ? '#00c896' : '#0088dd' }}>
              <Shield className="w-4 h-4" />
              {verifiedMethod === 'domain_email' ? 'Domain Verified' : 'LinkedIn Verified'}
            </div>
            <p className="text-text-muted text-sm mb-6">
              {verifiedMethod === 'domain_email'
                ? `Verified via ${verifyEmail}`
                : 'Verified through your LinkedIn identity'}
            </p>
            <Link href={`/profile/${handle}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal hover:bg-teal/80 text-white rounded-lg font-semibold transition-colors">
              View Organisation Profile →
            </Link>
          </div>
        )}

        {/* Back link */}
        {step === 'form' && (
          <p className="text-center text-text-muted text-sm mt-8 animate-rise">
            <Link href="/" className="inline-flex items-center gap-1 text-teal hover:underline">
              <ArrowLeft className="w-3 h-3" />
              Back to home
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
