import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import Lightbox, { useNarrow } from '../Lightbox.jsx';
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
  const narrow = useNarrow();
  const [big, setBig] = useState(false);

  // The drawing is built once and rendered in two places — inline, and enlarged
  // inside the lightbox. Two copies of this markup would drift, and a plate
  // that differs between its small and large form is worse than no large form:
  // the reader would be looking at a different picture.
  const drawing = cls => (
    <svg viewBox={`0 0 ${W} ${H}`} className={cls} role="img" aria-label={entry.alt}>
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
  );

  return (
    <motion.figure
      className={`plate plate-${size}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="plate-frame">{drawing('plate-svg')}</div>
      {caption && <figcaption className="plate-caption">{caption}</figcaption>}
      {narrow && (
        <p className="plate-enlarge">
          <button type="button" className="btn plate-enlarge-btn" onClick={() => setBig(true)}>
            Enlarge illustration
          </button>
        </p>
      )}
      <Lightbox open={big} onClose={() => setBig(false)} label={entry.alt}>
        {drawing('lightbox-svg')}
        {caption && <p className="lightbox-caption">{caption}</p>}
      </Lightbox>
    </motion.figure>
  );
}

export { SCENES };
