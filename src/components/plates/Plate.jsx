import { useId } from 'react';
import { motion } from 'framer-motion';
import SCENES from './scenes.jsx';
import { Defs, W, H } from './kit.jsx';

/**
 * A plate: the framed illustration at the head of a lesson, or inline in one.
 *
 * The frame is the same on every plate — a double rule, corner ticks and a
 * caption below — so that the drawing inside reads as a figure in a printed
 * text rather than as decoration on a web page. Each scene declares its own
 * text alternative; the caption below it is what the picture is *of*, which is
 * a different sentence and worth writing separately.
 */
export default function Plate({ scene = 'statute', caption, size = 'full', delay = 0 }) {
  const id = useId().replace(/[:]/g, '');
  const entry = SCENES[scene] || SCENES.statute;
  const Scene = entry.fn;

  return (
    <motion.figure
      className={`plate plate-${size}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="plate-frame">
        <svg viewBox={`0 0 ${W} ${H}`} className="plate-svg" role="img" aria-label={entry.alt}>
          <title>{entry.alt}</title>
          <Defs id={id} />
          {Scene(id)}
          <g className="plate-rules" aria-hidden="true">
            <rect x="8" y="8" width={W - 16} height={H - 16} className="pl-rule-outer" />
            <rect x="15" y="15" width={W - 30} height={H - 30} className="pl-rule-inner" />
            {[[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]].map(([x, y], i) => (
              <g key={i}>
                <line x1={x - 10} y1={y} x2={x + 10} y2={y} className="pl-rule-outer" />
                <line x1={x} y1={y - 10} x2={x} y2={y + 10} className="pl-rule-outer" />
              </g>
            ))}
          </g>
        </svg>
      </div>
      {caption && <figcaption className="plate-caption">{caption}</figcaption>}
    </motion.figure>
  );
}

export { SCENES };
