import * as content from './content.js';
import * as sched from './scheduler.js';
import * as prob from './problems.js';
import * as lessons from './lessons.js';
import { cardState, reviewLog, attempts, meta, exportAll, importAll } from './db.js';

const root = document.getElementById('view');
const railNav = document.getElementById('rail-nav');

let cat = null;

// --------------------------------------------------------------------------
// boot

async function boot() {
  try {
    cat = await content.load();
    await sched.init();
    await seedNewCards();
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    root.innerHTML = `<div class="notice"><strong>Could not start.</strong><br>${esc(err.message)}
      <br><br>If you opened this file directly, serve it over HTTP instead —
      <code>python3 -m http.server</code> in the project folder.</div>`;
  }
}

/** Any card in /content with no saved state gets a fresh FSRS state. */
async function seedNewCards() {
  const existing = new Set((await cardState.all()).map(c => c.id));
  const missing = cat.cards.filter(c => !existing.has(c.id));
  if (!missing.length) return;
  await cardState.putMany(missing.map(c => sched.newState(c.id, c.moduleId)));
}

// --------------------------------------------------------------------------
// router

const routes = {
  '': home,
  '#/': home,
  '#/review': review,
  '#/lessons': lessonIndex,
  '#/problems': problems,
  '#/books': books,
  '#/progress': progress,
  '#/settings': settings,
};

const prefixRoutes = [
  ['#/module/', moduleView],
  ['#/problem/', problemView],
  ['#/lesson/', lessonView],
];

function route() {
  const hash = location.hash || '#/';
  const [base, arg] = hash.split('?');
  const view = routes[base]
    || (prefixRoutes.find(([pre]) => base.startsWith(pre)) || [])[1]
    || notFound;
  // Views that bind keys own them only while they are on screen. Leaving one
  // mounted means a keystroke on the next page reaches a screen that is gone.
  document.onkeydown = null;
  markCurrent(base);
  view(new URLSearchParams(arg || ''), base);
}

function markCurrent(base) {
  railNav.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === base) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function refreshRailBadge() {
  const c = await sched.counts();
  const el = document.getElementById('due-badge');
  el.textContent = c.due + c.fresh > 0 ? String(c.due + c.fresh) : '';
}

// --------------------------------------------------------------------------
// home — the curriculum as a statute's arrangement of sections

async function home() {
  const c = await sched.counts();
  await refreshRailBadge();
  const nextLesson = lessons.nextUnread(cat.lessons, await lessons.readMap());

  const perModule = await Promise.all(
    cat.modules.map(async m => ({ m, c: await sched.counts(m.id) }))
  );

  const total = c.due + c.fresh;
  const todayCopy = total === 0
    ? `<p>Nothing due. ${c.total ? 'The schedule is clear until tomorrow.' : 'Add cards under <code>content/cards/</code> to begin.'}</p>`
    : `<p>${c.due} card${c.due === 1 ? '' : 's'} due for review${c.fresh ? `, ${c.fresh} not yet seen` : ''}.</p>
       <p class="small">Reviews should take about a fifth of your study time. The rest goes to reading, briefing and problem questions.</p>`;

  root.innerHTML = `
    <div class="wrap">
      <h2>Malaysian law, from zero</h2>
      <p class="lede">A fifteen-module curriculum. Progress is gated on whether you can
        write a competent answer, not on how much you have read.</p>

      <div class="today ${total ? 'has-due' : ''}">
        ${todayCopy}
        ${total ? `<div class="btn-row"><a class="btn btn-primary" href="#/review">Start review</a></div>` : ''}
      </div>

      <h3>Arrangement of modules</h3>
      <div class="arrangement">
        ${perModule.map(({ m, c: mc }) => arrangementRow(m, mc)).join('')}
      </div>

      <div class="today" style="margin-top:2.5rem">
        <p><strong>Three layers.</strong> ${cat.lessons.length} lessons state the rules,
          ${cat.cards.length} cards keep them available, and ${cat.problems.length} problem
          questions are where you find out whether you can use them.</p>
        ${nextLesson ? `<p class="small">Next unread lesson: ${esc(nextLesson.title)} — ${nextLesson.minutes} minutes.</p>` : ''}
        <div class="btn-row">
          <a class="btn ${nextLesson ? 'btn-primary' : ''}" href="#/lessons">Lessons</a>
          <a class="btn" href="#/problems">Problem questions</a>
        </div>
      </div>

      <p class="small" style="margin-top:2rem">
        Levels follow the sequence in the study design: foundations and method first,
        then contract and criminal law, then tort and constitutional, with procedure
        and evidence last because they presuppose the substantive law.
      </p>
    </div>`;
}

function arrangementRow(m, mc) {
  const num = m.level === null || m.level === undefined ? '—' : String(m.level).padStart(2, '0');
  let state = '<span class="arr-state">no cards yet</span>';
  if (mc.total) {
    const due = mc.due + mc.fresh;
    state = due
      ? `<span class="arr-state is-due">${due} due</span>`
      : `<span class="arr-state is-clear">clear · ${mc.total} card${mc.total === 1 ? '' : 's'}</span>`;
  }
  const gap = m.gap ? ` <span class="flag flag-unverified">gap</span>` : '';
  return `
    <a class="arr-row ${mc.total ? '' : 'is-locked'}" href="#/module/${m.id}">
      <span class="arr-num">${num}</span>
      <span>
        <span class="arr-title">${esc(m.title)}</span>${gap}
        <span class="arr-meta">${m.books.length} text${m.books.length === 1 ? '' : 's'} · ${m.statuteRefs.length} statute${m.statuteRefs.length === 1 ? '' : 's'}</span>
      </span>
      ${state}
    </a>`;
}

// --------------------------------------------------------------------------
// module

