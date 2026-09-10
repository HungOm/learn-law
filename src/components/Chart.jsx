import { useId, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Charts for lesson prose.
 *
 * Deliberately few forms. A law lesson has very little genuinely quantitative
 * content, and a chart drawn over invented numbers would be exactly the kind of
 * authoritative-looking claim the rest of this app refuses to make. Everything
 * plotted here is a real statutory figure — a limitation period, a mark
 * allocation, a jurisdictional limit — and it carries the source that fixes it.
 *
 * Form rules, applied rather than eyeballed:
 *  - one series gets one hue and no legend; the title names it
 *  - two or three series get a legend AND direct labels, so identity is never
 *    carried by colour alone
 *  - past three series there is no fourth colour: use a table
 *  - every chart has a table view, because a colour a reader cannot separate
 *    stops being an encoding
 */
export default function Chart({
  kind = 'bar', title, caption, unit = '', data = [], series = [], source, note,
}) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  const stacked = kind === 'stack';

  if (series.length > 3) {
    // The rule rather than a rendering: a fourth categorical hue cannot be
    // separated reliably, so the data goes out as a table instead of a chart
    // nobody can read.
    return <ChartTable title={title} caption={caption} data={data} series={series} unit={unit} source={source} always />;
  }

  return (
    <motion.figure
      className="chart"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-head">
        <figcaption className="chart-title">{title}</figcaption>
        <button type="button" className="chart-toggle" onClick={() => setAsTable(v => !v)}
          aria-pressed={asTable} aria-controls={id}>
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s, i) => (
            <span className="chart-key" key={s.key}>
              <i className={`chart-swatch viz-${i + 1}`} />{s.label}
            </span>
          ))}
        </div>
      )}

      <div id={id}>
        {asTable
          ? <Rows data={data} series={series} unit={unit} />
          : <Bars data={data} series={series} unit={unit} stacked={stacked} />}
      </div>

      {caption && <figcaption className="chart-caption">{caption}</figcaption>}
      {note && <p className="chart-note small">{note}</p>}
      {source && <p className="chart-source">{source}</p>}
    </motion.figure>
  );
}

function total(row, series) {
  return series.reduce((n, s) => n + (Number(row[s.key]) || 0), 0);
}

function Bars({ data, series, unit, stacked }) {
  const keys = series.length ? series : [{ key: 'value', label: '' }];
  const max = Math.max(...data.map(d => (stacked ? total(d, keys) : Math.max(...keys.map(s => Number(d[s.key]) || 0)))), 1);
  return (
    <div className="bars">
      {data.map((d, i) => {
        const t = total(d, keys);
        return (
          <div className="bar-row" key={d.label}>
            <span className="bar-label">{d.label}</span>
            <span className="bar-track">
              {keys.map((s, si) => {
                const v = Number(d[s.key]) || 0;
                const pct = (v / max) * 100;
                if (!v) return null;
                return (
                  <motion.i
                    key={s.key}
                    className={`bar-fill viz-${si + 1}${stacked ? ' is-seg' : ''}`}
                    title={`${d.label}${s.label ? ` · ${s.label}` : ''}: ${v}${unit ? ` ${unit}` : ''}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.06 * i + 0.05 * si, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
              })}
            </span>
            {/* READ BEFORE ADDING THE FIRST STACKED CHART.
                The unstacked branch prints every series value in series order,
                so a reader can match value to legend by position without using
                colour. The stacked branch prints the total instead — and a
                stacked segment carries no text of its own, so with this line as
                written its identity rests on colour matched to a legend swatch,
                plus a `title` a keyboard or touch user never sees. That is the
                one thing DESIGN.md 2.6 forbids, and this file's own header
                promises the opposite.
                No content uses kind: 'stack' today, so nothing ships it — which
                is the only reason it is a comment rather than a fix. Print the
                per-series values here as well as the total before the first one
                lands. Do not reach for a hatch pattern instead: --viz-series-*
                are verified at 3:1 as non-text under three CVD simulations, and
                mixing a stripe into the fill invalidates that measurement. */}
            <span className="bar-value">
              {stacked ? t : keys.map(s => d[s.key]).filter(v => v != null).join(' / ')}
              {unit ? ` ${unit}` : ''}
            </span>
            {d.note && <span className="bar-note">{d.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Rows({ data, series, unit }) {
  const keys = series.length ? series : [{ key: 'value', label: 'Value' }];
  return (
    /* An overflowing scroll box is focusable in Chrome only, so the stop is
       declared rather than borrowed. Also in Diagram.jsx, Blocks.jsx and
       Insight.jsx — change all four or none. See the note in Blocks.jsx. */
    <div className="table-wrap" tabIndex={0} role="group" aria-label="Chart data as a table">
      <table className="dtable">
        <thead>
          <tr>
            <th scope="col">&nbsp;</th>
            {keys.map(s => <th scope="col" key={s.key} className="is-num">{s.label || 'Value'}{unit ? ` (${unit})` : ''}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.label}>
              <th scope="row">{d.label}{d.note ? <span className="dtable-note">{d.note}</span> : null}</th>
              {/* data-label: see the note in Blocks.jsx — it is what the
                  narrow stacked layout reads to name each value. */}
              {keys.map(s => (
                <td key={s.key} className="is-num" data-label={`${s.label || 'Value'}${unit ? ` (${unit})` : ''}`}>
                  {d[s.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartTable({ title, caption, data, series, unit, source }) {
  return (
    <figure className="chart">
      <div className="chart-head"><figcaption className="chart-title">{title}</figcaption></div>
      <Rows data={data} series={series} unit={unit} />
      {caption && <figcaption className="chart-caption">{caption}</figcaption>}
      <p className="chart-note small">
        Shown as a table rather than a chart: past three series there is no fourth colour a
        reader can be relied on to separate.
      </p>
      {source && <p className="chart-source">{source}</p>}
    </figure>
  );
}
