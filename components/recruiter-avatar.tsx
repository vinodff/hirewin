'use client';

/**
 * RecruiterAvatar — SVG talking head for the mock interview.
 *
 * openness: 0 (mouth closed) → 1 (wide open)
 * speaking: drives subtle head micro-bob
 * phase:    'idle' | 'speaking' | 'thinking' | 'listening'
 */

type Phase = 'idle' | 'speaking' | 'thinking' | 'listening';

interface RecruiterAvatarProps {
  openness?: number;   // 0–1
  phase?: Phase;
}

// ── Palette ────────────────────────────────────────────────
const SKIN       = '#C8885A';
const SKIN_S     = '#B57244';   // shadow / deeper tone
const HAIR       = '#0C0806';
const EYE_IRIS   = '#3C2010';
const LIP_TOP    = '#A05040';
const LIP_BOT    = '#B06050';
const SHIRT      = '#1A2F50';
const COLLAR     = '#F2F2F0';
const TEETH_UP   = '#F5F0E8';
const TEETH_DN   = '#EDE8DC';
const MOUTH_DARK = '#280808';

export default function RecruiterAvatar({
  openness = 0,
  phase = 'idle',
}: RecruiterAvatarProps) {
  // Clamp openness 0–1
  const o = Math.max(0, Math.min(1, openness));

  // Mouth geometry (all driven by o)
  const ulY      = 158;                          // upper lip Y baseline
  const gap      = o * 22;                       // 0 → 22 px gap
  const llY      = ulY + 10 + gap;               // lower lip Y
  const cavCy    = ulY + gap / 2 + 4;           // cavity ellipse center Y
  const cavRy    = Math.max(0.5, gap / 2 + 4);  // cavity ellipse ry
  const showTeeth = o > 0.28;

  // Whether to show "thinking" dot pupils
  const thinking = phase === 'thinking';

  return (
    <svg
      viewBox="0 0 200 240"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        {/* Eye blink animation */}
        <style>{`
          @keyframes av-blink {
            0%, 85%, 100% { transform: scaleY(1); }
            92% { transform: scaleY(0.06); }
          }
          .av-eyelid-l { transform-origin: 72px 107px; animation: av-blink 4.2s ease-in-out infinite; }
          .av-eyelid-r { transform-origin: 128px 107px; animation: av-blink 4.2s ease-in-out infinite 0.06s; }

          @keyframes av-bob {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-2px); }
          }
          .av-face-group { animation: ${phase === 'speaking' ? 'av-bob 0.55s ease-in-out infinite' : 'none'}; }
        `}</style>

        {/* Clip for mouth interior */}
        <clipPath id="av-mouth-clip">
          <ellipse cx="100" cy={cavCy} rx="24" ry={cavRy} />
        </clipPath>

        {/* Soft shadow filter */}
        <filter id="av-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00000055" />
        </filter>
      </defs>

      {/* ── Neck ──────────────────────────────────────────── */}
      <rect x="85" y="200" width="30" height="40" rx="4" fill={SKIN} />

      {/* ── Shirt + collar ────────────────────────────────── */}
      {/* Shirt body */}
      <path d="M0 240 L0 218 L72 212 L100 230 L128 212 L200 218 L200 240 Z" fill={SHIRT} />
      {/* White collar V */}
      <path d="M87 212 L100 230 L113 212 L105 212 L100 225 L95 212 Z" fill={COLLAR} />

      {/* ── Hair silhouette behind face ────────────────────── */}
      <ellipse cx="100" cy="112" rx="80" ry="95" fill={HAIR} />

      {/* ── FACE GROUP (micro-bob when speaking) ──────────── */}
      <g className="av-face-group">

        {/* Face oval */}
        <ellipse cx="100" cy="120" rx="72" ry="86" fill={SKIN} filter="url(#av-shadow)" />

        {/* Cheek blush */}
        <ellipse cx="64"  cy="138" rx="14" ry="9" fill="#E8705A" opacity="0.13" />
        <ellipse cx="136" cy="138" rx="14" ry="9" fill="#E8705A" opacity="0.13" />

        {/* Face contour shade */}
        <ellipse cx="100" cy="132" rx="55" ry="66" fill={SKIN_S} opacity="0.07" />

        {/* ── Hair front ────────────────────────────────────── */}
        {/* Top cap */}
        <ellipse cx="100" cy="40"  rx="74" ry="54" fill={HAIR} />
        {/* Left side sweep */}
        <path d="M28 75 Q18 120 26 155" stroke={HAIR} fill="none" strokeWidth="24" strokeLinecap="round" />
        {/* Right side sweep */}
        <path d="M172 75 Q182 120 174 155" stroke={HAIR} fill="none" strokeWidth="24" strokeLinecap="round" />

        {/* ── Eyebrows ────────────────────────────────────── */}
        <path d="M55 91 Q69 84 82 87"  stroke={HAIR} fill="none" strokeWidth="3" strokeLinecap="round" />
        <path d="M118 87 Q131 84 145 91" stroke={HAIR} fill="none" strokeWidth="3" strokeLinecap="round" />

        {/* ── LEFT EYE ──────────────────────────────────────── */}
        <ellipse cx="72" cy="107" rx="13" ry="10" fill="white" />
        {/* Iris */}
        <circle cx={thinking ? 70 : 73} cy="108" r="7"   fill={EYE_IRIS} />
        {/* Pupil */}
        <circle cx={thinking ? 70 : 73} cy="108" r="4.2" fill="#090705" />
        {/* Highlight */}
        <circle cx={thinking ? 72 : 75} cy="105" r="1.6" fill="white" />
        {/* Eyelid (blink) */}
        <ellipse className="av-eyelid-l" cx="72" cy="107" rx="14" ry="10.5" fill={SKIN} />

        {/* ── RIGHT EYE ─────────────────────────────────────── */}
        <ellipse cx="128" cy="107" rx="13" ry="10" fill="white" />
        <circle cx={thinking ? 130 : 127} cy="108" r="7"   fill={EYE_IRIS} />
        <circle cx={thinking ? 130 : 127} cy="108" r="4.2" fill="#090705" />
        <circle cx={thinking ? 132 : 129} cy="105" r="1.6" fill="white" />
        <ellipse className="av-eyelid-r" cx="128" cy="107" rx="14" ry="10.5" fill={SKIN} />

        {/* ── Nose ──────────────────────────────────────────── */}
        <path d="M97 120 L93 142 Q100 149 107 142 L103 120"
          fill="none" stroke={SKIN_S} strokeWidth="1.5" opacity="0.55" />
        <ellipse cx="94"  cy="143" rx="4.5" ry="3.5" fill={SKIN_S} opacity="0.3" />
        <ellipse cx="106" cy="143" rx="4.5" ry="3.5" fill={SKIN_S} opacity="0.3" />

        {/* ── MOUTH ─────────────────────────────────────────── */}

        {/* Dark mouth cavity */}
        <ellipse cx="100" cy={cavCy} rx="22" ry={cavRy} fill={MOUTH_DARK} />

        {/* Upper teeth */}
        {showTeeth && (
          <rect
            x="80" y={ulY - 1} width="40" height="8" rx="3"
            fill={TEETH_UP} clipPath="url(#av-mouth-clip)"
          />
        )}

        {/* Lower teeth */}
        {showTeeth && gap > 8 && (
          <rect
            x="82" y={llY - 7} width="36" height="7" rx="2"
            fill={TEETH_DN} opacity="0.88" clipPath="url(#av-mouth-clip)"
          />
        )}

        {/* Upper lip — Cupid's bow */}
        <path
          d={[
            `M76 ${ulY}`,
            `Q87 ${ulY - 7} 100 ${ulY - 5}`,
            `Q113 ${ulY - 7} 124 ${ulY}`,
            `Q113 ${ulY + 2} 100 ${ulY + 3.5}`,
            `Q87 ${ulY + 2} 76 ${ulY}`,
            'Z',
          ].join(' ')}
          fill={LIP_TOP}
        />

        {/* Lower lip — fuller */}
        <path
          d={[
            `M78 ${llY - 2}`,
            `Q100 ${llY + 8} 122 ${llY - 2}`,
            `Q100 ${llY + 3} 78 ${llY - 2}`,
            'Z',
          ].join(' ')}
          fill={LIP_BOT}
        />

        {/* Chin shadow */}
        <ellipse cx="100" cy="197" rx="26" ry="5.5" fill={SKIN_S} opacity="0.1" />

      </g>{/* end av-face-group */}
    </svg>
  );
}
