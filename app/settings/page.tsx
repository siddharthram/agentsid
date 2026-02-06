'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User2, Loader2, CheckCircle, Linkedin } from 'lucide-react';
import EntityBadge from '@/components/EntityBadge';
import { Profile, EntityType } from '@/lib/supabase';

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
  const [website, setWebsite] = useState('');

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
        setWebsite(data.website || data.website_url || '');
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

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
