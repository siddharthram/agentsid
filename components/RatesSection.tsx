import { DollarSign } from 'lucide-react';
import { Rate } from '@/lib/supabase';

function formatRate(rate: Rate): string {
  const currency = rate.currency === 'USD' ? '$' : rate.currency === 'EUR' ? '€' : rate.currency === 'GBP' ? '£' : rate.currency + ' ';
  const unit = rate.rate_unit === 'custom' ? rate.custom_unit || '' : rate.rate_unit;

  if (rate.rate_min != null && rate.rate_max != null) {
    return `${currency}${Number(rate.rate_min).toLocaleString()}–${Number(rate.rate_max).toLocaleString()} / ${unit}`;
  }
  if (rate.rate_min != null) {
    return `${currency}${Number(rate.rate_min).toLocaleString()}+ / ${unit}`;
  }
  if (rate.rate_max != null) {
    return `Up to ${currency}${Number(rate.rate_max).toLocaleString()} / ${unit}`;
  }
  return `Contact for pricing`;
}

interface RatesSectionProps {
  rates: Rate[];
}

export default function RatesSection({ rates }: RatesSectionProps) {
  if (!rates || rates.length === 0) return null;

  const anyAvailable = rates.some(r => r.is_available);

  return (
    <div className="bg-card rounded-lg p-6 animate-rise">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Rates
        </h2>
        {anyAvailable && (
          <span className="px-2 py-0.5 bg-ok/15 text-ok text-xs rounded-full font-medium">
            ✅ Available
          </span>
        )}
      </div>
      <div className="space-y-3">
        {rates
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((rate) => (
            <div key={rate.id} className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-text-strong font-medium text-sm">{rate.service_name}</p>
                {rate.description && (
                  <p className="text-text-muted text-xs mt-0.5">{rate.description}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-accent font-semibold text-sm">{formatRate(rate)}</p>
                {rate.turnaround && (
                  <p className="text-text-muted text-xs">{rate.turnaround}</p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