async function moduleView(_params, base) {
  const id = base.replace('#/module/', '');
  const m = cat.modules.find(x => x.id === id);
  if (!m) return notFound();
  const [mc, latest, readMap] = await Promise.all([
    sched.counts(id), prob.latestByProblem(), lessons.readMap(),
  ]);

  root.innerHTML = `
    <div class="wrap">
      <p class="small"><a href="#/">← Arrangement of modules</a></p>
      <h2>${esc(m.title)}</h2>
      <p class="lede">${m.level === null ? 'Method module' : `Level ${m.level}`} · ${m.lessons.length} lesson${m.lessons.length === 1 ? '' : 's'} · ${mc.total} card${mc.total === 1 ? '' : 's'} · ${m.problems.length} problem${m.problems.length === 1 ? '' : 's'}</p>

      ${m.gap ? `<div class="notice"><strong>Known gap.</strong> ${esc(m.gap)}</div>` : ''}

      <div class="stat-grid">
        <div class="stat"><span class="n">${mc.due}</span><span class="k">due now</span></div>
        <div class="stat"><span class="n">${mc.fresh}</span><span class="k">not yet seen</span></div>
        <div class="stat"><span class="n">${mc.review}</span><span class="k">in review</span></div>
      </div>

      ${mc.due + mc.fresh
        ? `<div class="btn-row"><a class="btn btn-primary" href="#/review?module=${id}">Review this module</a></div>`
        : `<p class="small">Nothing due in this module.</p>`}

      <h3>Lessons</h3>
      ${m.lessons.length
        ? `<div class="arrangement">${m.lessons.map(l => lessonRow(l, readMap[l.id])).join('')}</div>`
        : `<p class="small">No lesson written for this module yet. The reading list below is the
             route in, and it is the honest one — a lesson here would be a summary of a book
             nobody has read.</p>`}

      <h3>Problem questions</h3>
      ${m.problems.length
        ? `<div class="arrangement">${m.problems.map(p => problemRow(p, latest[p.id])).join('')}</div>`
        : '<p class="small">None written for this module yet.</p>'}

      <h3>Reading</h3>
      ${m.books.length ? m.books.map(bookRow).join('') : '<p class="small">No text assigned yet.</p>'}

      <h3>Statutes</h3>
      ${m.statuteRefs.length ? m.statuteRefs.map(statuteRow).join('') : '<p class="small">None.</p>'}
    </div>`;
}

// --------------------------------------------------------------------------
// review

async function review(params) {
  const moduleId = params.get('module') || null;
  const { queue } = await sched.buildQueue({ moduleId });

  if (!queue.length) {
    root.innerHTML = `<div class="wrap review">
      <p class="small"><a href="#/">← Arrangement of modules</a></p>
      <h2>Nothing due</h2>
      <p class="lede">Come back tomorrow. Consistency beats volume — FSRS assumes you show up.</p>
    </div>`;
    return;
  }

  let i = 0;
  let revealed = false;
  const done = { again: 0, hard: 0, good: 0, easy: 0 };
  const startedAt = Date.now();

  async function render() {
    if (i >= queue.length) return finish();
    const state = queue[i];
    const card = cat.byId.card[state.id];
    if (!card) { i++; return render(); }

    const prev = sched.preview(state);
    const kind = cat.cardTypes[card.type] ? card.type : 'card';

    root.innerHTML = `
      <div class="review">
        <div class="review-progress">
          <span>${i + 1} of ${queue.length}</span>
          <span>${esc((cat.byId.module[card.moduleId] || {}).title || '')}</span>
        </div>

        <div class="card-face">
          <p class="card-kind">${esc(kind)}</p>
          <p class="card-front">${esc(card.front)}</p>
          ${revealed ? `
            <div class="card-back">
              <p>${esc(card.back)}</p>
              ${card.note ? `<p class="card-note">${esc(card.note)}</p>` : ''}
              <p class="card-source">${esc(card.source || '')}</p>
            </div>` : ''}
        </div>

        ${revealed ? `
          <div class="grades">
            ${sched.RATING_LABELS.map(r => `
              <button class="grade" data-key="${r.key}" title="${esc(r.hint)}">
                <span class="g-label">${r.label}</span>
                <span class="g-int">${prev[r.key].interval}</span>
              </button>`).join('')}
          </div>
          <p class="keyhint">1 forgot · 2 hard · 3 good · 4 easy. Press Forgot when you actually failed — using Hard as a soft fail inflates every future interval.</p>
        ` : `
          <div class="btn-row" style="margin-top:2.5rem">
            <button class="btn-primary" id="show">Show answer</button>
          </div>
          <p class="keyhint">Space or Enter to reveal. Try to answer out loud first.</p>
        `}
      </div>`;

    if (!revealed) {
      document.getElementById('show').onclick = () => { revealed = true; render(); };
    } else {
      root.querySelectorAll('.grade').forEach(b => {
        b.onclick = () => submit(b.dataset.key);
      });
    }
  }

  async function submit(key) {
    await sched.grade(queue[i], key);
    done[key]++;
    i++;
    revealed = false;
    render();
    refreshRailBadge();
  }

  function finish() {
    const mins = Math.round((Date.now() - startedAt) / 60000);
    root.innerHTML = `
      <div class="wrap review">
        <h2>Session done</h2>
        <p class="lede">${queue.length} card${queue.length === 1 ? '' : 's'} in about ${Math.max(mins, 1)} minute${mins === 1 ? '' : 's'}.</p>
        <div class="stat-grid">
          <div class="stat"><span class="n">${done.again}</span><span class="k">forgot</span></div>
          <div class="stat"><span class="n">${done.hard}</span><span class="k">hard</span></div>
          <div class="stat"><span class="n">${done.good}</span><span class="k">good</span></div>
          <div class="stat"><span class="n">${done.easy}</span><span class="k">easy</span></div>
        </div>
        <p class="small">Reviews are the memory layer. The reasoning layer needs a problem
          question and a written answer — that is where the actual learning happens.</p>
        <div class="btn-row"><a class="btn" href="#/">Back to modules</a></div>
      </div>`;
    refreshRailBadge();
  }

  document.onkeydown = (e) => {
    if (!location.hash.startsWith('#/review')) { document.onkeydown = null; return; }
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); revealed = true; render(); return; }
    if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      submit(sched.RATING_LABELS[Number(e.key) - 1].key);
    }
  };

  render();
}

