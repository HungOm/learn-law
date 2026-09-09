// The drawing kit the plates are composed from.
//
// A note on what these are. The user asked for historical images illustrating
// each lesson. Photographs are the obvious answer and the wrong one here: the
// app is offline-first with no CDN, real historical photographs of Malaysian
// legal subjects are almost all under copyright or of uncertain provenance, and
// a picture whose licence nobody can vouch for sits badly in an app that makes
// every lesson name its sources.
//
// So these are drawn, not sourced: original engraving-style plates in the
// app's own line-work, each one depicting the subject of its lesson and
// captioned with what it shows. They ship in the repository, weigh nothing,
// work offline, and are honest about being illustrations rather than evidence.

export const W = 800;
export const H = 400;

/** Hatch and texture definitions. Included once per plate. */
export function Defs({ id }) {
  return (
    <defs>
      <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" className="pl-hatch" />
      </pattern>
      <pattern id={`${id}-hatch2`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <line x1="0" y1="0" x2="0" y2="4" className="pl-hatch" />
      </pattern>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" className="pl-sky-a" />
        <stop offset="100%" className="pl-sky-b" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" className="pl-glow-a" />
        <stop offset="100%" className="pl-glow-b" />
      </radialGradient>
    </defs>
  );
}

export const hatch = id => `url(#${id}-hatch)`;
export const hatch2 = id => `url(#${id}-hatch2)`;
export const sky = id => `url(#${id}-sky)`;
export const glow = id => `url(#${id}-glow)`;

/** The ruled ground and horizon every exterior scene stands on. */
export function Ground({ y = 320, id }) {
  return (
    <g className="pl-ground">
      <rect x="0" y={y} width={W} height={H - y} fill={hatch2(id)} opacity="0.5" />
      <line x1="0" y1={y} x2={W} y2={y} className="pl-line" />
    </g>
  );
}

export function Column({ x, y, h = 150, w = 22, id }) {
  return (
    <g className="pl-ink">
      <rect x={x - w / 2 - 6} y={y + h} width={w + 12} height="10" className="pl-fill" />
      <rect x={x - w / 2} y={y + 10} width={w} height={h - 10} fill={hatch(id)} className="pl-stroke" />
      <rect x={x - w / 2 - 5} y={y} width={w + 10} height="10" className="pl-fill" />
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={x - w / 2 + w * f} y1={y + 14} x2={x - w / 2 + w * f} y2={y + h - 4} className="pl-line" />
      ))}
    </g>
  );
}

export function Pediment({ cx, y, w = 300 }) {
  return (
    <g className="pl-ink">
      <path d={`M ${cx - w / 2} ${y} L ${cx} ${y - 52} L ${cx + w / 2} ${y} Z`} className="pl-fill pl-stroke" />
      <path d={`M ${cx - w / 2 + 16} ${y - 6} L ${cx} ${y - 44} L ${cx + w / 2 - 16} ${y - 6} Z`} className="pl-stroke" fill="none" />
    </g>
  );
}

export function Arch({ x, y, w = 60, h = 96 }) {
  return (
    <path
      d={`M ${x} ${y + h} V ${y + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V ${y + h} Z`}
      className="pl-dark"
    />
  );
}

export function Book({ x, y, w = 90, h = 14, tone = '' }) {
  return (
    <g className={`pl-ink ${tone}`}>
      <rect x={x} y={y} width={w} height={h} rx="2" className="pl-fill pl-stroke" />
      <line x1={x + 5} y1={y + h - 3} x2={x + w - 5} y2={y + h - 3} className="pl-line" />
      <rect x={x + 6} y={y + 3} width="14" height={h - 7} className="pl-accent" />
    </g>
  );
}

