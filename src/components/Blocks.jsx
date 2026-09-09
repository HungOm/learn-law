import { motion } from 'framer-motion';
import { Prose } from './Term.jsx';
import Diagram from './Diagram.jsx';
import Chart from './Chart.jsx';
import Plate from './plates/Plate.jsx';
import { Checkpoint, Predict } from './Interactive.jsx';

/**
 * One lesson block.
 *
 * `seen` is the per-lesson set of glossary terms already linked, threaded
 * through so a term is marked the first time it appears in the lesson and left
 * alone afterwards.
 */
export default function Block({ b, seen }) {
  switch (b.t) {
    case 'rule':
      return (
        <motion.div
          className="ruleblock"
          initial={{ opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
        >
          <span className="ruleblock-mark" aria-hidden="true">§</span>
          <Prose as="p" text={b.text} seen={seen} />
          {/* The source line is prose too, and it is where the abbreviations
              actually live — "[1968] 1 MLJ 170 (PC)" names a report series and a
              court that a reader new to citations cannot expand. Linking it
              costs nothing: `seen` is per-lesson, so anything already glossed in
              the text above will not mark again down here. */}
          {b.source && <p className="rb-src"><Prose text={b.source} seen={seen} /></p>}
        </motion.div>
      );

    case 'example':
      return (
        <div className="exblock">
          <p><span className="xlabel">Example</span><Prose text={b.text} seen={seen} /></p>
        </div>
      );

    case 'caution':
      return (
        <div className="cautionblock">
          <p><span className="xlabel">Careful</span><Prose text={b.text} seen={seen} /></p>
        </div>
      );

    case 'list':
      return (
        <ul className="lsec-list">
          {(b.items || []).map((t, i) => <li key={i}><Prose text={t} seen={seen} /></li>)}
        </ul>
      );

    case 'table':
      return <Table {...b} seen={seen} />;

    case 'chart':
      return <Chart {...b} />;

    case 'diagram':
      return <Diagram {...b} />;

    case 'figure':
      return <Plate scene={b.scene} caption={b.caption} size={b.size || 'inline'} />;

    case 'steps':
      return <Steps {...b} seen={seen} />;

    case 'compare':
      return <Compare {...b} seen={seen} />;

    case 'predict':
      return <Predict {...b} seen={seen} />;

    case 'checkpoint':
      return <Checkpoint {...b} seen={seen} />;

    default:
      return <Prose as="p" text={b.text} seen={seen} />;
  }
}

/**
 * A table. Used where the content is genuinely tabular — a comparison across
 * two or more axes — rather than as a way of laying out a list, which reads
 * worse than the list did.
 */
function Table({ caption, columns = [], rows = [], note, source, seen }) {
  return (
    <motion.figure
      className="dtable-fig"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.42 }}
    >
      {caption && <figcaption className="dtable-cap">{caption}</figcaption>}
      {/* A table wide enough to scroll is operable only if the scroll box can
          be reached. Chrome makes an overflowing container focusable on its
          own; WebKit does not, so on iOS Safari this was unreachable by
          keyboard. Declared here rather than borrowed from one engine, and
          named so it announces as the figure rather than as a generic group.
          The same stop is declared in Diagram.jsx, Chart.jsx and Insight.jsx:
          change all four or none. A figure that is focusable in some places
          and not others teaches the reader a rule that then fails, which is
          worse than either state applied consistently.

          Unconditional rather than toggled on overflow, and the reason is
          where the cost falls rather than how big it is. Measured by tab
          traversal on three lessons: at 360px every one of these containers
          scrolls, so the wasted stop does not exist at the width this
          readership actually reads at; at 1600px there are 1-2 dead stops out
          of ~50, on widths this audience largely does not use. The conditional
          alternative inverts that — a desynchronised ResizeObserver leaves a
          container unreachable *while it is still scrolling*, and scrolling is
          the phone case. It would concentrate its failure on exactly the
          readers who need the stop.

          What tabIndex buys is a sighted keyboard user being able to scroll
          the box, and nothing else. It is NOT what makes the figure announce:
          a screen reader reaches role="group" with an aria-label whether or
          not it is in the tab order, so that benefit is bought by the role and
          the name and would survive making the stop conditional. Keep those
          two arguments apart — attaching the announcement to tabIndex is how
          someone re-examining this keeps it for a reason that was never
          about it. */}
      <div className="table-wrap" tabIndex={0} role="group" aria-label={caption || 'Table'}>
        <table className="dtable">
          <thead>
            <tr>{columns.map((c, i) => (
              <th key={i} scope="col" className={c.align === 'num' ? 'is-num' : ''}>{c.label}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((cell, ci) => {
                  const Tag = ci === 0 ? 'th' : 'td';
                  return (
                    <Tag key={ci} scope={ci === 0 ? 'row' : undefined}
                      className={columns[ci]?.align === 'num' ? 'is-num' : ''}>
                      <Prose text={cell} seen={seen} />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="dtable-note-line small"><Prose text={note} seen={seen} /></p>}
      {source && <p className="chart-source"><Prose text={source} seen={seen} /></p>}
    </motion.figure>
  );
}

/** An ordered procedure. Numbered, because the order is the content. */
function Steps({ title, items = [], seen }) {
  return (
    <div className="stepsblock">
      {title && <p className="steps-title">{title}</p>}
      <ol className="steps-list">
        {items.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.32 }}
          >
            <span className="steps-n">{i + 1}</span>
            <span>
              <strong className="steps-h">{s.h}</strong>
              {s.text && <> <Prose text={s.text} seen={seen} /></>}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** Two things set against each other, which is how most of this subject is learnt. */
function Compare({ title, left, right, seen }) {
  return (
    <motion.div
      className="compareblock"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.42 }}
    >
      {title && <p className="compare-title">{title}</p>}
      <div className="compare-cols">
        {[left, right].map((side, i) => (
          <div className={`compare-col is-${i === 0 ? 'a' : 'b'}`} key={i}>
            <p className="compare-h">{side.h}</p>
            <ul>{(side.items || []).map((t, k) => <li key={k}><Prose text={t} seen={seen} /></li>)}</ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export const BLOCK_TYPES = [
  'p', 'rule', 'example', 'caution', 'list',
  'table', 'chart', 'diagram', 'figure', 'steps', 'compare',
];