// --------------------------------------------------------------------------
// lessons — the exposition
//
// The layer that was missing. Cards keep a rule available and problems test
// whether it can be used; neither teaches, and without this the module pages
// were a reading list with a testing harness attached.

async function lessonIndex() {
  const read = await lessons.readMap();
  const next = lessons.nextUnread(cat.lessons, read);
  const byModule = cat.modules
    .map(m => ({ m, list: m.lessons }))
    .filter(g => g.list.length);
  const doneCount = cat.lessons.filter(l => read[l.id]).length;

  root.innerHTML = `
    <div class="wrap">
      <h2>Lessons</h2>
      <p class="lede">${cat.lessons.length} lessons, about ${lessons.totalMinutes(cat.lessons)} minutes of reading.
        You have marked ${doneCount} as read.</p>

      ${next ? `
        <div class="today has-due">
          <p><strong>Next:</strong> ${esc(next.title)} — ${next.minutes} minutes.</p>
          <p class="small">${esc(next.summary)}</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/lesson/${next.id}">Read it</a></div>
        </div>`
      : `<div class="today"><p>Every lesson is marked read. The work is now in the cards and the
           problem questions — and in the textbooks, which is where the depth is.</p></div>`}

      <div class="notice">
        A lesson states rules. It does not vouch for them: each one names its sources and
        carries a line saying what must be checked against a current text. Treat it as an
        orientation to the reading, not a replacement for it.
      </div>

      ${byModule.map(({ m, list }) => `
        <h3>${esc(m.title)}</h3>
        <div class="arrangement">${list.map(l => lessonRow(l, read[l.id])).join('')}</div>
      `).join('')}
    </div>`;
}

