import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as prob from '../lib/problems.js';
import * as sections_ from '../lib/sections.js';
import { loadLesson, plateFor } from '../lib/content.js';
import * as prog from '../lib/progression.js';
import Block from '../components/Blocks.jsx';
import Plate from '../components/plates/Plate.jsx';
import { Prose, TermLayer } from '../components/Term.jsx';
import { burstFrom } from '../lib/fx.js';
import { daysAgo, plural } from '../lib/format.js';
import NotFound from './NotFound.jsx';
import { focusOn, setFocus } from '../lib/focus.js';
import { useDialog } from '../components/Overlays.jsx';
import ReadAlongside from '../components/ReadAlongside.jsx';

const slug = (s, i) => `s${i}-${String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;

// Focus mode has no width gate: every lesson is read one section at a time, at
// every size.
//
// It used to stop at 1023, on the reasoning that stepping was a small-screen
// remedy — a long lesson on a phone is a wall to scroll — and that above the
// contents rail at 1024 the wall stopped being a wall. That reasoning was sound
// for the question it asked, and it asked the wrong one. It treated stepping as
// WAYFINDING, solved by a rail. The intent is ATTENTION: one section per screen
// is how this material is meant to be met, and a reader on a large monitor is
// no better served by a wall than a reader on a phone. The rail survives as a
// section switcher rather than a scroll map — clicking an entry sets the step,
// which the handler below already did.
//
// The escape hatch stays and widens. `stepPref` still defaults ON, and the
// toggle now renders at every width instead of only below 1024, so a reader who
// wants the continuous page can still ask for it at the size where they are
// most likely to want it.
//
// One measured finding is kept from the breakpoint rationale this replaces,
// because it is easy to re-derive wrongly: enlarging body type does NOT push
// line length out of the comfortable band. `--measure` is 68ch, so the column
// scales WITH the type — at 768 it grows 612px to 646px, exactly the type
// increase — and characters per line stays at 59.6 at both sizes. There is no
// chars-per-line effect here to find.

// The reading mode is a per-device view preference, not progress, so it lives
// in localStorage rather than in the IndexedDB `meta` store the rest of the
// app's state uses. Two reasons: it must be readable synchronously or the page
// flashes the wrong mode on every load, and it is the one piece of state here
// that a reader would not mind losing. Everything that IS progress stays in
// `meta`, where the export in Settings can reach it.

export default function LessonView() {
  const { id } = useParams();
  const { cat, read, best, unlock, markLesson } = useStudy();
  const meta = cat.byId.lesson[id];
  const btnRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [here, setHere] = useState(0);

  // The catalogue knows this lesson's title, summary and headings already; what
  // has to be fetched is the prose, which lives in the module's chunk.
  const [l, setL] = useState(null);
  const [secRead, setSecRead] = useState({});

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => { window.scrollTo(0, 0); setHere(0); }, [id]);

  useEffect(() => {
    let live = true;
    setL(null);
    loadLesson(id).then(full => { if (live) setL(full); });

    sections_.readMap().then(m => { if (live) setSecRead(m); });
    return () => { live = false; };
  }, [id]);

  const sections = l?.sections || [];
  const ids = useMemo(() => sections.map((s, i) => slug(s.h, i)), [sections]);

  // Scroll-spy. An observer rather than a scroll handler, because the handler
  // version recomputes offsets on every frame of a long lesson.
  useEffect(() => {
    if (!ids.length) return undefined;
    const seen = new Map();
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
      let best = 0, bestRatio = -1;
      ids.forEach((sid, i) => {
        const r = seen.get(sid) ?? -1;
        if (r > bestRatio) { bestRatio = r; best = i; }
      });
      setHere(best);
    }, { rootMargin: '-15% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] });
    ids.forEach(sid => { const el = document.getElementById(sid); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids]);

  const [stepPref, setStepPref] = useState(focusOn);
  const [step, setStep] = useState(0);
  const stepping = stepPref;
  // Above every early return below: this is a hook, and a lesson that is
  // missing or locked returns before the reader is ever rendered.
  // Escape closes, Tab cannot walk out, the page behind does not scroll, and
  // focus returns to whatever opened it.
  const readerRef = useDialog(stepping, () => { setStepPref(false); setFocus(false); });
  // A hook, so it belongs up here with the others rather than beside the
  // handler that uses it — placing it next to `closeReader`, which sits after
  // the early returns for a missing or locked lesson, made it conditional and
  // took the whole app down with React #310 on every route after a lesson.
  const titleRef = useRef(null);
  useEffect(() => { setStep(0); }, [id]);

  // Moving between sections replaces the whole reading surface, and a swap
  // nobody is told about is a swap a screen-reader user has to go and discover.
  // `scrollTo` serves the sighted reader and announces nothing; focus on the
  // new heading does both jobs at once — it reads the heading, states the new
  // position, and leaves the reader at the top of the new content rather than
  // at the bottom of the old. WCAG 4.1.3.
  const headRef = useRef(null);
  const settled = useRef(false);
  useEffect(() => {
    if (!stepping) { settled.current = false; return; }
    // Not on first paint. Programmatic focus is not a user-initiated
    // navigation, and stealing it into the lesson body on arrival is its own
    // defect — the reader has not asked to go anywhere yet.
    if (!settled.current) { settled.current = true; return; }
    headRef.current?.focus();
  }, [step, stepping]);

  // One map per lesson — or per SECTION while stepping.
  //
  // A term links on its first appearance and is left alone after. On a
  // continuous page that is right: the reader has the earlier mark on screen to
  // scroll back to. Stepping breaks that assumption, because the first
  // appearance may be four sections back and unreachable without leaving the
  // one being read. Worse, it would make the page order-dependent — jump
  // straight to section 5 and its terms are marked, arrive via section 1 and
  // they are not. Resetting per step makes each section self-contained.
  const seen = useMemo(() => new Map(), [id, stepping ? step : 'all']);

  if (!meta) return <NotFound />;

  // Checked before the loading branch: a locked lesson must not fetch, and must
  // not flash its summary on the way to being refused.
  {
    const g = unlock[meta.id];
    if (g && !g.open) return <Locked meta={meta} cat={cat} entry={g} />;
  }

  // The prose is still coming. Show what the catalogue already knows rather
  // than a spinner over an empty page — it is the same heading the loaded page
  // opens with, so nothing jumps when it arrives. Plain text in a live region:
  // there is nothing here to focus, so there is nothing to trap.
  if (!l) {
    return (
      <div className="wrap sheet" data-module={meta.moduleId}>
        <p className="small taplink-row"><Link className="taplink" to="/lessons">← Lessons</Link></p>
        <h1>{meta.title}</h1>
        <p className="lede">{meta.summary}</p>
        <p className="small" role="status">Fetching the text of this lesson…</p>
      </div>
    );
  }

  const gate = unlock[meta.id] || { open: true };
  if (!gate.open) return <Locked meta={meta} cat={cat} entry={gate} />;

  const mod = cat.byId.module[l.moduleId] || {};
  const order = cat.lessons;
  const at = order.findIndex(x => x.id === l.id);
  const prev = order[at - 1] || null;
  const next = order[at + 1] || null;
  const cards = (l.plants || []).map(cid => cat.byId.card[cid]).filter(Boolean);
  const prepares = (l.prepares || []).map(pid => cat.byId.problem[pid]).filter(Boolean);
  const readAt = read[l.id];

  const toggle = async () => {
    setBusy(true);
    if (!readAt) burstFrom(btnRef.current, { count: 70, spread: 80 });
    await markLesson(l.id, Boolean(readAt));
    setBusy(false);
  };

  // One section, rendered the same whether it is inline on the page or alone
  // inside the reader. Extracting it is what lets focus mode be a full screen
  // rather than a paginated page: the same JSX is the whole of one and a part
  // of the other, so the two cannot drift into different-looking sections.
  const renderSection = (sec, n) => (
            <motion.section
              className="lsec"
              id={ids[n]}
              key={ids[n]}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="lsec-head">
                <span className="lsec-num" aria-hidden="true">{n + 1}</span>
                <h2
                  className="lsec-h"
                  ref={stepping ? headRef : null}
                  tabIndex={stepping ? -1 : undefined}
                >{sec.h}</h2>
              </div>
              {/* The invitation to read one section at a time, offered where the
                  reader is rather than only at the foot of the lesson.
                  Continuous-column only: in focus mode the reader is already
                  reading one section at a time and the offer is nonsense.

                  It is the same rule as the `keypoint` line below, applied in
                  the opposite direction — that one is stepped-only because a
                  repeated LINE reads as noise down a column. This survives the
                  repetition because it is a CONTROL, and a control is only
                  useful where the reader happens to be.

                  `setStep(n)` first, so entering focus mode here lands on THIS
                  section. The foot-of-page toggle cannot do that: a reader who
                  decides at section 4 scrolls to the bottom and arrives at
                  section 1, having lost the place they were asking to keep. */}
              {!stepping && (
                <p className="lsec-mode">
                  <button
                    type="button"
                    className="stepper-mode-btn"
                    onClick={() => {
                      setStep(n);
                      setStepPref(true);
                      setFocus(true);
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    Read one section at a time
                  </button>
                </p>
              )}
              {/* Every section carries a `keypoint` — enforced by
                  check-content.py, 20-160 chars, forbidden from repeating the
                  heading — and until now only index pages showed it. Stepped
                  only: down a continuous column it would repeat under every
                  heading and read as noise, but on a phone it is the line that
                  tells a reader what they are about to learn. */}
              {stepping && sec.keypoint && <p className="lede">{sec.keypoint}</p>}
              {(sec.body || []).map((b, k) => <Block key={k} b={b} seen={seen} />)}
              {/* Marking is explicit, never inferred from scrolling. `lessons.js`
                  refuses to guess at a reader's attention and this is the same
                  refusal one level down: a section is done because the reader
                  said so. */}
              <p className="lsec-done">
                <button
                  type="button"
                  className="lsec-done-btn"
                  aria-pressed={!!secRead[sec.id]}
                  onClick={async () => setSecRead(secRead[sec.id]
                    ? await sections_.markUnread(sec.id)
                    : await sections_.markRead(sec.id))}
                >
                  {secRead[sec.id] ? 'Done' : `Mark done · ${sec.readMinutes || 1} min`}
                </button>
              </p>
            </motion.section>
  );

  const closeReader = () => {
    setStepPref(false);
    setFocus(false);
    // After the page paints. The lesson title states where the reader now is,
    // which is the announcement the close itself does not make.
    requestAnimationFrame(() => titleRef.current?.focus());
  };
  // The reader scrolls inside `.focusview-body`, not the window, so moving
  // between sections has to reset THAT box. `window.scrollTo` here would move
  // a page that is `display: none`.
  const toReaderTop = () => readerRef.current?.querySelector('.focusview-body')?.scrollTo({ top: 0 });
  const activeIdx = Math.min(step, sections.length - 1);
  const active = sections[activeIdx];

  return (
    <TermLayer>
      <motion.div className="readbar" style={{ scaleX: bar }} aria-hidden="true" />

      {/* No pane class here on purpose. learn.css owns this grid and now
          centres it itself (justify-content: center, and .lesson-main takes
          margin-inline: auto), so a .wrap--dash cap would duplicate that — and
          .wrap--dash also carries an opaque ground, which would paint over the
          field across the whole layout and undo the .lesson-main.sheet
          treatment written for this element by hand. */}
      {/* The reader covers the screen, so the page behind it is not merely
          hidden from view — it is not rendered as a surface at all. My user
          asked for "only the contents of each section on full screen, and only
          on close should other contents be visible", and `display: none` is the
          honest form of that: nothing behind is paintable, focusable, or
          reachable by a screen reader, so there is no second copy of the lesson
          for anyone to land in. */}
      <div className="lesson-layout" data-module={l.moduleId}
        style={stepping ? { display: 'none' } : undefined}>
        {/* The prose column, and the only part of this layout that is a
            column of prose — .lesson-main is already capped at --measure, and
            .sheet is what stops the field being composited behind body text
            held to AAA. The table of contents beside it is apparatus, not the
            reading surface, so it is left on the field. */}
        <div className="lesson-main sheet">
          <div className="review-progress">
            <span className="crumb-row">
              <Link className="crumb" to="/lessons">← Lessons</Link>
              <Link className="crumb" to={`/module/${l.moduleId}`}>{mod.title || ''}</Link>
            </span>
            <span>{at + 1} of {order.length} in the curriculum</span>
          </div>

          <header className="lesson-hero">
            <p className="lesson-kicker">
              <span className="module-chip">{mod.title}</span>
              {' '}{mod.level === null || mod.level === undefined ? 'Method' : `Level ${mod.level}`} · {plural(l.minutes, 'minute')}
            </p>
            <h1 className="lesson-title" ref={titleRef} tabIndex={-1}>{l.title}</h1>
            <div className="module-rule" aria-hidden="true" />
            <p className="lesson-standfirst">{l.summary}</p>
            <Plate scene={plateFor(l)} caption={l.plateCaption} />
            <div className="lesson-facts">
              <span className="lesson-fact">{sections.length} sections</span>
              {cards.length > 0 && <span className="lesson-fact">{plural(cards.length, 'card')} planted</span>}
              {l.quizCount > 0 && <span className="lesson-fact">{l.quizCount}-question quiz</span>}
              {prepares.length > 0 && <span className="lesson-fact">{plural(prepares.length, 'problem')} prepared</span>}
              {readAt && <span className="lesson-fact">read {daysAgo(readAt)}</span>}
            </div>
          </header>

          {(() => {
            const p = sections_.progressOf(l, secRead);
            if (!p.done || p.done === p.total) return null;
            return (
              <p className="lsec-resume">
                <strong>{p.done} of {p.total} sections done.</strong>{' '}
                {plural(p.minutesLeft, 'minute')} left — next up,{' '}
                <a
                  href={`#${ids[sections.indexOf(p.next)]}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const i = sections.indexOf(p.next);
                    if (stepping) { setStep(i); window.scrollTo({ top: 0 }); return; }
                    document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >{p.next.h}</a>.
              </p>
            );
          })()}


          {!stepping && sections.map((sec, i) => renderSection(sec, i))}


          <p className="stepper-mode">
            <button
              type="button"
              className="stepper-mode-btn"
              aria-pressed={stepping}
              onClick={() => { const on = !stepPref; setStepPref(on); setFocus(on); }}
            >
              {stepping ? 'Read straight through instead' : 'Read one section at a time'}
            </button>
          </p>

          {l.quizCount > 0 && (
            <motion.div
              className="quiz-invite"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
            >
              <div>
                <h2 style={{ marginTop: 0 }}>
                  {prog.quizPassed(l, best) ? 'Check it before you leave' : 'Pass this to carry on'}
                </h2>
                <p className="small">
                  {plural(l.quizCount, 'question')} on what you have just read.{' '}
                  {prog.quizPassed(l, best)
                    ? 'You have passed it. Take it again whenever you like — it reshuffles.'
                    : `Get ${Math.ceil(l.quizCount * prog.PASS)} of ${l.quizCount} right and the next lesson opens.`}
                  {' '}Recognition, not recall — but a question you cannot even recognise the
                  answer to is a section to read again now rather than in three weeks.
                </p>
              </div>
              <Link className="btn btn-primary btn-big" to={`/quiz/${l.id}`}>Take the quiz</Link>
            </motion.div>
          )}

          {(cards.length > 0 || prepares.length > 0) && (
            <div className="handoff">
              <h2>What this lesson hands off to</h2>
              <div className="handoff-grid">
                {cards.length > 0 && (
                  <div className="handoff-card">
                    <span className="handoff-kicker">Cards</span>
                    <span className="handoff-title">{plural(cards.length, 'card')} planted</span>
                    <span className="handoff-note">
                      Already in the deck. Reading this is what makes them answerable rather than
                      guessable.
                    </span>
                  </div>
                )}
                {prepares.map(pr => (
                  <Link className="handoff-card" key={pr.id} to={`/problem/${pr.id}`}>
                    <span className="handoff-kicker">Problem · {pr.minutes}′</span>
                    <span className="handoff-title">{pr.title}</span>
                    <span className="handoff-note">{prob.totalMarks(pr)} marks, written to follow this lesson.</span>
                  </Link>
                ))}
              </div>
              {cards.length > 0 && (
                <ul className="plantlist">{cards.map(c => <li key={c.id}>{c.front}</li>)}</ul>
              )}
            </div>
          )}

          {(l.reading || []).length > 0 && (
            <>
              <h2>Read alongside</h2>
              {l.reading.map((r, n) => {
                // A reading may be a book or the law itself. For a lesson whose
                // subject IS a provision — s 3 of the Civil Law Act, Article
                // 121(1A) — sending the reader to a commentary and not to the
                // words is the wrong way round, and the words are free where
                // the commentary costs a week's wages.
                const b = r.statuteId ? cat.byId.statute[r.statuteId] : cat.byId.book[r.bookId];
                if (!b) return null;
                const byline = r.statuteId
                  ? [b.citation, b.cost === 'free' ? 'free from the official repository' : null]
                      .filter(Boolean).join(' · ')
                  : [b.author, b.edition ? `${b.edition} ed.` : null].filter(Boolean).join(' · ');
                return (
                  <div className="book" key={n}>
                    <div className="book-title">{b.title}</div>
                    <p className="book-byline">
                      {byline}
                      {r.statuteId && b.source && (
                        <> · <a href={b.source} target="_blank" rel="noreferrer noopener">{b.source.replace(/^https?:\/\//, '')}</a></>
                      )}
                    </p>
                    <p className="book-note">{r.where}</p>
                  </div>
                );
              })}
            </>
          )}

        {/* The lesson's own authorities, under the textbooks rather than
            instead of them. Two different things share the word "reading":
            `l.reading` above is which CHAPTER to open, this is which SECTIONS
            and JUDGMENTS the lesson actually rests on, derived from the rule
            blocks rather than authored — see src/lib/reading.js. A peer read
            the heading and called them duplicates; they share no field. */}
        <ReadAlongside lesson={l} />

          {/* Still guarded on `source`, but no longer because the chunks lack it.
              They carry it now: split-content.py wrote the body chunk as a
              fixed three-key object and dropped `reading`, `source`, `verify`
              and `plateCaption` on the floor, so every lesson's source note was
              invisible until that was fixed. The guard stays for the lessons
              that genuinely have no source — half a source note is worse than
              none, and a method lesson has no authority to state. */}
          {l.source && (
            <div className="source-note">
              <p className="small"><strong>Sources.</strong> {l.source}</p>
              <p className="small">
                <strong>Verify before relying on this.</strong> <Prose text={l.verify} />{' '}
                Last checked by the author of this lesson on {l.lastVerified}.
              </p>
            </div>
          )}

          <div className="btn-row" style={{ marginTop: 'var(--space-6)' }} ref={btnRef}>
            <motion.button
              className={readAt ? '' : 'btn-primary'}
              onClick={toggle}
              disabled={busy}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {readAt ? 'Mark unread' : 'Mark as read · +60 XP'}
            </motion.button>
            {prepares.length > 0 && <Link className="btn" to={`/problem/${prepares[0].id}`}>Attempt the problem</Link>}
          </div>
          {readAt && (
            <p className="small">
              Marked read {daysAgo(readAt)}. Re-reading costs nothing and is not tracked — only
              whether you have been through it once.
            </p>
          )}

          <nav className="lesson-nav" aria-label="Curriculum">
            {prev
              ? <Link to={`/lesson/${prev.id}`}>
                  <span className="lesson-nav-dir">Previous</span>
                  <span className="lesson-nav-title">{prev.title}</span>
                </Link>
              : <span />}
            {next && (unlock[next.id]?.open
              ? (
                <Link className="is-next" to={`/lesson/${next.id}`}>
                  <span className="lesson-nav-dir">Next</span>
                  <span className="lesson-nav-title">{next.title}</span>
                </Link>
              ) : (
                <div className="is-next lesson-nav-locked">
                  <span className="lesson-nav-dir">Next · locked</span>
                  <span className="lesson-nav-title">{next.title}</span>
                  <span className="lesson-nav-need">{needLine(l, read, best)}</span>
                  {!prog.quizPassed(l, best) && (
                    <Link className="btn btn-primary" to={`/quiz/${l.id}`}>Take the quiz</Link>
                  )}
                </div>
              ))}
          </nav>
        </div>

        <aside className="toc" aria-label="Contents">
          <p className="toc-head">In this lesson</p>
          <ol className="toc-list">
            {sections.map((s, i) => (
              <li key={ids[i]}>
                <a href={`#${ids[i]}`} className={i === (stepping ? step : here) ? 'is-here' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    // While stepping the section is not on the page to scroll
                    // to, so the contents become a jump rather than an anchor.
                    if (stepping) { setStep(i); window.scrollTo({ top: 0 }); return; }
                    document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}>
                  {s.h}
                </a>
              </li>
            ))}
          </ol>
          <div className="toc-progress">
            <span className="toc-bar"><i style={{ width: `${((here + 1) / Math.max(1, sections.length)) * 100}%` }} /></span>
            Section {here + 1} of {sections.length}
          </div>
        </aside>
      </div>
      {stepping && (
        <div className="focusview" ref={readerRef} tabIndex={-1} role="dialog" aria-modal="true"
          aria-label={`${l.title} — section ${activeIdx + 1} of ${sections.length}`}>
          <div className="focusview-surface">
            <div className="focusview-top">
              <p className="focusview-where">
                {/* The read time belongs here, not only on the Mark done button
                    at the foot: a reader deciding whether to start a section
                    needs the cost before they commit to it, which is the whole
                    point of the annotation for someone studying after a shift. */}
                <span className="stepper-count">
                  Section {activeIdx + 1} of {sections.length}
                  {' · '}
                  {plural(active?.readMinutes || 1, 'min')}
                </span>
                <span className="stepper-bar" aria-hidden="true">
                  <i style={{ width: `${((activeIdx + 1) / Math.max(1, sections.length)) * 100}%` }} />
                </span>
              </p>
              <button type="button" className="focusview-close" onClick={closeReader}>
                Close ✕
              </button>
            </div>

            {/* The scroll container is a SIBLING of the sticky bars, not their
                parent. A sticky element sticks to its scrolling ancestor, so
                putting the scroll on `.focusview` would carry the top and foot
                away with the text instead of pinning them. */}
            <div className="focusview-body">
              <div className="focusview-col">
                {/* The lesson's illustration lives in the hero, and the hero is
                    not on screen in focus mode — so on the default reading path
                    a plate was shipped and never seen, the same way the reading
                    list was. It belongs at the head of the first section, which
                    is where it was always meant to be met. */}
                {activeIdx === 0 && (
                  <Plate scene={plateFor(l)} caption={l.plateCaption} />
                )}
                {renderSection(active, activeIdx)}
              </div>
            </div>

            {/* Navigation only. It never marks a section done — `lessons.js`
                refuses to infer attention from scrolling and this refuses to
                infer it from paging. If Next marked, every figure downstream
                (the section counts, the resume point, the module percentages)
                would quietly stop being a claim the reader made. */}
            <div className="focusview-foot">
              <button
                type="button"
                className="stepper-btn"
                disabled={activeIdx <= 0}
                onClick={() => { setStep(n => Math.max(0, n - 1)); toReaderTop(); }}
              >← Previous</button>
              {activeIdx >= sections.length - 1 ? (
                /* The last section's action marks the lesson AND closes the
                   reader, in that order. Two things sit behind the reader that
                   a finishing reader is exactly the audience for: the per-lesson
                   reading list, and the quiz and problem the lesson prepares.
                   Focus mode is on by default and nobody closes a reader they
                   have no reason to close, so an end that only marked would
                   dead-end every lesson — the reading list would be shipped and
                   unseen. Closing onto the page is what "only on close should
                   other contents be visible" means when the reader has finished.
                   It also puts the lesson-level mark somewhere reachable: the
                   per-section marks are inside the sections and always were,
                   this one lived on the page that is no longer on screen. */
                <button
                  type="button"
                  className="stepper-btn stepper-btn--finish"
                  disabled={busy}
                  onClick={async () => { if (!readAt) await toggle(); closeReader(); }}
                >{readAt ? 'Finish — see the reading' : 'Mark as read · +60 XP'}</button>
              ) : (
                <button
                  type="button"
                  className="stepper-btn stepper-btn--next"
                  onClick={() => { setStep(n => Math.min(sections.length - 1, n + 1)); toReaderTop(); }}
                >Next section →</button>
              )}
            </div>
          </div>
        </div>
      )}
    </TermLayer>
  );
}