export function OpenBook({ cx, cy, w = 220, id }) {
  const h = w * 0.42;
  return (
    <g className="pl-ink">
      <path d={`M ${cx} ${cy - h / 2 + 6} C ${cx - w / 3} ${cy - h / 2 - 8}, ${cx - w / 2} ${cy - h / 2 + 2}, ${cx - w / 2} ${cy - h / 2 + 6}
                V ${cy + h / 2} C ${cx - w / 2} ${cy + h / 2 - 4}, ${cx - w / 3} ${cy + h / 2 - 10}, ${cx} ${cy + h / 2 - 4} Z`}
        className="pl-fill pl-stroke" />
      <path d={`M ${cx} ${cy - h / 2 + 6} C ${cx + w / 3} ${cy - h / 2 - 8}, ${cx + w / 2} ${cy - h / 2 + 2}, ${cx + w / 2} ${cy - h / 2 + 6}
                V ${cy + h / 2} C ${cx + w / 2} ${cy + h / 2 - 4}, ${cx + w / 3} ${cy + h / 2 - 10}, ${cx} ${cy + h / 2 - 4} Z`}
        className="pl-fill pl-stroke" />
      <line x1={cx} y1={cy - h / 2 + 6} x2={cx} y2={cy + h / 2 - 4} className="pl-stroke" />
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i}>
          <line x1={cx - w / 2 + 16} y1={cy - h / 4 + i * 11} x2={cx - 14} y2={cy - h / 4 + i * 11} className="pl-line" />
          <line x1={cx + 14} y1={cy - h / 4 + i * 11} x2={cx + w / 2 - 16} y2={cy - h / 4 + i * 11} className="pl-line" />
        </g>
      ))}
    </g>
  );
}

export function Scales({ cx, cy, s = 1, tilt = 0 }) {
  const arm = 62 * s;
  const dy = Math.tan((tilt * Math.PI) / 180) * arm;
  return (
    <g className="pl-ink" transform={`translate(${cx} ${cy}) scale(${s})`}>
      <line x1="0" y1="-70" x2="0" y2="52" className="pl-stroke" />
      <path d="M -26 52 L 26 52 L 18 60 L -18 60 Z" className="pl-fill pl-stroke" />
      <line x1={-arm / s} y1={-70 - dy / s} x2={arm / s} y2={-70 + dy / s} className="pl-stroke" />
      {[-1, 1].map(side => {
        const px = (side * arm) / s;
        const py = -70 + (side * dy) / s;
        return (
          <g key={side}>
            <line x1={px} y1={py} x2={px} y2={py + 24} className="pl-line" />
            <path d={`M ${px - 20} ${py + 24} A 20 12 0 0 0 ${px + 20} ${py + 24} Z`} className="pl-fill pl-stroke" />
          </g>
        );
      })}
      <circle cx="0" cy="-70" r="4" className="pl-accent-fill" />
    </g>
  );
}

export function Seal({ cx, cy, r = 26, label = '§' }) {
  return (
    <g className="pl-ink">
      <circle cx={cx} cy={cy} r={r} className="pl-accent-fill" opacity="0.16" />
      <circle cx={cx} cy={cy} r={r} className="pl-accent-stroke" fill="none" />
      <circle cx={cx} cy={cy} r={r - 5} className="pl-accent-stroke" fill="none" strokeDasharray="2 3" />
      <text x={cx} y={cy + r * 0.24} textAnchor="middle" fontSize={r * 0.8} className="pl-accent-text">{label}</text>
    </g>
  );
}

export function Scroll({ x, y, w = 130, h = 90, id }) {
  return (
    <g className="pl-ink">
      <rect x={x} y={y} width={w} height={h} className="pl-fill pl-stroke" />
      <path d={`M ${x} ${y} q ${w / 2} 12 ${w} 0`} className="pl-stroke" fill="none" />
      <path d={`M ${x} ${y + h} q ${w / 2} 12 ${w} 0`} className="pl-stroke" fill="none" />
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={x + 12} y1={y + 22 + i * 15} x2={x + w - 12 - (i === 3 ? 28 : 0)} y2={y + 22 + i * 15} className="pl-line" />
      ))}
      <rect x={x} y={y} width={w} height={h} fill={hatch(id)} opacity="0.25" />
    </g>
  );
}