function lessonRow(l, readAt) {
  const state = readAt
    ? `<span class="arr-state is-clear">read ${daysAgo(readAt)}</span>`
    : '<span class="arr-state">unread</span>';
  const links = [
    (l.plants || []).length ? `${l.plants.length} card${l.plants.length === 1 ? '' : 's'}` : '',
    (l.prepares || []).length ? `${l.prepares.length} problem${l.prepares.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
  return `
    <a class="arr-row" href="#/lesson/${l.id}">
      <span class="arr-num">${l.minutes}′</span>
      <span>
        <span class="arr-title">${esc(l.title)}</span>
        <span class="arr-meta">${esc(l.summary)}${links ? ` — ${links}` : ''}</span>
      </span>
      ${state}
    </a>`;
}

async function lessonView(_params, base) {
  const id = base.replace('#/lesson/', '');
  const l = cat.byId.lesson[id];
  if (!l) return notFound();

  const mod = cat.byId.module[l.moduleId] || {};
  const read = await lessons.readMap();
  const siblings = mod.lessons || [];
  const i = siblings.findIndex(x => x.id === l.id);
  const nextInModule = siblings[i + 1] || null;

  const cards = (l.plants || []).map(cid => cat.byId.card[cid]).filter(Boolean);
  const prepares = (l.prepares || []).map(pid => cat.byId.problem[pid]).filter(Boolean);

  function render() {
    const readAt = read[l.id];
    root.innerHTML = `
      <div class="wrap lesson">
        <div class="review-progress">
          <span><a href="#/lessons">← Lessons</a> · <a href="#/module/${l.moduleId}">${esc(mod.title || '')}</a></span>
          <span>${l.minutes} minutes${siblings.length > 1 ? ` · ${i + 1} of ${siblings.length}` : ''}</span>
        </div>

        <h2>${esc(l.title)}</h2>
        <p class="lede">${esc(l.summary)}</p>

        ${(l.sections || []).map(sec => `
          <section class="lsec">
            <h3>${esc(sec.h)}</h3>
            ${(sec.body || []).map(block).join('')}
          </section>`).join('')}

        <div class="handoff">
          <h3>What this lesson hands off to</h3>
          ${cards.length ? `
            <p class="small">It plants ${cards.length} card${cards.length === 1 ? '' : 's'}, which the
              scheduler will start showing you. They are already in the deck — reading this is what
              makes them answerable rather than guessable.</p>
            <ul class="plantlist">${cards.map(c => `<li>${esc(c.front)}</li>`).join('')}</ul>`
          : '<p class="small">No cards are attached to this lesson yet.</p>'}

          ${prepares.length ? `
            <p class="small" style="margin-top:1.25rem">It prepares you for:</p>
            <div class="arrangement">
              ${prepares.map(pr => `
                <a class="arr-row" href="#/problem/${pr.id}">
                  <span class="arr-num">${pr.minutes}′</span>
                  <span><span class="arr-title">${esc(pr.title)}</span>
                    <span class="arr-meta">${prob.totalMarks(pr)} marks · written to follow this lesson</span></span>
                  <span class="arr-state">problem</span>
                </a>`).join('')}
            </div>` : ''}
        </div>

        ${(l.reading || []).length ? `
          <h3>Read alongside</h3>
          ${l.reading.map(r => {
            const b = cat.byId.book[r.bookId];
            return b ? `<div class="book">
              <div class="book-title">${esc(b.title)}</div>
              <p class="book-byline">${esc([b.author, b.edition ? `${b.edition} ed.` : null].filter(Boolean).join(' · '))}</p>
              <p class="book-note">${esc(r.where)}</p>
            </div>` : '';
          }).join('')}` : ''}

        <div class="source-note">
          <p class="small"><strong>Sources.</strong> ${esc(l.source)}</p>
          <p class="small"><strong>Verify before relying on this.</strong> ${esc(l.verify)}
            Last checked by the author of this lesson on ${esc(l.lastVerified)}.</p>
        </div>

        <div class="btn-row" style="margin-top:2rem">
          <button class="${readAt ? '' : 'btn-primary'}" id="toggle">${readAt ? 'Mark unread' : 'Mark as read'}</button>
          ${nextInModule ? `<a class="btn" href="#/lesson/${nextInModule.id}">Next: ${esc(nextInModule.title)}</a>` : ''}
          ${prepares.length ? `<a class="btn" href="#/problem/${prepares[0].id}">Attempt the problem</a>` : ''}
        </div>
        ${readAt ? `<p class="small">Marked read ${daysAgo(readAt)}. Re-reading costs nothing and is not
          tracked — only whether you have been through it once.</p>` : ''}
      </div>`;

    document.getElementById('toggle').onclick = async () => {
      const m = read[l.id] ? await lessons.markUnread(l.id) : await lessons.markRead(l.id);
      Object.keys(read).forEach(k => delete read[k]);
      Object.assign(read, m);
      render();
      window.scrollTo(0, document.body.scrollHeight);
    };
  }

  render();
}

function block(b) {
  switch (b.t) {
    case 'rule':
      return `<div class="ruleblock"><p>${esc(b.text)}</p>${
        b.source ? `<p class="rb-src">${esc(b.source)}</p>` : ''}</div>`;
    case 'example':
      return `<div class="exblock"><p><span class="xlabel">Example</span>${esc(b.text)}</p></div>`;
    case 'caution':
      return `<div class="cautionblock"><p><span class="xlabel">Careful</span>${esc(b.text)}</p></div>`;
    case 'list':
      return `<ul class="lsec-list">${(b.items || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    default:
      return `<p>${esc(b.text)}</p>`;
  }
}

// --------------------------------------------------------------------------
// problem questions — the reasoning layer
//
// Three stages, in this order and not a different one. You write under time
// with nothing to look at; you predict your own mark before the rubric is
// visible; then you mark yourself against it. The prediction is the point of
// the middle stage: a mark you did not see coming is the only evidence that
// your sense of your own work is wrong, and that is the error a self-taught
// student cannot otherwise detect.

async function problems() {
  const latest = await prob.latestByProblem();
  const ordered = prob.listOrder(cat.problems, latest);
  const suggestion = ordered[0];

  const byModule = cat.modules
    .map(m => ({ m, list: cat.problems.filter(p => p.moduleId === m.id) }))
    .filter(g => g.list.length);

  const attempted = Object.keys(latest).length;

  root.innerHTML = `
    <div class="wrap">
      <h2>Problem questions</h2>
      <p class="lede">${cat.problems.length} questions. You have attempted ${attempted}.
        Write the answer first, in full, before you look at anything.</p>

      ${suggestion ? `
        <div class="today has-due">
          <p><strong>${latest[suggestion.id] ? 'Weakest so far' : 'Start here'}:</strong>
            ${esc(suggestion.title)} — ${suggestion.minutes} minutes, ${prob.totalMarks(suggestion)} marks.</p>
          <div class="btn-row"><a class="btn btn-primary" href="#/problem/${suggestion.id}">Open it</a></div>
        </div>` : ''}

      <div class="notice">
        The rubric and the model answer are written to be marked against, not to be
        cited. Every question names what must be checked against a current source
        before its reasoning is relied on for anything real.
      </div>

      ${byModule.map(({ m, list }) => `
        <h3>${esc(m.title)}</h3>
        <div class="arrangement">${list.map(p => problemRow(p, latest[p.id])).join('')}</div>
      `).join('')}

      <p class="small" style="margin-top:2.5rem">
        There is no due date on this page and no badge in the rail for it. A spacing
        algorithm fitted to single-fact recall has nothing to say about a
        forty-minute piece of writing, and a number that looked like the review
        counts would be read like them.
      </p>
    </div>`;
}

function problemRow(p, last) {
  const total = prob.totalMarks(p);
  let state = '<span class="arr-state">not attempted</span>';
  if (last) {
    const pc = prob.percent(last.score, last.total);
    const cls = pc >= 70 ? 'is-clear' : pc >= 50 ? '' : 'is-due';
    state = `<span class="arr-state ${cls}">${last.score}/${last.total} · ${daysAgo(last.markedAt)}</span>`;
  }
  return `
    <a class="arr-row" href="#/problem/${p.id}">
      <span class="arr-num">${p.minutes}′</span>
      <span>
        <span class="arr-title">${esc(p.title)}</span>
        <span class="arr-meta">${esc(p.kind)} · ${total} marks · ${(p.rubric || []).length} criteria</span>
      </span>
      ${state}
    </a>`;
}

async function problemView(_params, base) {
  const id = base.replace('#/problem/', '');
  const p = cat.byId.problem[id];
  if (!p) return notFound();

  const total = prob.totalMarks(p);
  const mod = cat.byId.module[p.moduleId] || {};
  const history = await prob.historyFor(id);
  const lesson = lessons.lessonForProblem(cat.lessons, id);

  const saved = await prob.draft.load(id);
  const run = saved || {
    stage: 'read', text: '', startedAt: null, elapsedMs: 0, predicted: null, awarded: {},
  };

  // The clock accrues only while the writing stage is on screen. Reading the
  // facts is not writing time, and neither is marking.
  let since = null;
  let ticker = null;
  const elapsed = () => run.elapsedMs + (since ? Date.now() - since : 0);
  // Idempotent, because the writing stage can be entered either by pressing the
  // button or by resuming a saved draft straight into it. Starting the clock
  // twice would drop the first interval; starting it in `go` alone would leave a
  // resumed attempt running untimed, which is the case the draft exists for.
  const clockIn  = () => { if (since === null) since = Date.now(); };
  const clockOut = () => { if (since) { run.elapsedMs += Date.now() - since; since = null; } };

  const persist = () => prob.draft.save(id, { ...run, elapsedMs: elapsed() });

  function go(stage) {
    if (run.stage === 'write') clockOut();
    run.stage = stage;
    persist();
    render();
  }

  const header = (right = '') => `
    <div class="review-progress">
      <span><a href="#/problems">← Problem questions</a> · ${esc(mod.title || '')}</span>
      <span>${right}</span>
    </div>`;

  const factsBlock = `
    <div class="facts">
      <p class="card-kind">${esc(p.kind)} · ${p.minutes} minutes · ${total} marks</p>
      ${(p.scenario || []).map(t => `<p>${esc(t)}</p>`).join('')}
      <p class="task"><strong>${esc(p.task)}</strong></p>
    </div>`;

  function render() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    ({ read: readStage, write: writeStage, predict: predictStage, mark: markStage, done: doneStage }
      [run.stage] || readStage)();
  }

  // --- stage 1: read ------------------------------------------------------
  function readStage() {
    root.innerHTML = `
      <div class="wrap problem">
        ${header(history.length ? `${history.length} previous attempt${history.length === 1 ? '' : 's'}` : '')}
        <h2>${esc(p.title)}</h2>
        ${factsBlock}

        <div class="notice">
          Write the whole answer before you look at the rubric or the model. Reading the
          rubric first turns the exercise into a checklist and destroys the only
          measurement it makes.
        </div>

        ${lesson ? `<p class="small">This question was written to follow
          <a href="#/lesson/${lesson.id}">${esc(lesson.title)}</a>. Read it first if you have not.</p>` : ''}

        <div class="btn-row">
          <button class="btn-primary" id="start">${run.text ? 'Carry on writing' : 'Start writing'}</button>
        </div>
        ${run.text ? `<p class="small">A draft from ${daysAgo(run.startedAt)} is saved — ${prob.countWords(run.text)} words, ${fmtClock(run.elapsedMs)} on the clock.</p>` : ''}

        ${history.length ? `
          <h3>Previous attempts</h3>
          <div class="arrangement">
            ${history.map(a => `
              <div class="arr-row" style="cursor:default">
                <span class="arr-num">${a.score}/${a.total}</span>
                <span><span class="arr-title">${daysAgo(a.markedAt)}</span>
                  <span class="arr-meta">${a.words} words · ${a.minutesSpent} min${typeof a.predicted === 'number' ? ` · predicted ${a.predicted}` : ''}</span></span>
                <span class="arr-state">${prob.percent(a.score, a.total)}%</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
    document.getElementById('start').onclick = () => go('write');
  }

  // --- stage 2: write -----------------------------------------------------
  function writeStage() {
    run.startedAt ||= new Date().toISOString();
    clockIn();
    root.innerHTML = `
      <div class="wrap problem">
        ${header(`<span id="clock" class="clock">${fmtClock(elapsed())}</span> of ${p.minutes}′`)}
        <h2>${esc(p.title)}</h2>
        ${factsBlock}
        <textarea id="answer" class="answer" spellcheck="true"
          placeholder="Issue. Rule. Application. Conclusion. Write it as you would in the hall — full sentences, authorities named, no notes to yourself.">${esc(run.text)}</textarea>
        <div class="write-bar">
          <span class="small" id="words">${prob.countWords(run.text)} words</span>
          <span class="btn-row">
            <button id="pause">Save and stop</button>
            <button class="btn-primary" id="finish">Finished — mark it</button>
          </span>
        </div>
      </div>`;

    const ta = document.getElementById('answer');
    const words = document.getElementById('words');
    const clock = document.getElementById('clock');
    ta.focus();
    ta.selectionStart = ta.selectionEnd = ta.value.length;

    let t = null;
    ta.oninput = () => {
      run.text = ta.value;
      words.textContent = `${prob.countWords(run.text)} words`;
      clearTimeout(t);
      t = setTimeout(persist, 600);
    };

    ticker = setInterval(() => {
      const ms = elapsed();
      clock.textContent = fmtClock(ms);
      clock.classList.toggle('is-over', ms > p.minutes * 60000);
    }, 1000);

    document.getElementById('pause').onclick = () => { clockOut(); persist(); location.hash = '#/problems'; };
    document.getElementById('finish').onclick = () => {
      if (!run.text.trim()) return toast('Nothing written yet.');
      go('predict');
    };
  }

  // --- stage 3: predict ---------------------------------------------------
  function predictStage() {
    root.innerHTML = `
      <div class="wrap problem">
        ${header(`${prob.countWords(run.text)} words · ${fmtClock(run.elapsedMs)}`)}
        <h2>Before the rubric</h2>
        <p class="lede">The rubric has ${(p.rubric || []).length} criteria and ${total} marks.
          You have not seen it. What do you think that answer earned?</p>

        <div class="predict">
          <label for="pred">Your prediction, out of ${total}</label>
          <input type="number" id="pred" min="0" max="${total}" step="0.5"
            value="${run.predicted ?? ''}" inputmode="decimal">
        </div>

        <p class="small">This is the only number the app records that you cannot revise
          once you have seen the answer. The gap between it and your own mark is the
          measurement — a consistent over-estimate is the error that survives a degree,
          because you cannot correct a gap you do not believe is there.</p>

        <div class="btn-row">
          <button id="back">Back to the answer</button>
          <button class="btn-primary" id="reveal">Show the rubric</button>
        </div>
      </div>`;

    const input = document.getElementById('pred');
    input.focus();
    document.getElementById('back').onclick = () => go('write');
    document.getElementById('reveal').onclick = () => {
      const v = Number(input.value);
      if (input.value === '' || Number.isNaN(v) || v < 0 || v > total) {
        return toast(`Give a number between 0 and ${total}.`);
      }
      run.predicted = v;
      go('mark');
    };
  }

  // --- stage 4: mark ------------------------------------------------------
  function markStage() {
    const rubric = [...(p.rubric || [])].sort((a, b) => prob.bandRank(a.band) - prob.bandRank(b.band));

    root.innerHTML = `
      <div class="wrap problem">
        ${header(`predicted ${run.predicted} / ${total}`)}
        <h2>Mark your own answer</h2>
        <p class="lede">Be strict. A mark you award yourself for a point you nearly made
          is a mark you will not make in the hall.</p>

        <details class="fold">
          <summary>Your answer — ${prob.countWords(run.text)} words in ${fmtClock(run.elapsedMs)}</summary>
          <div class="answer-read">${esc(run.text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</div>
        </details>

        <div class="running"><span id="running">0</span> / ${total} awarded</div>

        <div class="rubric">
          ${rubric.map(r => `
            <div class="crit" data-crit="${r.id}">
              <div class="crit-head">
                <span class="band band-${esc(r.band)}">${esc(prob.BANDS[r.band] || r.band)}</span>
                <span class="crit-marks">${r.marks} mark${r.marks === 1 ? '' : 's'}</span>
              </div>
              <p class="crit-text">${esc(r.criterion)}</p>
              ${r.authority && r.authority !== '—' ? `<p class="crit-auth">${esc(r.authority)}</p>` : ''}
              <div class="credit">
                ${prob.CREDIT.map(c => `
                  <button data-v="${c.value}" title="${esc(c.hint)}"
                    class="${run.awarded[r.id] === c.value ? 'is-on' : ''}">${c.label}</button>`).join('')}
              </div>
            </div>`).join('')}
        </div>

        <details class="fold">
          <summary>Model answer</summary>
          ${(p.modelAnswer || []).map(b => `
            <h4>${esc(b.h)}</h4>
            ${(b.p || []).map(t => `<p>${esc(t)}</p>`).join('')}`).join('')}
        </details>

        ${(p.traps || []).length ? `
          <details class="fold">
            <summary>Where this question is usually lost</summary>
            <ul>${p.traps.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          </details>` : ''}

        <div class="source-note">
          <p class="small"><strong>Sources.</strong> ${esc(p.source)}</p>
          <p class="small"><strong>Verify before relying on this.</strong> ${esc(p.verify)}
            Last checked by the author of this question on ${esc(p.lastVerified)}.</p>
        </div>

        <div class="btn-row" style="margin-top:2rem">
          <button class="btn-primary" id="save">Save this attempt</button>
          <button id="copy">Copy answer and rubric</button>
        </div>
        <p class="small">“Copy answer and rubric” puts the facts, what you wrote and the
          rubric on the clipboard, for a second opinion from a person or a model. The app
          does not mark anything and has nowhere safe to hold a key.</p>
      </div>`;

    const running = document.getElementById('running');
    const refresh = () => { running.textContent = prob.scoreOf(p, run.awarded); };
    refresh();

    root.querySelectorAll('.crit').forEach(el => {
      const rid = el.dataset.crit;
      el.querySelectorAll('.credit button').forEach(b => {
        b.onclick = () => {
          run.awarded[rid] = Number(b.dataset.v);
          el.querySelectorAll('.credit button').forEach(o => o.classList.toggle('is-on', o === b));
          refresh();
          persist();
        };
      });
    });

    document.getElementById('copy').onclick = () => copyText(prob.markingPacket(p, { ...run, elapsedMs: run.elapsedMs }));

    document.getElementById('save').onclick = async () => {
      const unmarked = (p.rubric || []).filter(r => run.awarded[r.id] === undefined);
      if (unmarked.length && !confirm(
        `${unmarked.length} criteri${unmarked.length === 1 ? 'on has' : 'a have'} not been marked. ` +
        `They will score zero. Save anyway?`)) return;
      const row = await prob.record(p, { ...run, elapsedMs: run.elapsedMs });
      run.saved = row;
      run.stage = 'done';
      render();
    };
  }

  // --- stage 5: done ------------------------------------------------------
  function doneStage() {
    const a = run.saved;
    if (!a) return readStage();
    const gap = a.predicted - a.score;
    const verdict = Math.abs(gap) <= 1
      ? 'Your sense of the answer matched the rubric. That is the harder half of this exercise.'
      : gap > 0
        ? `You thought it was ${round1(gap)} mark${Math.abs(gap) === 1 ? '' : 's'} better than it was. Over-estimating is the ordinary direction, and the fix is to write the rule out in full rather than gesture at it.`
        : `You marked yourself ${round1(-gap)} mark${Math.abs(gap) === 1 ? '' : 's'} above your own prediction. Under-estimating costs less, but it makes it hard to tell a good answer from a lucky one.`;

    const missed = (p.rubric || [])
      .filter(r => (a.awarded[r.id] ?? 0) < 1)
      .sort((x, y) => prob.bandRank(x.band) - prob.bandRank(y.band));

    root.innerHTML = `
      <div class="wrap problem">
        ${header('')}
        <h2>${a.score} out of ${a.total}</h2>
        <p class="lede">${prob.percent(a.score, a.total)}% · ${a.words} words in ${a.minutesSpent} minute${a.minutesSpent === 1 ? '' : 's'} against a ${p.minutes}-minute target.</p>

        <div class="stat-grid">
          <div class="stat"><span class="n">${a.predicted}</span><span class="k">you predicted</span></div>
          <div class="stat"><span class="n">${a.score}</span><span class="k">you awarded</span></div>
          <div class="stat"><span class="n">${gap > 0 ? '+' : ''}${round1(gap)}</span><span class="k">calibration gap</span></div>
        </div>

        <p>${verdict}</p>

        ${missed.length ? `
          <h3>What to take away</h3>
          <div class="arrangement">
            ${missed.map(r => `
              <div class="arr-row" style="cursor:default">
                <span class="arr-num">${(a.awarded[r.id] ?? 0) === 0.5 ? 'half' : '0'}</span>
                <span><span class="arr-title">${esc(prob.BANDS[r.band] || r.band)}</span>
                  <span class="arr-meta">${esc(r.criterion)}</span></span>
              </div>`).join('')}
          </div>` : '<p>Full marks on every criterion. Attempt it again cold in a month.</p>'}

        <div class="btn-row" style="margin-top:2rem">
          <a class="btn" href="#/problems">Other questions</a>
          <a class="btn" href="#/progress">Progress</a>
        </div>
      </div>`;
  }

  window.addEventListener('hashchange', function off() {
    if (ticker) clearInterval(ticker);
    clockOut();
    if (run.stage !== 'done') persist();
    window.removeEventListener('hashchange', off);
  });

  render();
}

function fmtClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function round1(n) { return Math.round(n * 10) / 10; }

function daysAgo(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.round(d / 30.44)} months ago`;
  return `${(d / 365.25).toFixed(1)} years ago`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    // Clipboard access can be refused outright; show the text rather than fail.
    const ta = document.createElement('textarea');
    ta.className = 'answer';
    ta.value = text;
    ta.readOnly = true;
    root.prepend(ta);
    ta.select();
    toast('Could not reach the clipboard — copy it from the box above.');
  }
}

// --------------------------------------------------------------------------
// books

function books() {
  const confirmed = cat.books.filter(b => b.verified === 'confirmed');
  const unconfirmed = cat.books.filter(b => b.verified !== 'confirmed');

  root.innerHTML = `
    <div class="wrap">
      <h2>Reading</h2>
      <p class="lede">Editions matter more in law than in any other subject. Everything below
        carries its verification status.</p>

      <div class="notice">
        Free sources have no citator. You cannot confirm from the AGC portal or CommonLII
        alone that a case is still good law — that needs CLJ, LexisNexis CaseBase, or
        Westlaw Citator.
      </div>

      <h3>Edition confirmed</h3>
      ${confirmed.map(bookRow).join('')}

      <h3>Edition not verified — check before buying</h3>
      ${unconfirmed.map(bookRow).join('')}

      <h3>Statutes — free</h3>
      ${cat.statutes.map(statuteRow).join('')}

      <h3>Where to buy</h3>
      ${cat.vendors.map(v => `
        <div class="book">
          <div class="book-title">${esc(v.name)}${v.cost === 'free' ? '<span class="flag flag-free">free</span>' : ''}</div>
          <p class="book-byline">${esc(v.url)}</p>
          <p class="book-note">${esc(v.notes || '')}</p>
        </div>`).join('')}
    </div>`;
}

function bookRow(b) {
  const flags = [
    b.verified !== 'confirmed' ? '<span class="flag flag-unverified">verify edition</span>' : '',
    b.staleness === 'high' ? '<span class="flag flag-stale">badly dated</span>' : '',
    b.staleness === 'medium' ? '<span class="flag flag-stale">dated</span>' : '',
    b.studentEdition ? '<span class="flag flag-student">student edition</span>' : '',
  ].join('');
  const bits = [b.author, b.edition ? `${b.edition} ed.` : null, b.publisher, b.year]
    .filter(Boolean).join(' · ');
  return `
    <div class="book">
      <div class="book-title">${esc(b.title)}${flags}</div>
      <p class="book-byline">${esc(bits)}</p>
      <p class="book-note">${esc(b.notes || '')}</p>
    </div>`;
}

function statuteRow(s) {
  return `
    <div class="book">
      <div class="book-title">${esc(s.title)}${s.citation ? ` <span class="small">${esc(s.citation)}</span>` : ''}</div>
      <p class="book-byline">${esc(s.source)}</p>
      ${s.notes ? `<p class="book-note">${esc(s.notes)}</p>` : ''}
    </div>`;
}

// --------------------------------------------------------------------------
// progress

async function progress() {
  const [logs, c, tries, readMap] = await Promise.all([
    reviewLog.all(), sched.counts(), attempts.all(), lessons.readMap(),
  ]);
  const now = Date.now();
  const day = 86400000;

  const last30 = logs.filter(l => now - new Date(l.reviewedAt) < 30 * day);
  const lapses = last30.filter(l => l.ratingKey === 'again').length;
  const accuracy = last30.length ? Math.round((1 - lapses / last30.length) * 100) : null;

  const days = new Set(logs.map(l => l.reviewedAt.slice(0, 10)));
  const streak = countStreak(days);

  root.innerHTML = `
    <div class="wrap">
      <h2>Progress</h2>
      <p class="lede">Two layers, measured separately. Review counts say whether the rules
        are still available to you; problem marks say whether you can use them.</p>

      <div class="stat-grid">
        <div class="stat"><span class="n">${logs.length}</span><span class="k">reviews all time</span></div>
        <div class="stat"><span class="n">${last30.length}</span><span class="k">last 30 days</span></div>
        <div class="stat"><span class="n">${accuracy === null ? '—' : accuracy + '%'}</span><span class="k">recall, 30 days</span></div>
        <div class="stat"><span class="n">${streak}</span><span class="k">day streak</span></div>
        <div class="stat"><span class="n">${c.total}</span><span class="k">cards total</span></div>
        <div class="stat"><span class="n">${c.review}</span><span class="k">in long-term review</span></div>
      </div>

      ${accuracy !== null && accuracy < 80 ? `<div class="notice">
        Recall is under 80%. That usually means cards are carrying too much at once —
        split them into single facts rather than lowering the retention setting.
      </div>` : ''}

      <h3>The reading layer</h3>
      ${readingSection(readMap)}

      <h3>The reasoning layer</h3>
      ${reasoningSection(tries)}

      <h3>What this page still cannot tell you</h3>
      <p>Both halves above are self-reported. The reviews record whether you pressed
        Forgot honestly and the problem marks record whether you marked yourself
        honestly, and nothing in the app can check either. The calibration figure is
        the closest it gets: it compares one judgment you made against another you
        made a few minutes later, which at least catches drift.</p>
      <p class="small">Nothing here measures a timed answer written under supervision,
        or an answer read by someone who knows the law better than you do. Neither is
        a thing a static site can supply.</p>
    </div>`;
}

function readingSection(readMap) {
  const done = cat.lessons.filter(l => readMap[l.id]);
  const next = lessons.nextUnread(cat.lessons, readMap);
  if (!done.length) {
    return `<p>No lessons marked read. ${cat.lessons.length} are written, about
      ${lessons.totalMinutes(cat.lessons)} minutes in all —
      <a href="#/lessons">start with the first</a>.</p>`;
  }
  return `<p>${done.length} of ${cat.lessons.length} lessons marked read.
    ${next ? `Next: <a href="#/lesson/${next.id}">${esc(next.title)}</a>, ${next.minutes} minutes.`
           : 'All of them.'}</p>
    <p class="small">This is the weakest signal on the page and it is meant to be. It records
    that you pressed a button, not that you understood anything — the cards and the problem
    marks are what test that.</p>`;
}

function reasoningSection(tries) {
  if (!tries.length) {
    return `<p>No problem questions attempted yet. ${cat.problems.length} are written and waiting
      — <a href="#/problems">start with one</a>. This is the half of the curriculum the
      review counts above say nothing about.</p>`;
  }

  const byProblem = new Set(tries.map(a => a.problemId));
  const marks = tries.reduce((n, a) => n + prob.percent(a.score, a.total), 0) / tries.length;
  const cal = prob.calibration(tries);
  const bands = prob.bandBreakdown(cat.byId.problem, tries);
  const recent = [...tries].sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt)).slice(0, 5);

  const calCopy = !cal ? '' : cal.direction === 'level'
    ? `<p>Your predictions are level with your own marking, out by ${cal.spread} mark${cal.spread === 1 ? '' : 's'} on average across ${cal.n} attempt${cal.n === 1 ? '' : 's'}. That is the useful state: it means a mark you are unhappy with is information rather than a surprise.</p>`
    : cal.direction === 'over'
      ? `<p>You predict ${round1(Math.abs(cal.mean))} mark${Math.abs(cal.mean) === 1 ? '' : 's'} above what you then award yourself, across ${cal.n} attempt${cal.n === 1 ? '' : 's'}. Over-estimating is the ordinary direction and the expensive one — it hides the gap it creates.</p>`
      : `<p>You predict ${round1(Math.abs(cal.mean))} mark${Math.abs(cal.mean) === 1 ? '' : 's'} below what you then award yourself, across ${cal.n} attempt${cal.n === 1 ? '' : 's'}. Under-estimating is cheaper, but it makes a good answer hard to tell from a lucky one.</p>`;

  return `
    <div class="stat-grid">
      <div class="stat"><span class="n">${tries.length}</span><span class="k">attempts</span></div>
      <div class="stat"><span class="n">${byProblem.size}/${cat.problems.length}</span><span class="k">questions attempted</span></div>
      <div class="stat"><span class="n">${Math.round(marks)}%</span><span class="k">mean mark</span></div>
      <div class="stat"><span class="n">${cal ? (cal.mean > 0 ? '+' : '') + cal.mean : '—'}</span><span class="k">calibration gap</span></div>
    </div>

    ${calCopy}

    <h4>Where the marks go</h4>
    <p class="small">Marks earned against marks available, by rubric band, across every
      attempt. A low band is a different problem from a low total, and it is fixed by
      different work — issue-spotting by reading more facts, application by writing
      more answers.</p>
    <div class="bands">
      ${bands.map(b => `
        <div class="band-row">
          <span class="band-name">${esc(prob.BANDS[b.band] || b.band)}</span>
          <span class="band-bar"><i style="width:${b.pct}%"></i></span>
          <span class="band-num">${b.earned}/${b.available} · ${b.pct}%</span>
        </div>`).join('')}
    </div>

    <h4>Recent attempts</h4>
    <div class="arrangement">
      ${recent.map(a => {
        const q = cat.byId.problem[a.problemId];
        return `
        <a class="arr-row" href="#/problem/${a.problemId}">
          <span class="arr-num">${a.score}/${a.total}</span>
          <span>
            <span class="arr-title">${esc(q ? q.title : a.problemId)}</span>
            <span class="arr-meta">${daysAgo(a.markedAt)} · ${a.words} words · ${a.minutesSpent} min${typeof a.predicted === 'number' ? ` · predicted ${a.predicted}` : ''}</span>
          </span>
          <span class="arr-state ${prob.percent(a.score, a.total) >= 70 ? 'is-clear' : prob.percent(a.score, a.total) < 50 ? 'is-due' : ''}">${prob.percent(a.score, a.total)}%</span>
        </a>`;
      }).join('')}
    </div>`;
}

function countStreak(daySet) {
  let n = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) { n++; d.setDate(d.getDate() - 1); }
    else if (n === 0 && key === new Date().toISOString().slice(0, 10)) { d.setDate(d.getDate() - 1); }
    else break;
  }
  return n;
}

// --------------------------------------------------------------------------
// settings

async function settings() {
  const r = sched.retention();
  const logs = await reviewLog.count();

  root.innerHTML = `
    <div class="wrap">
      <h2>Settings</h2>

      <div class="notice">
        <strong>Everything is stored in this browser only.</strong>
        There is no server and no sync. Clearing site data deletes ${logs} review${logs === 1 ? '' : 's'}
        with no way back. Export a backup regularly.
      </div>

      <h3>Backup</h3>
      <div class="btn-row">
        <button id="export" class="btn-primary">Export backup</button>
        <button id="import-btn">Import backup</button>
        <input type="file" id="import" accept="application/json" hidden>
      </div>

      <h3>Desired retention</h3>
      <p>Currently ${r}. Higher means more reviews for slightly better recall; lower means
        fewer reviews and more lapses. 0.90 is a reasonable default — leave it until you
        have a few thousand reviews logged.</p>
      <div class="btn-row">
        ${[0.85, 0.90, 0.95].map(v =>
          `<button data-ret="${v}" ${v === r ? 'disabled' : ''}>${v}</button>`).join('')}
      </div>

      <h3>Scheduler</h3>
      <p class="small">FSRS-6 via ts-fsrs, vendored locally at <code>/vendor/ts-fsrs.mjs</code>.
        No CDN, so the app works offline once loaded.</p>
    </div>`;

  document.getElementById('export').onclick = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lawstudy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup downloaded');
  };

  const fileInput = document.getElementById('import');
  document.getElementById('import-btn').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      await importAll(JSON.parse(await file.text()));
      toast('Backup restored');
      location.hash = '#/';
      location.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  root.querySelectorAll('[data-ret]').forEach(b => {
    b.onclick = async () => {
      await sched.setRetention(Number(b.dataset.ret));
      toast(`Retention set to ${b.dataset.ret}`);
      settings();
    };
  });
}

// --------------------------------------------------------------------------
// helpers

function notFound() {
  root.innerHTML = `<div class="wrap"><h2>Not found</h2>
    <p class="lede">That page does not exist. <a href="#/">Back to modules</a>.</p></div>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

boot();
