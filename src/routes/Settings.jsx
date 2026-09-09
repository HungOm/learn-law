import { useEffect, useRef, useState } from 'react';
import { useStudy } from '../state/StudyContext.jsx';
import * as sched from '../lib/scheduler.js';
import { exportAll, importAll, reviewLog } from '../lib/db.js';
import { plural } from '../lib/format.js';

const GOALS = [80, 150, 300, 600];

export default function Settings() {
  const { toast, game, setDailyGoal, reload, unlockAll, setUnlockAll } = useStudy();
  const [logs, setLogs] = useState(0);
  const [retention, setRetentionState] = useState(sched.retention());
  const fileRef = useRef(null);

  useEffect(() => { reviewLog.count().then(setLogs); }, []);

  return (
    // Not a dashboard, despite being an index of controls: every section here
    // is a heading, two or three paragraphs explaining what the setting costs,
    // and a short row of buttons. There is no grid and nothing that uses the
    // width — only prose, which keeps the reading measure.
    <div className="wrap sheet">
      <h1>Settings</h1>

      <div className="notice">
        <strong>Everything is stored in this browser only.</strong> There is no server and no
        sync. Clearing site data deletes {plural(logs, 'review')}, every problem attempt, and
        every point of XP, with no way back. Export a backup regularly.
      </div>

      <h2>Backup</h2>
      <div className="btn-row">
        <button className="btn-primary" onClick={async () => {
          const data = await exportAll();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `lawstudy-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
          toast('Backup downloaded', 'correct');
        }}>Export backup</button>
        <button onClick={() => fileRef.current.click()}>Import backup</button>
        {/* `hidden` keeps this out of the accessibility tree entirely — the
            visible "Import backup" button above is what anyone operates, and
            it carries the name. The label is belt and braces: if the hidden
            attribute is ever removed, or a stylesheet overrides it, this
            stops being an unnamed control the moment it becomes reachable. */}
        <input type="file" ref={fileRef} accept="application/json" hidden
          aria-label="Import a progress backup — a .json file exported from this site"
          onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            await importAll(JSON.parse(await file.text()));
            await reload();
            toast('Backup restored', 'correct');
          } catch (err) {
            toast(err.message);
          } finally {
            e.target.value = '';
          }
        }} />
      </div>
      <p className="small">
        The backup carries the game state too — XP, seals, streak — because it lives in the same
        store. Restoring one replaces everything, including the scoreboard.
      </p>

      <h2>Daily goal</h2>
      <p>
        Currently {game.dailyGoal} XP. That is roughly {Math.round(game.dailyGoal / 12)} graded
        cards, or one lesson and a quiz, or most of a problem answer. Pick a number you can hit
        on a bad day — a goal you miss twice stops being a goal.
      </p>
      <div className="btn-row">
        {GOALS.map(v => (
          <button key={v} disabled={v === game.dailyGoal} onClick={async () => {
            await setDailyGoal(v);
            toast(`Daily goal set to ${v} XP`, 'correct');
          }}>{v}</button>
        ))}
      </div>

      <h2>Locked lessons</h2>
      <p>
        Lessons open one at a time: read the one you are on, pass its quiz, and the next opens.
        {' '}{unlockAll
          ? 'That is currently switched off — every lesson is open.'
          : 'That is currently on.'}
      </p>
      <p className="small">
        Turn it off if you came here with a real problem and need a particular lesson today. The
        order is a teaching aid, not a claim that you are unready — and the glossary is never
        locked either way.
      </p>
      <div className="btn-row">
        <button
          className={unlockAll ? '' : 'btn-primary'}
          disabled={!unlockAll}
          onClick={async () => { await setUnlockAll(false); toast('Lessons open in order', 'correct'); }}
        >Open in order</button>
        <button
          className={unlockAll ? 'btn-primary' : ''}
          disabled={unlockAll}
          onClick={async () => { await setUnlockAll(true); toast('Every lesson unlocked', 'correct'); }}
        >Unlock everything</button>
      </div>

      <h2>Desired retention</h2>
      <p>
        Currently {retention}. Higher means more reviews for slightly better recall; lower means
        fewer reviews and more lapses. 0.90 is a reasonable default — leave it until you have a
        few thousand reviews logged.
      </p>
      <div className="btn-row">
        {[0.85, 0.90, 0.95].map(v => (
          <button key={v} disabled={v === retention} onClick={async () => {
            await sched.setRetention(v);
            setRetentionState(v);
            toast(`Retention set to ${v}`, 'correct');
          }}>{v}</button>
        ))}
      </div>

      <h2>The game layer</h2>
      <p className="small">
        XP, ranks, streaks and seals count work done. They are weighted towards the work that
        produces learning — a written problem answer is worth more than a dozen cards, and a
        prediction that lands within a mark is worth more again. Pressing <strong>Forgot</strong>
        {' '}pays XP on purpose: if an honest lapse cost you points, the scoreboard would be paying
        you to lie to the scheduler, and a corrupted FSRS curve costs far more than a number.
      </p>
      <p className="small">
        None of it appears next to the recall percentage or the calibration gap on the Progress
        page, because those are claims about what you know and this is a claim about how much you
        turned up.
      </p>

      <h2>Scheduler</h2>
      <p className="small">
        FSRS-6 via ts-fsrs, vendored locally at <code>/vendor/ts-fsrs.mjs</code>. No CDN, so the
        app works offline once loaded.
      </p>
    </div>
  );
}
