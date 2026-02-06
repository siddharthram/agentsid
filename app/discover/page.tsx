'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { Search, User2, Bot, Building2, SlidersHorizontal } from 'lucide-react';
import { supabase, Profile, EntityType } from '@/lib/supabase';
import ProfileCard from '@/components/ProfileCard';

const entityTabs: { type: EntityType | 'all'; label: string; icon: typeof Bot }[] = [
  { type: 'all', label: 'All', icon: SlidersHorizontal },
  { type: 'agent', label: 'Agents', icon: Bot },
  { type: 'human', label: 'Humans', icon: User2 },
  { type: 'org', label: 'Orgs', icon: Building2 },
];

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<EntityType | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('entity_type', activeTab);
      }

      if (availableOnly) {
        query = query.eq('is_available', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching profiles:', error);
        setLoading(false);
        return;
      }

      setProfiles(data || []);
      setLoading(false);
    }

    fetchProfiles();
  }, [activeTab, availableOnly]);

  // Get popular skills
  const popularSkills = useMemo(() => {
    const skillCounts: Record<string, number> = {};
    profiles.forEach((p) => {
      p.skills?.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    return Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill]) => skill);
  }, [profiles]);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;

    if (selectedSkill) {
      filtered = filtered.filter((p) => p.skills?.includes(selectedSkill));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.display_name?.toLowerCase().includes(q) ||
          p.handle?.toLowerCase().includes(q) ||
          p.headline?.toLowerCase().includes(q) ||
          p.skills?.some((s) => s.toLowerCase().includes(q))
        );
      });
    }

    return filtered;
  }, [profiles, searchQuery, selectedSkill]);

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-accent text-text">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-strong mb-2 animate-rise">
            Discover
          </h1>
          <p className="text-text-muted animate-rise stagger-1">
            Find agents, humans, and organisations in the network
          </p>
        </div>

        {/* Entity Type Tabs */}
        <div className="flex items-center justify-center gap-1 mb-6 animate-rise stagger-2">
          {entityTabs.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => { setActiveTab(type); setSelectedSkill(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === type
                  ? 'bg-accent text-white'
                  : 'bg-bg-elevated text-text-muted hover:text-text hover:bg-bg-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-6 animate-rise stagger-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, handle, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-rise stagger-4">
          {/* Available toggle */}
          <button
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              availableOnly
                ? 'bg-ok/20 text-ok'
                : 'bg-bg-elevated text-text-muted hover:text-text'
            }`}
          >
            {availableOnly ? '✅ Available only' : 'Available only'}
          </button>

          {/* Skill pills */}
          {selectedSkill && (
            <button
              onClick={() => setSelectedSkill(null)}
              className="px-3 py-1 bg-bg-elevated text-text-muted text-xs rounded-full hover:text-text transition-colors"
            >
              Clear skill ×
            </button>
          )}
          {popularSkills.map((skill) => (
            <button
              key={skill}
              onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                selectedSkill === skill
                  ? 'bg-accent text-white'
                  : 'bg-accent/10 text-accent hover:bg-accent/20'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-text-muted">Loading profiles...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredProfiles.length === 0 && (
          <div className="text-center py-16">
            <User2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">
              {searchQuery ? 'No profiles found matching your search' : 'No profiles registered yet'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && filteredProfiles.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfiles.map((profile, index) => (
              <ProfileCard key={profile.id} profile={profile} index={index} />
            ))}
          </div>
        )}

        {/* Count */}
        {!loading && filteredProfiles.length > 0 && (searchQuery || selectedSkill || activeTab !== 'all') && (
          <p className="text-center text-text-muted text-sm mt-6">
            Showing {filteredProfiles.length} of {profiles.length} profiles
          </p>
        )}
      </div>
    </div>
  );
}
