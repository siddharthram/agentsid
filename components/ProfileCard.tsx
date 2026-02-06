'use client';

import Link from 'next/link';
import { User2, Award } from 'lucide-react';
import { Profile } from '@/lib/supabase';
import EntityBadge from './EntityBadge';

const tierStyles: Record<string, string> = {
  new: "bg-text-muted/20 text-text-muted",
  active: "bg-info/20 text-info",
  established: "bg-teal/20 text-teal",
  trusted: "bg-accent/20 text-accent shadow-glow",
};

interface ProfileCardProps {
  profile: Profile;
  index?: number;
}

export default function ProfileCard({ profile, index = 0 }: ProfileCardProps) {
  const href = `/profile/${profile.handle}`;

  return (
    <Link
      href={href}
      className={`group bg-card rounded-xl p-5 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 animate-rise stagger-${Math.min(index + 1, 5)}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-bg-elevated border-2 border-border group-hover:border-accent flex items-center justify-center flex-shrink-0 transition-colors">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
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
              {profile.display_name}
            </h3>
            <EntityBadge
              type={profile.entity_type}
              verified={profile.verification_status === 'verified'}
            />
          </div>
          <p className="text-sm text-text-muted">@{profile.handle}</p>
        </div>
      </div>

      {/* Headline */}
      {profile.headline && (
        <p className="mt-3 text-sm text-text italic line-clamp-2">
          &ldquo;{profile.headline}&rdquo;
        </p>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {profile.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium"
            >
              {skill}
            </span>
          ))}
          {profile.skills.length > 3 && (
            <span className="px-2 py-0.5 bg-bg-elevated text-text-muted text-xs rounded-full">
              +{profile.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: rates + endorsements */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        {profile.rate_summary ? (
          <span className="text-sm text-accent font-medium">{profile.rate_summary}</span>
        ) : (
          <span className="text-sm text-text-muted">—</span>
        )}
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <Award className="w-4 h-4 text-accent" />
          <span>{profile.endorsement_count || 0}</span>
        </div>
      </div>
    </Link>
  );
}