/** What this lesson still needs, said in the reader's terms rather than the code's. */
function needLine(lesson, read, best) {
  const gaps = prog.missing({ ...lesson, quizCount: (lesson.quiz || []).length }, read, best);
  if (!gaps.length) return 'Ready.';
  if (gaps.length === 2) return 'Mark this lesson read, and pass its quiz.';
  return gaps[0] === 'read' ? 'Mark this lesson read.' : 'Pass this lesson’s quiz.';
}

/**
 * A locked lesson. It says what it is and exactly what opens it; only the body
 * is withheld. A lock that hid the lesson's existence would leave a reader
 * unable to tell whether the thing they need is even in this app.
 */
function Locked({ meta, cat, entry }) {
  const mod = cat.byId.module[meta.moduleId] || {};
  const blocker = entry.blockedBy;
  return (
    <div className="wrap sheet" data-module={meta.moduleId}>
      <p className="small taplink-row"><Link className="taplink" to="/lessons">← Lessons</Link> · {mod.title || ''}</p>
      <div className="locked-panel">
        <span className="locked-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <rect x="5" y="10.5" width="14" height="10" rx="2" className="lk-body" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" className="lk-shackle" />
          </svg>
        </span>
        <h1 className="locked-title">{meta.title}</h1>
        <p className="locked-kicker">
          {mod.title} · {plural(meta.minutes, 'minute')}
          {meta.quizCount ? ` · ${meta.quizCount}-question quiz` : ''}
        </p>
        <p className="locked-why">{prog.lockReason(entry)}</p>
        {blocker && (
          <Link className="btn btn-primary btn-big" to={`/lesson/${blocker.id}`}>
            Go to “{blocker.title}”
          </Link>
        )}
        <p className="small locked-note">
          The lesson is here and it is not going anywhere. What is hidden is the text, not the
          fact that it exists — and the <Link to="/glossary">glossary</Link> is never locked, so
          any term used in it can be looked up now.
        </p>
      </div>
    </div>
  );
}
