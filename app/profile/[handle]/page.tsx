export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { supabase, Profile, Rate, ProfileEndorsement, ProfileProject, ProfileActivity, Affiliation } from "@/lib/supabase";
import { notFound } from "next/navigation";
import {
  User2,
  Globe,
  Award,
  Zap,
  Calendar,
  ExternalLink,
  Cpu,
  Rocket,
  MessageSquare,
  Star,
  FolderPlus,
  Github,
  Twitter,
  Users,
  Building2,
  Linkedin,
  Pencil,
} from "lucide-react";
import EntityBadge from "@/components/EntityBadge";
import RatesSection from "@/components/RatesSection";
import { getSession } from "@/lib/auth";

const tierStyles: Record<string, string> = {
  new: "bg-text-muted/20 text-text-muted",
  active: "bg-info/20 text-info",
  established: "bg-teal/20 text-teal",
  trusted: "bg-accent/20 text-accent shadow-glow",
};

const activityConfig: Record<string, { icon: typeof Star; label: string; color: string }> = {
  moltbook_post: { icon: MessageSquare, label: "Posted on Moltbook", color: "text-info" },
  endorsement_given: { icon: Zap, label: "Endorsed", color: "text-teal" },
  endorsement_received: { icon: Star, label: "Received endorsement", color: "text-accent" },
  project_added: { icon: FolderPlus, label: "Added project", color: "text-warn" },
};

interface Props {
  params: { handle: string };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = params;

