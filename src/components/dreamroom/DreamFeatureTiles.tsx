import React from 'react';

interface DreamFeatureTilesProps {
  onNavigate: (view: 'calendar' | 'vault' | 'games' | 'main') => void;
}

const tiles = [
  { label: 'Calendar', emoji: '📅', view: 'calendar' as const },
  { label: 'Love Vault', emoji: '🔐', view: 'vault' as const },
  { label: 'Games', emoji: '🎮', view: 'games' as const },
  { label: 'Playlist', emoji: '🎵', view: 'main' as const },
];

export const DreamFeatureTiles: React.FC<DreamFeatureTilesProps> = ({ onNavigate }) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((t) => (
        <button key={t.label} onClick={() => onNavigate(t.view)}
          className="rounded-xl p-3 text-center transition-all duration-300 hover:scale-105 active:scale-95 group"
          style={{
            background: 'linear-gradient(135deg, hsla(320 40% 15% / 0.4), hsla(270 30% 12% / 0.4))',
            border: '1px solid hsla(320 60% 50% / 0.1)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 12px hsla(0 0% 0% / 0.15)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'hsla(320, 80%, 60%, 0.35)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px hsla(320, 60%, 40%, 0.2), 0 0 12px hsla(320, 80%, 60%, 0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'hsla(320, 60%, 50%, 0.1)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px hsla(0, 0%, 0%, 0.15)';
          }}
        >
          <div className="text-xl mb-0.5">{t.emoji}</div>
          <p className="text-[10px] font-medium text-white/70 group-hover:text-white/90 transition-colors">{t.label}</p>
        </button>
      ))}
    </div>
  );
};
