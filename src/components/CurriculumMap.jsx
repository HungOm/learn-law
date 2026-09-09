import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * The curriculum as a path rather than a list.
 *
 * Sixteen modules in a row of rings, each ring filled by how much of that
 * module has been read. The value of it over the list below is that it answers
 * "where am I" in one look — a list of sixteen rows answers "what exists",
 * which is a different question and the one you only ask once.
 */
export default function CurriculumMap({ modules, read, byModule }) {
  return (
    <div className="mapwrap">
      <div className="maprow">
        {modules.map((m, i) => {
          const lessons = m.lessons || [];
          const doneCount = lessons.filter(l => read[l.id]).length;
          const pct = lessons.length ? doneCount / lessons.length : 0;
          const mc = byModule[m.id];
          const due = mc ? mc.due + mc.fresh : 0;
          const num = m.level === null || m.level === undefined ? '—' : String(m.level).padStart(2, '0');
          const full = pct >= 1 && lessons.length > 0;
          const r = 20;
          const circ = 2 * Math.PI * r;

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* The node carries its module's identity, so --module-tint and
                  --module-ink resolve on it. The short title is printed under
                  the ring in every case, so the colour is an orientation cue
                  and never the only thing separating two nodes — the map would
                  otherwise be exactly the unlabelled colour-coded map
                  DESIGN.md 2.9 forbids. */}
              <Link
                className={`mapnode${due ? ' is-due' : ''}`}
                data-module={m.id}
                to={`/module/${m.id}`}
                title={`${m.title} — ${doneCount} of ${lessons.length} lessons read${due ? `, ${due} cards due` : ''}`}
              >
                <span className="mapnode-ring">
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r={r} className="mapnode-track" />
                    <motion.circle
                      cx="24" cy="24" r={r}
                      className={`mapnode-arc${full ? ' is-full' : ''}`}
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - pct) }}
                      transition={{ delay: 0.15 + i * 0.03, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <span className="mapnode-n">{num}</span>
                </span>
                <span className="mapnode-label">{short(m.title)}</span>
                {due > 0 && <span className="mapnode-dot" aria-hidden="true" />}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Module titles are written for the page heading, not for a 4.5rem column. */
function short(title) {
  return title
    .replace(/^The Malaysian /, '')
    .replace(/^How to Study /, 'Study ')
    .replace(/ & Commercial Law$/, '')
    .replace(/ Law$/, '')
    .replace(/^Advanced /, '')
    .replace(/^Legal /, '');
}
