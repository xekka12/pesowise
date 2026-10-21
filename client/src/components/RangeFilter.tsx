import { DATE_PRESETS, rangeForPreset, type DatePresetId } from '@pesowise/shared';

export function RangeFilter({
  preset,
  from,
  to,
  onChange,
}: {
  preset: DatePresetId;
  from: string;
  to: string;
  onChange: (next: { preset: DatePresetId; from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {DATE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={preset === item.id}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${preset === item.id ? 'bg-navy-900 text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'}`}
            onClick={() => {
              if (item.id === 'custom') onChange({ preset: 'custom', from, to });
              else onChange({ preset: item.id, ...rangeForPreset(item.id) });
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-muted">
            From
            <input className="ml-2 rounded-lg border border-line bg-white px-2 py-1.5 text-ink" type="date" value={from} onChange={(event) => onChange({ preset: 'custom', from: event.target.value, to })} />
          </label>
          <label className="text-sm text-muted">
            To
            <input className="ml-2 rounded-lg border border-line bg-white px-2 py-1.5 text-ink" type="date" value={to} onChange={(event) => onChange({ preset: 'custom', from, to: event.target.value })} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
