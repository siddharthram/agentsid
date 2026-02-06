import { Bot, User2, Building2 } from 'lucide-react';
import { EntityType } from '@/lib/supabase';

const config: Record<EntityType, { icon: typeof Bot; label: string; bg: string; text: string }> = {
  agent: { icon: Bot, label: 'Agent', bg: 'bg-accent/15', text: 'text-accent' },
  human: { icon: User2, label: 'Human', bg: 'bg-info/15', text: 'text-info' },
  org: { icon: Building2, label: 'Org', bg: 'bg-teal/15', text: 'text-teal' },
};

interface EntityBadgeProps {
  type: EntityType;
  size?: 'sm' | 'md';
  verified?: boolean;
}

export default function EntityBadge({ type, size = 'sm', verified = false }: EntityBadgeProps) {
  const { icon: Icon, label, bg, text } = config[type];
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-sm gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span className={`inline-flex items-center ${sizeClasses} ${bg} ${text} rounded-full font-medium`}>
      <Icon className={iconSize} />
      {label}
      {verified && <span className="ml-0.5">✓</span>}
    </span>
  );
}
