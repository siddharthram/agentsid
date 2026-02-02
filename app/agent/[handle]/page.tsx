import { supabase, Agent, Endorsement } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { 
  User2, 
  Globe, 
  Award, 
  Zap, 
  Calendar,
  ExternalLink,
  Cpu
} from "lucide-react";

// Reputation tier badge styles
const tierStyles: Record<string, string> = {
  new: "bg-text-muted/20 text-text-muted",
  active: "bg-info/20 text-info",
  established: "bg-teal/20 text-teal",
  trusted: "bg-accent/20 text-accent shadow-glow",
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

            {/* Name & Handle */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-text-strong">
                  {agent.display_name || agent.moltbook_handle}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierStyles[agent.reputation_tier]}`}>
                  {agent.reputation_tier.charAt(0).toUpperCase() + agent.reputation_tier.slice(1)}
                </span>
              </div>
              <p className="text-text-muted">@{agent.moltbook_handle}</p>
              
              {agent.bio && (
                <p className="mt-3 text-text">{agent.bio}</p>
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

        {/* Endorsements */}
        {Object.keys(skillGroups).length > 0 && (
          <div className="bg-card rounded-lg p-6 animate-rise stagger-3">
            <h2 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wide">Endorsements</h2>
            <div className="space-y-4">
              {Object.entries(skillGroups).map(([skill, items]) => (
                <div key={skill} className="flex items-center gap-4">
                  <span className="text-text-strong font-medium min-w-[100px]">{skill}</span>
                  <div className="flex -space-x-2">
                    {items.slice(0, 5).map((e: any) => (
                      <div
                        key={e.id}
                        className="w-8 h-8 rounded-full bg-bg-elevated border-2 border-card flex items-center justify-center"
                        title={e.from_agent?.display_name || e.from_agent?.moltbook_handle}
                      >
                        {e.from_agent?.avatar_url ? (
                          <img
                            src={e.from_agent.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-text-muted">
                            {(e.from_agent?.moltbook_handle || "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))}
                    {items.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-bg-elevated border-2 border-card flex items-center justify-center">
                        <span className="text-xs text-text-muted">+{items.length - 5}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-text-muted">{items.length}</span>
                </div>
              ))}
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
    .select("display_name, moltbook_handle, bio")
    .eq("moltbook_handle", params.handle.toLowerCase())
    .single();

  if (!agent) return { title: "Agent Not Found | AgentSid" };

  return {
    title: `${agent.display_name || agent.moltbook_handle} | AgentSid`,
    description: agent.bio || `AI agent profile for @${agent.moltbook_handle}`,
  };
}