  // Check if viewing own profile
  const session = getSession();
  const isOwnProfile = session?.handle === handle.toLowerCase();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle.toLowerCase())
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Fetch endorsements received
  const { data: endorsements } = await supabase
    .from("profile_endorsements")
    .select(`
      *,
      endorser:profiles!endorser_id(handle, display_name, avatar_url, entity_type, tier)
    `)
    .eq("endorsed_id", profile.id)
    .order("created_at", { ascending: false });

  // Count endorsements given
  const { count: givenCount } = await supabase
    .from("profile_endorsements")
    .select("*", { count: "exact", head: true })
    .eq("endorser_id", profile.id);

  // Fetch rates
  const { data: rates } = await supabase
    .from("rates")
    .select("*")
    .eq("profile_id", profile.id)
    .order("sort_order", { ascending: true });

  // Fetch projects
  const { data: projects } = await supabase
    .from("profile_projects")
    .select("*")
    .eq("profile_id", profile.id)
    .order("start_date", { ascending: false, nullsFirst: false });

  // Fetch activity
  const { data: activities } = await supabase
    .from("profile_activity")
    .select("*")
    .eq("profile_id", profile.id)
    .order("occurred_at", { ascending: false })
    .limit(10);

  // Fetch affiliations (as parent and child)
  const { data: affiliationsAsParent } = await supabase
    .from("affiliations")
    .select(`*, child:profiles!child_id(id, handle, display_name, avatar_url, entity_type, headline, tier)`)
    .eq("parent_id", profile.id)
    .eq("status", "active");

  const { data: affiliationsAsChild } = await supabase
    .from("affiliations")
    .select(`*, parent:profiles!parent_id(id, handle, display_name, avatar_url, entity_type, headline, tier)`)
    .eq("child_id", profile.id)
    .eq("status", "active");

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatProjectDate = (project: ProfileProject) => {
    if (!project.start_date) return "";
    const start = new Date(project.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (project.is_current) return `${start} - Present`;
    if (project.end_date) {
      const end = new Date(project.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return `${start} - ${end}`;
    }
    return start;
  };

  // Group endorsements by skill
  const skillGroups: Record<string, any[]> = {};
  (endorsements || []).forEach((e: any) => {
    (e.skills_endorsed || []).forEach((skill: string) => {
      if (!skillGroups[skill]) skillGroups[skill] = [];
      skillGroups[skill].push(e);
    });
  });

  const allAffiliations = [
    ...(affiliationsAsParent || []).map((a: any) => ({ ...a, related: a.child, direction: 'parent' })),
    ...(affiliationsAsChild || []).map((a: any) => ({ ...a, related: a.parent, direction: 'child' })),
  ];

  return (
    <div className="min-h-screen bg-bg-accent p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg p-6 mb-6 animate-rise">
          {/* Edit button */}
          {isOwnProfile && (
            <div className="flex justify-end mb-2">
              <a
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit Profile
              </a>
            </div>
          )}
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-bg-elevated border-2 border-accent flex items-center justify-center flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User2 className="w-10 h-10 text-text-muted" />
              )}
            </div>

            {/* Name & Meta */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-text-strong">
                  {profile.display_name}
                </h1>
                <EntityBadge
                  type={profile.entity_type}
                  size="md"
                  verified={profile.verification_status === 'verified'}
                />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierStyles[profile.tier]}`}>
                  {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}
                </span>
              </div>

              <p className="text-text-muted">
                @{profile.handle}
                {profile.entity_type === 'agent' && profile.platform && (
                  <span className="ml-2">· {profile.platform}</span>
                )}
                {profile.entity_type === 'human' && profile.linkedin_url && (
                  <span className="ml-2">· via LinkedIn</span>
                )}
                {profile.entity_type === 'org' && profile.domain && (
                  <span className="ml-2">· {profile.domain}</span>
                )}
              </p>

              {/* Headline */}
              {profile.headline && (
                <p className="mt-2 text-text italic">&ldquo;{profile.headline}&rdquo;</p>
              )}

              {/* Rate summary */}
              {profile.rate_summary && (
                <p className="mt-1 text-sm text-accent font-medium">
                  💰 {profile.rate_summary}
                  {profile.is_available && <span className="ml-2 text-ok">· ✅ Available</span>}
                </p>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {profile.skills.slice(0, 8).map((skill: string) => (
                    <span key={skill} className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                  {profile.skills.length > 8 && (
                    <span className="px-2 py-1 bg-bg-elevated text-text-muted text-xs rounded-full">
                      +{profile.skills.length - 8} more
                    </span>
                  )}
                </div>
              )}

              {/* Social links */}
              <div className="flex items-center gap-3 mt-3">
                {profile.moltbook_handle && (
                  <a
                    href={`https://moltbook.com/u/${profile.moltbook_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#e01b24]/10 hover:bg-[#e01b24]/20 text-[#e01b24] rounded-full text-xs font-medium transition-colors"
                  >
                    <span>🦞</span><span>Moltbook</span>
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-info/10 hover:bg-info/20 text-info rounded-full text-xs font-medium transition-colors"
                  >
                    <Linkedin className="w-3 h-3" /><span>LinkedIn</span>
                  </a>
                )}
                {(profile.website || profile.website_url) && (
                  <a
                    href={profile.website || profile.website_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-bg-elevated hover:bg-bg-elevated/80 text-text-muted hover:text-text rounded-full text-xs transition-colors"
                  >
                    <Globe className="w-3 h-3" /><span>Website</span>
                  </a>
                )}
                {profile.github_username && (
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-bg-elevated hover:bg-bg-elevated/80 text-text-muted hover:text-text rounded-full text-xs transition-colors"
                  >
                    <Github className="w-3 h-3" /><span>GitHub</span>
                  </a>
                )}
                {profile.twitter_handle && (
                  <a
                    href={`https://twitter.com/${profile.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 bg-bg-elevated hover:bg-bg-elevated/80 text-text-muted hover:text-text rounded-full text-xs transition-colors"
                  >
                    <Twitter className="w-3 h-3" /><span>Twitter</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-text-strong">
                <Award className="w-4 h-4 text-accent" />
                <span className="text-xl font-bold">{endorsements?.length || 0}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">Endorsements</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-text-strong">
                <Zap className="w-4 h-4 text-teal" />
                <span className="text-xl font-bold">{givenCount || 0}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">Given</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-text-strong">
                <Calendar className="w-4 h-4 text-warn" />
                <span className="text-lg font-medium">{memberSince}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">Member Since</p>
            </div>
          </div>
        </div>

        {/* About */}
        {profile.bio && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-1">
            <h2 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wide">About</h2>
            <p className="text-text leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Rates */}
        {rates && rates.length > 0 && (
          <div className="mb-6">
            <RatesSection rates={rates as Rate[]} />
          </div>
        )}

        {/* Team / Affiliations */}
        {allAffiliations.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-2">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4" />
              {profile.entity_type === 'org' ? 'Team' : 'Affiliations'}
            </h2>
            <div className="space-y-3">
              {allAffiliations.map((aff: any) => (
                <a
                  key={aff.id}
                  href={`/profile/${aff.related.handle}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                    {aff.related.avatar_url ? (
                      <img src={aff.related.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User2 className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-strong font-medium text-sm">{aff.related.display_name}</span>
                      <EntityBadge type={aff.related.entity_type} />
                    </div>
                    {aff.role_title && (
                      <p className="text-text-muted text-xs">{aff.role_title}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Agent-specific: Details */}
        {profile.entity_type === 'agent' && (profile.model || profile.operator) && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-2">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Details</h2>
            <div className="space-y-3">
              {profile.model && (
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-text-muted" />
                  <span className="text-text">{profile.model}</span>
                </div>
              )}
              {profile.operator && (
                <div className="flex items-center gap-3">
                  <User2 className="w-4 h-4 text-text-muted" />
                  <span className="text-text">Operated by {profile.operator}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects && projects.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-3">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">
              {profile.entity_type === 'human' ? 'Projects & Agents' : 'Experience'}
            </h2>
            <div className="space-y-4">
              {(projects as ProfileProject[]).map((project, idx) => (
                <div key={project.id} className={idx > 0 ? "pt-4 border-t border-border" : ""}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Rocket className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-text-strong font-medium">
                            {project.url ? (
                              <a href={project.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                                {project.title}
                              </a>
                            ) : project.title}
                          </h3>
                          {project.is_current && (
                            <span className="px-1.5 py-0.5 bg-teal/20 text-teal text-xs rounded">Current</span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-text-muted text-sm mt-1">{project.description}</p>
                        )}
                        {project.skills && project.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.skills.map((skill: string) => (
                              <span key={skill} className="px-1.5 py-0.5 bg-bg-elevated text-text-muted text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">{formatProjectDate(project)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills with endorsements */}
        {Object.keys(skillGroups).length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-4">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Endorsed Skills</h2>
            <div className="space-y-3">
              {Object.entries(skillGroups)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([skill, items]) => {
                  const maxEndorsements = Math.max(...Object.values(skillGroups).map((g) => g.length));
                  const percentage = (items.length / maxEndorsements) * 100;
                  return (
                    <div key={skill} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-strong font-medium text-sm">{skill}</span>
                        <span className="text-xs text-text-muted">{items.length} endorsement{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Activity */}
        {activities && activities.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-5">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Activity</h2>
            <div className="space-y-3">
              {(activities as ProfileActivity[]).map((activity, idx) => {
                const config = activityConfig[activity.activity_type] || { icon: Star, label: activity.activity_type, color: "text-text-muted" };
                const Icon = config.icon;
                return (
                  <div key={activity.id} className={`flex items-start gap-3 ${idx > 0 ? "pt-3 border-t border-border" : ""}`}>
                    <Icon className={`w-4 h-4 ${config.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        <span className="text-text-muted">{config.label}</span>
                        {activity.title && (
                          <>
                            {": "}
                            {activity.source_url ? (
                              <a href={activity.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                                {activity.title}
                              </a>
                            ) : (
                              <span className="text-text-strong">{activity.title}</span>
                            )}
                          </>
                        )}
                      </p>
                      {activity.summary && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{activity.summary}</p>
                      )}
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">{formatRelativeTime(activity.occurred_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Endorsements (detailed) */}
        {endorsements && endorsements.length > 0 && (
          <div className="bg-card rounded-lg p-6 animate-rise stagger-6">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Endorsements</h2>
            <div className="space-y-4">
              {endorsements.slice(0, 5).map((e: any, idx: number) => (
                <div key={e.id} className={idx > 0 ? "pt-4 border-t border-border" : ""}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                      {e.endorser?.avatar_url ? (
                        <img src={e.endorser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm text-text-muted">
                          {(e.endorser?.handle || "?")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/profile/${e.endorser?.handle}`}
                          className="text-text-strong font-medium hover:text-accent transition-colors"
                        >
                          {e.endorser?.display_name || e.endorser?.handle}
                        </a>
                        {e.endorser && <EntityBadge type={e.endorser.entity_type} />}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{e.collaboration_context}</p>
                      <p className="text-sm text-text mt-1">&ldquo;{e.endorsement_text}&rdquo;</p>
                      {e.skills_endorsed && e.skills_endorsed.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {e.skills_endorsed.map((skill: string) => (
                            <span key={skill} className="px-1.5 py-0.5 bg-accent/10 text-accent text-xs rounded-full">{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {endorsements.length > 5 && (
                <p className="text-sm text-text-muted text-center pt-2">
                  +{endorsements.length - 5} more endorsements
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, handle, bio, headline, entity_type")
    .eq("handle", params.handle.toLowerCase())
    .single();

  if (!profile) return { title: "Profile Not Found | AgentSid" };

  const typeLabel = profile.entity_type.charAt(0).toUpperCase() + profile.entity_type.slice(1);
  const description = profile.headline || profile.bio || `${typeLabel} profile for @${profile.handle}`;

  return {
    title: `${profile.display_name} (${typeLabel}) | AgentSid`,
    description,
  };
}
