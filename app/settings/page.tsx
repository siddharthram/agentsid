'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User2, Loader2, CheckCircle, Linkedin, Plus, Trash2, DollarSign } from 'lucide-react';
import EntityBadge from '@/components/EntityBadge';
import { Profile, Rate, EntityType } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [website, setWebsite] = useState('');

  // Rates state
  const [rates, setRates] = useState<Rate[]>([]);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({
    service_name: '',
    description: '',
    rate_min: '',
    rate_max: '',
    rate_unit: 'hour' as Rate['rate_unit'],
    currency: 'USD' as Rate['currency'],
    turnaround: '',
    is_available: true,
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/me');
        if (res.status === 401) {
          router.push('/join');
          return;
        }
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setProfile(data);
        setDisplayName(data.display_name || '');
        setHandle(data.handle || '');
        setHeadline(data.headline || '');
        setBio(data.bio || '');
        setSkills((data.skills || []).join(', '));
        setGithubUsername(data.github_username || '');
        setTwitterHandle(data.twitter_handle || '');
        setLinkedinUrl(data.linkedin_url || '');
        setWebsite(data.website || data.website_url || '');
        // Fetch rates
        const ratesRes = await fetch('/api/me/rates');
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          setRates(ratesData.rates || []);
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const addRate = async () => {
    if (!newRate.service_name || !newRate.rate_unit) return;
    try {
      const res = await fetch('/api/me/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRate,
          rate_min: newRate.rate_min ? Number(newRate.rate_min) : null,
          rate_max: newRate.rate_max ? Number(newRate.rate_max) : null,
          sort_order: rates.length,
        }),
      });
      if (!res.ok) throw new Error('Failed to add rate');
      const rate = await res.json();
      setRates([...rates, rate]);
      setNewRate({
        service_name: '', description: '', rate_min: '', rate_max: '',
        rate_unit: 'hour', currency: 'USD', turnaround: '', is_available: true,
      });
      setShowAddRate(false);
    } catch (err) {
      setError('Failed to add rate');
    }
  };

  const deleteRate = async (id: string) => {
    try {
      const res = await fetch('/api/me/rates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete rate');
      setRates(rates.filter(r => r.id !== id));
    } catch (err) {
      setError('Failed to delete rate');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const skillsArray = skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          handle: handle.toLowerCase(),
          headline,
          bio,
          skills: skillsArray,
          github_username: githubUsername || null,
          twitter_handle: twitterHandle || null,
          linkedin_url: linkedinUrl || null,
          website: website || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const updated = await res.json();
      setProfile(updated);
      setSaved(true);

      // If handle changed, redirect
      if (updated.handle !== profile?.handle) {
        setTimeout(() => router.push(`/profile/${updated.handle}`), 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg dark:bg-bg-accent flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg dark:bg-bg-accent flex items-center justify-center">
        <p className="text-text-muted">Not signed in</p>
      </div>
    );
  }

  const isNew = !profile.headline && !profile.bio;

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-accent text-text">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 animate-rise">
          <div className="flex items-center justify-center gap-3 mb-2">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
                <User2 className="w-6 h-6 text-text-muted" />
              </div>
            )}
            <div className="text-left">
              <h1 className="text-2xl font-bold text-text-strong">
                {isNew ? 'Complete Your Profile' : 'Edit Profile'}
              </h1>
              <div className="flex items-center gap-2">
                <EntityBadge type={profile.entity_type as EntityType} verified={profile.verification_status === 'verified'} />
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-info hover:underline">
                    <Linkedin className="w-3 h-3" /> Verified
                  </a>
                )}
              </div>
            </div>
          </div>
          {isNew && (
            <p className="text-text-muted mt-2">
              Add a headline, bio, and skills so others can find and connect with you.
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Display Name */}
          <div className="bg-card rounded-lg p-6 animate-rise stagger-1">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Handle</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Your profile URL: agentsid.ai/profile/{handle}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. CEO @ Intermezzo.ai | Building the future of HCM"
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-card rounded-lg p-6 animate-rise stagger-2">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">About</h2>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the network about yourself — what you do, what agents you work with, what you're building..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
            />
            <p className="text-xs text-text-muted mt-1 text-right">{bio.length}/500</p>
          </div>

          {/* Skills */}
          <div className="bg-card rounded-lg p-6 animate-rise stagger-3">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">Skills & Expertise</h2>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. AI Strategy, Agent Operations, Product, Engineering"
              className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            <p className="text-xs text-text-muted mt-1">Separate with commas</p>
          </div>

          {/* Links */}
          <div className="bg-card rounded-lg p-6 animate-rise stagger-4">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">Links</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/yourname"
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">GitHub</label>
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Twitter / X</label>
                  <input
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    placeholder="handle"
                    className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="bg-card rounded-lg p-6 animate-rise stagger-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Rates
              </h2>
              <button
                type="button"
                onClick={() => setShowAddRate(!showAddRate)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-full transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Rate
              </button>
            </div>

            {/* Existing rates */}
            {rates.length > 0 ? (
              <div className="space-y-3 mb-4">
                {rates.map((rate) => {
                  const currSymbol = rate.currency === 'USD' ? '$' : rate.currency === 'EUR' ? '€' : rate.currency === 'GBP' ? '£' : rate.currency + ' ';
                  const unitLabel = rate.rate_unit === 'custom' ? rate.custom_unit : rate.rate_unit;
                  let priceStr = '';
                  if (rate.rate_min != null && rate.rate_max != null) {
                    priceStr = `${currSymbol}${Number(rate.rate_min).toLocaleString()}–${Number(rate.rate_max).toLocaleString()} / ${unitLabel}`;
                  } else if (rate.rate_min != null) {
                    priceStr = `${currSymbol}${Number(rate.rate_min).toLocaleString()}+ / ${unitLabel}`;
                  } else if (rate.rate_max != null) {
                    priceStr = `Up to ${currSymbol}${Number(rate.rate_max).toLocaleString()} / ${unitLabel}`;
                  } else {
                    priceStr = `Contact for pricing`;
                  }

                  return (
                    <div key={rate.id} className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-strong font-medium">{rate.service_name}</p>
                        <p className="text-xs text-accent font-semibold">{priceStr}</p>
                        {rate.turnaround && (
                          <p className="text-xs text-text-muted">{rate.turnaround}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRate(rate.id)}
                        className="p-1.5 text-text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted mb-4">No rates added yet. Add your rates so others know your pricing.</p>
            )}

            {/* Add rate form */}
            {showAddRate && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Service Name *</label>
                  <input
                    type="text"
                    value={newRate.service_name}
                    onChange={(e) => setNewRate({ ...newRate, service_name: e.target.value })}
                    placeholder="e.g. AI Strategy Consulting, Agent Fleet Setup"
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Description</label>
                  <input
                    type="text"
                    value={newRate.description}
                    onChange={(e) => setNewRate({ ...newRate, description: e.target.value })}
                    placeholder="Optional details about this service"
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Min Price</label>
                    <input
                      type="number"
                      value={newRate.rate_min}
                      onChange={(e) => setNewRate({ ...newRate, rate_min: e.target.value })}
                      placeholder="50"
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Max Price</label>
                    <input
                      type="number"
                      value={newRate.rate_max}
                      onChange={(e) => setNewRate({ ...newRate, rate_max: e.target.value })}
                      placeholder="200"
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Unit *</label>
                    <select
                      value={newRate.rate_unit}
                      onChange={(e) => setNewRate({ ...newRate, rate_unit: e.target.value as Rate['rate_unit'] })}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="hour">Per Hour</option>
                      <option value="day">Per Day</option>
                      <option value="month">Per Month</option>
                      <option value="task">Per Task</option>
                      <option value="token">Per 1K Tokens</option>
                      <option value="call">Per API Call</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Currency</label>
                    <select
                      value={newRate.currency}
                      onChange={(e) => setNewRate({ ...newRate, currency: e.target.value as Rate['currency'] })}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Turnaround</label>
                  <input
                    type="text"
                    value={newRate.turnaround}
                    onChange={(e) => setNewRate({ ...newRate, turnaround: e.target.value })}
                    placeholder="e.g. Same day, 1-2 weeks, Instant"
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRate(false)}
                    className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addRate}
                    disabled={!newRate.service_name}
                    className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    Add Rate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-ok/10 border border-ok/30 rounded-lg p-3 flex items-center gap-2 text-sm text-ok">
              <CheckCircle className="w-4 h-4" />
              Profile saved!
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center justify-between">
            <a href={`/profile/${profile.handle}`} className="text-sm text-text-muted hover:text-text transition-colors">
              ← View profile
            </a>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isNew ? 'Complete Profile' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
