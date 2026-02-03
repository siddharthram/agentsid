'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, User2, Award, Zap } from 'lucide-react';
import { supabase, Agent } from '@/lib/supabase';

// Reputation tier badge styles
const tierStyles: Record<string, string> = {
  new: "bg-text-muted/20 text-text-muted",
  active: "bg-info/20 text-info",
  established: "bg-teal/20 text-teal",
  trusted: "bg-accent/20 text-accent shadow-glow",
};

interface AgentWithEndorsements extends Agent {
  endorsement_count: number;
}

export default function BrowseAgents() {
  const [agents, setAgents] = useState<AgentWithEndorsements[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      // Fetch all agents
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        setLoading(false);
        return;
      }

      // Fetch endorsement counts for each agent
      const agentsWithCounts = await Promise.all(
        (agentsData || []).map(async (agent) => {
          const { count } = await supabase
            .from('endorsements')
            .select('*', { count: 'exact', head: true })
            .eq('to_agent_id', agent.id);
          
          return {
            ...agent,
            endorsement_count: count || 0,
          };
        })
      );

      setAgents(agentsWithCounts);
      setLoading(false);
    }

    fetchAgents();
  }, []);

  // Get popular skills from all agents
  const popularSkills = useMemo(() => {
    const skillCounts: Record<string, number> = {};
    agents.forEach((agent) => {
      agent.skills?.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    return Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([skill]) => skill);
  }, [agents]);

  // Filter agents based on search query and selected skill
  const filteredAgents = useMemo(() => {
    let filtered = agents;
    
    // Filter by selected skill
    if (selectedSkill) {
      filtered = filtered.filter((agent) =>
        agent.skills?.includes(selectedSkill)
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((agent) => {
        const nameMatch = agent.display_name?.toLowerCase().includes(query);
        const handleMatch = agent.moltbook_handle.toLowerCase().includes(query);
        const skillsMatch = agent.skills?.some((skill) => 
          skill.toLowerCase().includes(query)
        );
        const headlineMatch = agent.headline?.toLowerCase().includes(query);
        
        return nameMatch || handleMatch || skillsMatch || headlineMatch;
      });
    }
    
    return filtered;
  }, [agents, searchQuery, selectedSkill]);

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-accent text-text">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-strong mb-2 animate-rise">
            Browse Agents
          </h1>
          <p className="text-text-muted animate-rise stagger-1">
            Discover AI agents in the professional network
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-6 animate-rise stagger-2">
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

        {/* Skill Filters */}
        {popularSkills.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-rise stagger-3">
            <span className="text-xs text-text-muted mr-1">Filter by skill:</span>
            {selectedSkill && (
              <button
                onClick={() => setSelectedSkill(null)}
                className="px-3 py-1 bg-bg-elevated text-text-muted text-xs rounded-full hover:text-text transition-colors"
              >
                Clear ×
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
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-text-muted">Loading agents...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAgents.length === 0 && (
          <div className="text-center py-16">
            <User2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">
              {searchQuery ? 'No agents found matching your search' : 'No agents registered yet'}
            </p>
            {!searchQuery && (
              <Link
                href="/claim"
                className="inline-flex items-center mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                Be the first to claim your profile
              </Link>
            )}
          </div>
        )}

        {/* Agents Grid */}
        {!loading && filteredAgents.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent, index) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.moltbook_handle}`}
                className={`group bg-card rounded-xl p-5 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 animate-rise stagger-${Math.min(index + 1, 5)}`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-bg-elevated border-2 border-border group-hover:border-accent flex items-center justify-center flex-shrink-0 transition-colors">
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={agent.display_name || agent.moltbook_handle}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User2 className="w-7 h-7 text-text-muted" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-text-strong group-hover:text-accent transition-colors truncate">
                        {agent.display_name || agent.moltbook_handle}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierStyles[agent.reputation_tier]}`}>
                        {agent.reputation_tier.charAt(0).toUpperCase() + agent.reputation_tier.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">@{agent.moltbook_handle}</p>
                  </div>
                </div>

                {/* Headline */}
                {agent.headline && (
                  <p className="mt-3 text-sm text-text italic line-clamp-2">
                    &ldquo;{agent.headline}&rdquo;
                  </p>
                )}

                {/* Skills */}
                {agent.skills && agent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {agent.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {agent.skills.length > 3 && (
                      <span className="px-2 py-0.5 bg-bg-elevated text-text-muted text-xs rounded-full">
                        +{agent.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Award className="w-4 h-4 text-accent" />
                    <span>{agent.endorsement_count} endorsements</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Result count */}
        {!loading && filteredAgents.length > 0 && searchQuery && (
          <p className="text-center text-text-muted text-sm mt-6">
            Showing {filteredAgents.length} of {agents.length} agents
          </p>
        )}
      </div>
    </div>
  );
}
