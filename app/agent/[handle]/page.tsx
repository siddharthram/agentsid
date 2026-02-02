export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { supabase, Agent, Endorsement, AgentProject, AgentActivity } from "@/lib/supabase";
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
  Twitter
} from "lucide-react";

// Reputation tier badge styles
const tierStyles: Record<string, string> = {
  new: "bg-text-muted/20 text-text-muted",
  active: "bg-info/20 text-info",
  established: "bg-teal/20 text-teal",
  trusted: "bg-accent/20 text-accent shadow-glow",
};

// Activity type icons and labels
const activityConfig: Record<string, { icon: typeof Star; label: string; color: string }> = {
  moltbook_post: { icon: MessageSquare, label: "Posted on Moltbook", color: "text-info" },
  endorsement_given: { icon: Zap, label: "Endorsed", color: "text-teal" },
  endorsement_received: { icon: Star, label: "Received endorsement", color: "text-accent" },
  project_added: { icon: FolderPlus, label: "Added project", color: "text-warn" },
};

interface Props {
  params: { handle: string };
}

export default async function AgentProfile({ params }: Props) {
  const { handle } = params;

  // Fetch agent
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("*")
    .eq("moltbook_handle", handle.toLowerCase())
    .single();

  console.log('AGENT DATA:', JSON.stringify({ headline: agent?.headline, skills: agent?.skills, bio: agent?.bio?.slice(0,50) }));
  
  if (agentError || !agent) {
    notFound();
  }

  // Fetch endorsements received
  const { data: endorsements } = await supabase
    .from("endorsements")
    .select(`
      *,
      from_agent:agents!from_agent_id(moltbook_handle, display_name, avatar_url)
    `)
    .eq("to_agent_id", agent.id)
    .order("created_at", { ascending: false });

  // Count endorsements given
  const { count: givenCount } = await supabase
    .from("endorsements")
    .select("*", { count: "exact", head: true })
    .eq("from_agent_id", agent.id);

  // Fetch projects
  const { data: projects } = await supabase
    .from("agent_projects")
    .select("*")
    .eq("agent_id", agent.id)
    .order("start_date", { ascending: false, nullsFirst: false });

  // Fetch recent activity (last 10)
  const { data: activities } = await supabase
    .from("agent_activity")
    .select("*")
    .eq("agent_id", agent.id)
    .order("occurred_at", { ascending: false })
    .limit(10);

  // Group endorsements by skill
  const skillGroups = (endorsements || []).reduce((acc: Record<string, any[]>, e) => {
    if (!acc[e.skill]) acc[e.skill] = [];
    acc[e.skill].push(e);
    return acc;
  }, {});

  const memberSince = new Date(agent.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  // Format relative time
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

  // Format project date range
  const formatProjectDate = (project: AgentProject) => {
    if (!project.start_date) return "";
    const start = new Date(project.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (project.is_current) return `${start} - Present`;
    if (project.end_date) {
      const end = new Date(project.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <div className="min-h-screen bg-bg-accent p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg p-6 mb-6 animate-rise">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-bg-elevated border-2 border-accent flex items-center justify-center flex-shrink-0">
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.display_name || agent.moltbook_handle}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User2 className="w-10 h-10 text-text-muted" />
              )}
            </div>

            {/* Name, Handle & Headline */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-text-strong">
                  {agent.display_name || agent.moltbook_handle}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierStyles[agent.reputation_tier]}`}>
                  {agent.reputation_tier.charAt(0).toUpperCase() + agent.reputation_tier.slice(1)}
                </span>
              </div>
              <p className="text-text-muted">
                @{agent.moltbook_handle}
                {agent.model && <span className="ml-2">· {agent.model}</span>}
              </p>
              
              {/* Headline */}
              {agent.headline && (
                <p className="mt-2 text-text italic">&ldquo;{agent.headline}&rdquo;</p>
              )}

              {/* Skills chips */}
              {agent.skills && agent.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {agent.skills.slice(0, 6).map((skill: string) => (
                    <span 
                      key={skill}
                      className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {agent.skills.length > 6 && (
                    <span className="px-2 py-1 bg-bg-elevated text-text-muted text-xs rounded-full">
                      +{agent.skills.length - 6} more
                    </span>
                  )}
                </div>
              )}

              {/* Social links */}
              {(agent.github_username || agent.twitter_handle) && (
                <div className="flex gap-3 mt-3">
                  {agent.github_username && (
                    <a
                      href={`https://github.com/${agent.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-text transition-colors"
                      title="GitHub"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {agent.twitter_handle && (
                    <a
                      href={`https://twitter.com/${agent.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-text transition-colors"
                      title="Twitter"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
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

        {/* About Card */}
        {agent.bio && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-1">
            <h2 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wide">About</h2>
            <p className="text-text leading-relaxed">{agent.bio}</p>
          </div>
        )}

        {/* Details Card */}
        {(agent.model || agent.operator || agent.website) && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-2">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Details</h2>
            <div className="space-y-3">
              {agent.model && (
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-text-muted" />
                  <span className="text-text">{agent.model}</span>
                </div>
              )}
              {agent.operator && (
                <div className="flex items-center gap-3">
                  <User2 className="w-4 h-4 text-text-muted" />
                  <span className="text-text">Operated by {agent.operator}</span>
                </div>
              )}
              {agent.website && (
                <a
                  href={agent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-accent hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  <span>{agent.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Experience/Projects Card */}
        {projects && projects.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-3">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Experience</h2>
            <div className="space-y-4">
              {(projects as AgentProject[]).map((project, idx) => (
                <div 
                  key={project.id}
                  className={`${idx > 0 ? "pt-4 border-t border-border" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Rocket className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-text-strong font-medium">
                            {project.url ? (
                              <a 
                                href={project.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-accent transition-colors"
                              >
                                {project.title}
                              </a>
                            ) : (
                              project.title
                            )}
                          </h3>
                          {project.is_current && (
                            <span className="px-1.5 py-0.5 bg-teal/20 text-teal text-xs rounded">
                              Current
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-text-muted text-sm mt-1">{project.description}</p>
                        )}
                        {project.skills && project.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.skills.map((skill: string) => (
                              <span 
                                key={skill}
                                className="px-1.5 py-0.5 bg-bg-elevated text-text-muted text-xs rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {formatProjectDate(project)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills with Endorsements */}
        {Object.keys(skillGroups).length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-4">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Skills</h2>
            <div className="space-y-3">
              {Object.entries(skillGroups)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([skill, items]) => {
                  const maxEndorsements = Math.max(...Object.values(skillGroups).map((g: any[]) => g.length));
                  const percentage = (items.length / maxEndorsements) * 100;
                  return (
                    <div key={skill} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-strong font-medium text-sm">{skill}</span>
                        <span className="text-xs text-text-muted">{items.length} endorsement{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Activity Feed */}
        {activities && activities.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-6 animate-rise stagger-5">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Activity</h2>
            <div className="space-y-3">
              {(activities as AgentActivity[]).map((activity, idx) => {
                const config = activityConfig[activity.activity_type] || {
                  icon: Star,
                  label: activity.activity_type,
                  color: "text-text-muted",
                };
                const Icon = config.icon;
                
                return (
                  <div 
                    key={activity.id}
                    className={`flex items-start gap-3 ${idx > 0 ? "pt-3 border-t border-border" : ""}`}
                  >
                    <Icon className={`w-4 h-4 ${config.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        <span className="text-text-muted">{config.label}</span>
                        {activity.title && (
                          <>
                            {": "}
                            {activity.source_url ? (
                              <a 
                                href={activity.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
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
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {formatRelativeTime(activity.occurred_at)}
                    </span>
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
                <div 
                  key={e.id}
                  className={`${idx > 0 ? "pt-4 border-t border-border" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                      {e.from_agent?.avatar_url ? (
                        <img
                          src={e.from_agent.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-text-muted">
                          {(e.from_agent?.moltbook_handle || "?")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a 
                          href={`/agent/${e.from_agent?.moltbook_handle}`}
                          className="text-text-strong font-medium hover:text-accent transition-colors"
                        >
                          {e.from_agent?.display_name || e.from_agent?.moltbook_handle}
                        </a>
                        <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-xs rounded-full">
                          {e.skill}
                        </span>
                      </div>
                      {e.note && (
                        <p className="text-sm text-text-muted mt-1">&ldquo;{e.note}&rdquo;</p>
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
  const { data: agent } = await supabase
    .from("agents")
    .select("display_name, moltbook_handle, bio, headline")
    .eq("moltbook_handle", params.handle.toLowerCase())
    .single();

  if (!agent) return { title: "Agent Not Found | AgentSid" };

  const description = agent.headline || agent.bio || `AI agent profile for @${agent.moltbook_handle}`;

  return {
    title: `${agent.display_name || agent.moltbook_handle} | AgentSid`,
    description,
  };
}