export function Envelope({ x, y, w = 96, h = 62, flap = true }) {
  return (
    <g className="pl-ink">
      <rect x={x} y={y} width={w} height={h} rx="2" className="pl-fill pl-stroke" />
      {flap && <path d={`M ${x} ${y} L ${x + w / 2} ${y + h * 0.55} L ${x + w} ${y} `} className="pl-stroke" fill="none" />}
      <rect x={x + w - 26} y={y + 6} width="18" height="14" className="pl-accent" />
    </g>
  );
}

export function Quill({ x, y, s = 1 }) {
  return (
    <g className="pl-ink" transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 0 C 10 -30, 26 -54, 52 -70 C 40 -40, 26 -16, 6 2 Z" className="pl-fill pl-stroke" />
      <line x1="0" y1="0" x2="-8" y2="10" className="pl-stroke" />
    </g>
  );
}

export function Lamp({ x, y, id }) {
  return (
    <g className="pl-ink">
      <ellipse cx={x} cy={y + 118} rx="76" ry="26" fill={glow(id)} />
      <path d={`M ${x - 34} ${y} L ${x + 34} ${y} L ${x + 22} ${y + 30} L ${x - 22} ${y + 30} Z`} className="pl-fill pl-stroke" />
      <line x1={x} y1={y} x2={x} y2={y - 26} className="pl-stroke" />
      <rect x={x - 5} y={y + 30} width="10" height="72" className="pl-fill pl-stroke" />
      <ellipse cx={x} cy={y + 104} rx="26" ry="7" className="pl-fill pl-stroke" />
    </g>
  );
}

/** A robed figure, seen from the front. Deliberately faceless. */
export function Person({ x, y, h = 96, tone = '' }) {
  const s = h / 96;
  return (
    <g className={`pl-ink ${tone}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-84" r="12" className="pl-fill pl-stroke" />
      <path d="M -22 -68 C -22 -50, -26 -20, -24 0 L 24 0 C 26 -20, 22 -50, 22 -68 C 12 -74, -12 -74, -22 -68 Z"
        className="pl-fill pl-stroke" />
      <line x1="-8" y1="-64" x2="-8" y2="-6" className="pl-line" />
      <line x1="8" y1="-64" x2="8" y2="-6" className="pl-line" />
    </g>
  );
}

export function Palm({ x, y, s = 1 }) {
  return (
    <g className="pl-ink" transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 0 C -4 -30, -6 -60, -2 -86" className="pl-stroke" fill="none" />
      {[-70, -35, 0, 35, 70, 110, -110].map((a, i) => (
        <path key={i} d={`M -2 -86 q ${Math.cos((a * Math.PI) / 180) * 40} ${-14 + Math.sin((a * Math.PI) / 180) * 20} ${Math.cos((a * Math.PI) / 180) * 62} ${6 + Math.sin((a * Math.PI) / 180) * 26}`}
          className="pl-stroke" fill="none" />
      ))}
    </g>
  );
}

export function Hills({ y = 320, id }) {
  return (
    <g className="pl-ink">
      <path d={`M 0 ${y} L 90 ${y - 54} L 170 ${y - 18} L 250 ${y - 66} L 330 ${y} Z`} fill={hatch(id)} opacity="0.5" className="pl-stroke" />
      <path d={`M 470 ${y} L 560 ${y - 40} L 640 ${y - 12} L 720 ${y - 52} L 800 ${y} Z`} fill={hatch(id)} opacity="0.5" className="pl-stroke" />
    </g>
  );
}

/** A framed inset used for the "document within the picture" plates. */
export function Sheet({ x, y, w, h, lines = 6, id, tone = '' }) {
  return (
    <g className={`pl-ink ${tone}`}>
      <rect x={x + 5} y={y + 5} width={w} height={h} className="pl-shadow" />
      <rect x={x} y={y} width={w} height={h} className="pl-paper pl-stroke" />
      {Array.from({ length: lines }).map((_, i) => (
        <line key={i} x1={x + 14} y1={y + 22 + i * ((h - 34) / lines)} className="pl-line"
          x2={x + w - 14 - (i % 3 === 2 ? 40 : 0)} y2={y + 22 + i * ((h - 34) / lines)} />
      ))}
    </g>
  );
}

export function Caption({ children }) {
  return <figcaption className="plate-caption">{children}</figcaption>;
}
