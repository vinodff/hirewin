'use client';

/**
 * RecruiterAvatar — realistic SVG talking head with office background.
 *
 * openness : 0 (closed) → 1 (wide open)  — drives lip sync
 * phase    : 'idle' | 'speaking' | 'thinking' | 'listening'
 */

type AvatarPhase = 'idle' | 'speaking' | 'thinking' | 'listening';

interface RecruiterAvatarProps {
  openness?: number;
  phase?: AvatarPhase;
}

export default function RecruiterAvatar({
  openness = 0,
  phase    = 'idle',
}: RecruiterAvatarProps) {
  const o  = Math.max(0, Math.min(1, openness));
  const gap = o * 20;

  // Mouth geometry
  const ulY    = 159;
  const llY    = ulY + 9 + gap;
  const cavCy  = ulY + gap / 2 + 4;
  const cavRy  = Math.max(0.8, gap / 2 + 4);
  const teeth  = o > 0.3;

  // Eye direction shift when thinking
  const eyeShiftX = phase === 'thinking' ? -3 : 0;

  const bobAnim = phase === 'speaking'
    ? 'av-bob 0.52s ease-in-out infinite'
    : 'none';

  return (
    <svg
      viewBox="0 0 200 250"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* ── Animations ──────────────────────────────── */}
        <style>{`
          @keyframes av-blink {
            0%, 78%, 100% { transform: scaleY(0); }
            84%, 90%      { transform: scaleY(1); }
          }
          @keyframes av-bob {
            0%,100% { transform: translateY(0px);  }
            50%     { transform: translateY(-2.5px); }
          }
          /* Lid hinge at top edge of eye (cy=98 = eye_cy - eye_ry) */
          .av-lid-l { transform-origin: 72px 98px; animation: av-blink 4s ease-in-out infinite; }
          .av-lid-r { transform-origin: 128px 98px; animation: av-blink 4s ease-in-out infinite 0.07s; }
          .av-body  { animation: ${bobAnim}; }
        `}</style>

        {/* ── Gradients ───────────────────────────────── */}

        {/* Skin — warm radial, lit from upper-left */}
        <radialGradient id="av-skin" cx="38%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#EBB07C" />
          <stop offset="45%"  stopColor="#D09262" />
          <stop offset="100%" stopColor="#A06838" />
        </radialGradient>

        {/* Skin shadow (sides / jaw) */}
        <radialGradient id="av-skin-sh" cx="50%" cy="50%" r="50%">
          <stop offset="60%"  stopColor="transparent" />
          <stop offset="100%" stopColor="#6B3A1880" />
        </radialGradient>

        {/* Iris gradient */}
        <radialGradient id="av-iris-l" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#6B4020" />
          <stop offset="100%" stopColor="#281008" />
        </radialGradient>
        <radialGradient id="av-iris-r" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#6B4020" />
          <stop offset="100%" stopColor="#281008" />
        </radialGradient>

        {/* Hair highlight */}
        <linearGradient id="av-hair-hl" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor="#2A1808" />
          <stop offset="40%"  stopColor="#0C0604" />
          <stop offset="100%" stopColor="#060402" />
        </linearGradient>

        {/* Jacket */}
        <linearGradient id="av-jacket" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1C3055" />
          <stop offset="100%" stopColor="#0E1E38" />
        </linearGradient>

        {/* Window glow */}
        <linearGradient id="av-win" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#3D6090" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1A3058" stopOpacity="0.3" />
        </linearGradient>

        {/* Ambient room light from window spilling on face */}
        <radialGradient id="av-win-spill" cx="90%" cy="20%" r="80%">
          <stop offset="0%"   stopColor="#6090C840" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        {/* Lip upper */}
        <linearGradient id="av-lip-up" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#B06050" />
          <stop offset="100%" stopColor="#8C3E30" />
        </linearGradient>

        {/* Lip lower */}
        <linearGradient id="av-lip-dn" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#C07060" />
          <stop offset="100%" stopColor="#A05040" />
        </linearGradient>

        {/* Background blur filter */}
        <filter id="av-bg-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>

        {/* Drop shadow for face */}
        <filter id="av-face-sh" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#00000060" />
        </filter>

        {/* Vignette clip */}
        <radialGradient id="av-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="55%"  stopColor="transparent" />
          <stop offset="100%" stopColor="#00000070" />
        </radialGradient>

        {/* Mouth clip */}
        <clipPath id="av-mc">
          <ellipse cx="100" cy={cavCy} rx="23" ry={cavRy} />
        </clipPath>
      </defs>

      {/* ════════════════════════════════════════════════
          BACKGROUND — office / meeting room scene
      ════════════════════════════════════════════════ */}

      {/* Room wall */}
      <rect width="200" height="250" fill="#101828" />
      <rect width="200" height="200" fill="#141E30" />

      {/* Blurred bookshelf / art on left wall */}
      <g filter="url(#av-bg-blur)" opacity="0.7">
        <rect x="4"  y="18" width="52" height="88" rx="2" fill="#192440" />
        {/* Book spines */}
        <rect x="7"  y="22" width="7"  height="40" rx="1" fill="#2A4060" />
        <rect x="16" y="28" width="5"  height="34" rx="1" fill="#1E3858" />
        <rect x="23" y="20" width="8"  height="45" rx="1" fill="#253555" />
        <rect x="33" y="25" width="6"  height="38" rx="1" fill="#304868" />
        <rect x="41" y="22" width="7"  height="42" rx="1" fill="#1A2E4A" />
        <rect x="50" y="30" width="5"  height="30" rx="1" fill="#2C4060" />
        {/* Shelf boards */}
        <rect x="4"  y="62" width="52" height="3"  fill="#0E1826" opacity="0.8" />
        <rect x="4"  y="22" width="52" height="3"  fill="#0E1826" opacity="0.6" />
        {/* Small decorative item */}
        <rect x="8"  y="68" width="12" height="20" rx="2" fill="#253050" />
        <rect x="22" y="72" width="8"  height="16" rx="1" fill="#1E2840" />
      </g>

      {/* Window — right side, main light source */}
      <rect x="148" y="0" width="52" height="115" fill="url(#av-win)" />
      {/* Window frame */}
      <rect x="148" y="0" width="3" height="115" fill="#0A1020" opacity="0.6" />
      <rect x="148" y="56" width="52" height="3"  fill="#0A1020" opacity="0.4" />
      {/* Window glow bleeding into room */}
      <ellipse cx="200" cy="50" rx="80" ry="70" fill="#4080C025" />

      {/* Ambient light spill on whole scene from window */}
      <rect width="200" height="250" fill="url(#av-win-spill)" />

      {/* Floor / desk surface at bottom */}
      <rect x="0"  y="218" width="200" height="32" fill="#0C1520" />
      <rect x="0"  y="216" width="200" height="5"  fill="#182030" />
      {/* Desk edge highlight */}
      <rect x="0"  y="216" width="200" height="1"  fill="#2A3A50" opacity="0.5" />

      {/* ════════════════════════════════════════════════
          PERSON — neck, suit, then face
      ════════════════════════════════════════════════ */}
      <g className="av-body">

        {/* Neck */}
        <rect x="86" y="198" width="28" height="22" fill="url(#av-skin)" />
        {/* Neck shadow sides */}
        <rect x="86" y="198" width="6"  height="22" fill="#80401880" />
        <rect x="108" y="198" width="6" height="22" fill="#80401880" />

        {/* ── Suit jacket ─────────────────────────────── */}
        {/* Main body */}
        <path d="M0 250 L0 218 L62 208 L88 218 L100 236 L112 218 L138 208 L200 218 L200 250 Z"
          fill="url(#av-jacket)" />
        {/* Left lapel (viewer right) */}
        <path d="M112 218 L100 236 L100 250 L140 250 L140 228 Z" fill="#162848" />
        {/* Right lapel (viewer left) */}
        <path d="M88 218 L100 236 L100 250 L60 250 L60 228 Z" fill="#182A4A" />
        {/* Lapel edge highlight */}
        <path d="M88 218 L100 236 L112 218" fill="none" stroke="#2A4060" strokeWidth="0.5" />
        {/* Shirt collar in V-gap */}
        <path d="M88 218 L100 236 L112 218 L108 218 L100 231 L92 218 Z" fill="#EEEAE4" />
        {/* Tie */}
        <path d="M99 218 L100 231 L101 218 L101.5 214 L100 216 L98.5 214 Z" fill="#7A1820" />
        {/* Jacket shoulder seam hints */}
        <line x1="0"   y1="218" x2="62"  y2="208" stroke="#2040608A" strokeWidth="0.7" />
        <line x1="200" y1="218" x2="138" y2="208" stroke="#2040608A" strokeWidth="0.7" />
        {/* Jacket pocket */}
        <rect x="30" y="225" width="22" height="3" rx="1" fill="#1A2E4A" />

        {/* ── HAIR — back silhouette ───────────────────── */}
        <path d="
          M 28 95
          Q 26 50  100 34
          Q 174 50 172 95
          Q 160 70 100 65
          Q 40 70 28 95 Z"
          fill="#0C0806" />
        {/* Side drapes — left */}
        <path d="
          M 28 95
          Q 20 120 22 155
          Q 28 162 33 154
          Q 30 128 34 100 Z"
          fill="#0C0806" />
        {/* Side drapes — right */}
        <path d="
          M 172 95
          Q 180 120 178 155
          Q 172 162 167 154
          Q 170 128 166 100 Z"
          fill="#0C0806" />

        {/* ── FACE OVAL ───────────────────────────────── */}
        <ellipse cx="100" cy="122" rx="69" ry="83"
          fill="url(#av-skin)" filter="url(#av-face-sh)" />
        {/* Side shadow overlay */}
        <ellipse cx="100" cy="122" rx="69" ry="83" fill="url(#av-skin-sh)" />
        {/* Window light tint on face */}
        <ellipse cx="115" cy="105" rx="45" ry="55" fill="#5080A015" />

        {/* Cheek blush */}
        <ellipse cx="66"  cy="140" rx="13" ry="8" fill="#CC6644" opacity="0.10" />
        <ellipse cx="134" cy="140" rx="13" ry="8" fill="#CC6644" opacity="0.10" />

        {/* ── HAIR — front overlay (hides face edges) ── */}
        {/* Top cap with highlight */}
        <path d="
          M 31 93
          Q 30 44 100 32
          Q 170 44 169 93
          Q 155 64 100 60
          Q 45 64 31 93 Z"
          fill="url(#av-hair-hl)" />
        {/* Hair highlight streak */}
        <path d="M 70 38 Q 85 34 100 33 Q 115 34 128 38"
          stroke="#2A1A0A" fill="none" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        {/* Left side front */}
        <path d="
          M 31 93
          Q 24 118 26 150
          Q 32 158 36 150
          Q 33 122 36 98 Z"
          fill="url(#av-hair-hl)" />
        {/* Right side front */}
        <path d="
          M 169 93
          Q 176 118 174 150
          Q 168 158 164 150
          Q 167 122 164 98 Z"
          fill="url(#av-hair-hl)" />

        {/* Ears */}
        <ellipse cx="32"  cy="125" rx="6" ry="9" fill="#C07848" />
        <ellipse cx="168" cy="125" rx="6" ry="9" fill="#C07848" />
        {/* Ear inner */}
        <ellipse cx="32"  cy="125" rx="3.5" ry="5.5" fill="#A86030" opacity="0.5" />
        <ellipse cx="168" cy="125" rx="3.5" ry="5.5" fill="#A86030" opacity="0.5" />

        {/* ── EYEBROWS ────────────────────────────────── */}
        {/* Left eyebrow — arched */}
        <path d="M 53 93 Q 65 85 80 88"
          stroke="#1C0C04" fill="none" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 53 93 Q 65 86 80 89"
          stroke="#3C1C08" fill="none" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        {/* Right eyebrow */}
        <path d="M 120 88 Q 135 85 147 93"
          stroke="#1C0C04" fill="none" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 120 89 Q 135 86 147 93"
          stroke="#3C1C08" fill="none" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

        {/* ── EYES ─────────────────────────────────────── */}

        {/* Left eye socket shadow */}
        <ellipse cx="72" cy="110" rx="16" ry="12" fill="#8B4A2820" />
        {/* Left eye white */}
        <ellipse cx="72" cy="108" rx="13.5" ry="10" fill="#F2F0EC" />
        {/* Left iris */}
        <circle cx={72 + eyeShiftX} cy="109" r="7.5" fill="url(#av-iris-l)" />
        {/* Iris lighter ring */}
        <circle cx={72 + eyeShiftX} cy="109" r="5.5" fill="none" stroke="#4A2812" strokeWidth="1" opacity="0.4" />
        {/* Left pupil */}
        <circle cx={72 + eyeShiftX} cy="109" r="4.5" fill="#080504" />
        {/* Catchlight */}
        <circle cx={74 + eyeShiftX} cy="106.5" r="1.8" fill="white" />
        <circle cx={70 + eyeShiftX} cy="111"   r="0.8" fill="white" opacity="0.4" />
        {/* Upper eyelid crease */}
        <path d="M 59 104 Q 72 100 85 104"
          stroke="#A07050" fill="none" strokeWidth="0.8" opacity="0.35" />
        {/* Upper lashes */}
        <path d="M 59 103 Q 72 99 85 103"
          stroke="#1A0A04" fill="none" strokeWidth="2" strokeLinecap="round" />
        {/* Lower lash line */}
        <path d="M 60 113 Q 72 116 84 113"
          stroke="#80402020" fill="none" strokeWidth="1" />
        {/* Blink eyelid — hinges from top of eye (cy=98), drops down to cover */}
        <ellipse className="av-lid-l" cx="72" cy="98" rx="14" ry="21" fill="url(#av-skin)" />

        {/* Right eye socket shadow */}
        <ellipse cx="128" cy="110" rx="16" ry="12" fill="#8B4A2820" />
        {/* Right eye white */}
        <ellipse cx="128" cy="108" rx="13.5" ry="10" fill="#F2F0EC" />
        {/* Right iris */}
        <circle cx={128 + eyeShiftX} cy="109" r="7.5" fill="url(#av-iris-r)" />
        <circle cx={128 + eyeShiftX} cy="109" r="5.5" fill="none" stroke="#4A2812" strokeWidth="1" opacity="0.4" />
        {/* Right pupil */}
        <circle cx={128 + eyeShiftX} cy="109" r="4.5" fill="#080504" />
        {/* Catchlight */}
        <circle cx={130 + eyeShiftX} cy="106.5" r="1.8" fill="white" />
        <circle cx={126 + eyeShiftX} cy="111"   r="0.8" fill="white" opacity="0.4" />
        {/* Upper lashes */}
        <path d="M 115 103 Q 128 99 141 103"
          stroke="#1A0A04" fill="none" strokeWidth="2" strokeLinecap="round" />
        <path d="M 116 113 Q 128 116 140 113"
          stroke="#80402020" fill="none" strokeWidth="1" />
        {/* Blink eyelid — hinges from top of eye (cy=98), drops down to cover */}
        <ellipse className="av-lid-r" cx="128" cy="98" rx="14" ry="21" fill="url(#av-skin)" />

        {/* ── NOSE ─────────────────────────────────────── */}
        {/* Bridge */}
        <path d="M 98 122 L 95 143" stroke="#8B4820" fill="none" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        <path d="M 102 122 L 105 143" stroke="#8B4820" fill="none" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        {/* Nose tip */}
        <ellipse cx="100" cy="146" rx="8" ry="5.5" fill="#B87040" opacity="0.25" />
        {/* Nostrils */}
        <ellipse cx="93"  cy="147" rx="5" ry="4" fill="#8B4020" opacity="0.35" />
        <ellipse cx="107" cy="147" rx="5" ry="4" fill="#8B4020" opacity="0.35" />
        {/* Nostril holes */}
        <ellipse cx="93"  cy="148" rx="3"   ry="2.5" fill="#3C1808" opacity="0.6" />
        <ellipse cx="107" cy="148" rx="3"   ry="2.5" fill="#3C1808" opacity="0.6" />
        {/* Philtrum */}
        <path d="M 96 151 Q 100 153 104 151"
          stroke="#8B4020" fill="none" strokeWidth="0.8" opacity="0.3" />

        {/* ── MOUTH ─────────────────────────────────────── */}

        {/* Mouth cavity */}
        <ellipse cx="100" cy={cavCy} rx="21" ry={cavRy} fill="#1E0606" />

        {/* Upper teeth */}
        {teeth && (
          <rect x="82" y={ulY} width="36" height="8" rx="2.5"
            fill="#F0EBE0" clipPath="url(#av-mc)" />
        )}
        {/* Lower teeth */}
        {teeth && gap > 6 && (
          <rect x="84" y={llY - 7} width="32" height="7" rx="2"
            fill="#E8E0D4" opacity="0.9" clipPath="url(#av-mc)" />
        )}

        {/* Upper lip — Cupid's bow */}
        <path d={[
          `M 76 ${ulY}`,
          `Q 85 ${ulY - 8} 100 ${ulY - 5}`,
          `Q 115 ${ulY - 8} 124 ${ulY}`,
          `Q 115 ${ulY + 2.5} 100 ${ulY + 4}`,
          `Q 85 ${ulY + 2.5} 76 ${ulY} Z`,
        ].join(' ')} fill="url(#av-lip-up)" />
        {/* Upper lip highlight */}
        <path d={`M 90 ${ulY - 4} Q 100 ${ulY - 7} 110 ${ulY - 4}`}
          stroke="#C07060" fill="none" strokeWidth="0.8" opacity="0.5" />

        {/* Lower lip — fuller, gradient */}
        <path d={[
          `M 78 ${llY - 2}`,
          `Q 100 ${llY + 9} 122 ${llY - 2}`,
          `Q 100 ${llY + 4} 78 ${llY - 2} Z`,
        ].join(' ')} fill="url(#av-lip-dn)" />
        {/* Lower lip highlight */}
        <ellipse cx="100" cy={llY + 4} rx="12" ry="3" fill="#D08070" opacity="0.25" />

        {/* Corner shadows */}
        <circle cx="77"  cy={ulY + 1} r="2.5" fill="#7A3028" opacity="0.5" />
        <circle cx="123" cy={ulY + 1} r="2.5" fill="#7A3028" opacity="0.5" />

        {/* Chin definition */}
        <ellipse cx="100" cy="196" rx="25" ry="6" fill="#80401820" />

      </g>

      {/* ── VIGNETTE OVERLAY (depth effect) ─────────── */}
      <rect width="200" height="250" fill="url(#av-vignette)" pointerEvents="none" />

      {/* Camera frame — subtle rounded border */}
      <rect width="200" height="250" fill="none"
        stroke="#FFFFFF06" strokeWidth="3" rx="4" />
    </svg>
  );
}
