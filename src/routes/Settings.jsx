import { useEffect, useRef, useState } from 'react';
import { useStudy } from '../state/StudyContext.jsx';
import * as sched from '../lib/scheduler.js';
import { exportAll, importAll, reviewLog } from '../lib/db.js';
import { plural } from '../lib/format.js';

const GOALS = [80, 150, 300, 600];

export default function Settings() {
  const { toast, game, setDailyGoal, reload } = useStudy();
  const [logs, setLogs] = useState(0);
  const [retention, setRetentionState] = useState(sched.retention());
  const fileRef = useRef(null);

  useEffect(() => { reviewLog.count().then(setLogs); }, []);

  return (
    <div className="wrap">
      <h2>Settings</h2>

      <div className="notice">
        <strong>Everything is stored in this browser only.</strong> There is no server and no
        sync. Clearing site data deletes {plural(logs, 'review')}, every problem attempt, and
        every point of XP, with no way back. Export a backup regularly.
      </div>

      <h3>Backup</h3>
      <div className="btn-row">
        <button className="btn-primary" onClick={async () => {
          const data = await exportAll();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `lawstudy-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
          toast('Backup downloaded', 'sage');
        }}>Export backup</button>
        <button onClick={() => fileRef.current.click()}>Import backup</button>
        <input type="file" ref={fileRef} accept="application/json" hidden onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            await importAll(JSON.parse(await file.text()));
            await reload();
            toast('Backup restored', 'sage');
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

      <h3>Daily goal</h3>
      <p>
        Currently {game.dailyGoal} XP. That is roughly {Math.round(game.dailyGoal / 12)} graded
        cards, or one lesson and a quiz, or most of a problem answer. Pick a number you can hit
        on a bad day — a goal you miss twice stops being a goal.
      </p>
      <div className="btn-row">
        {GOALS.map(v => (
          <button key={v} disabled={v === game.dailyGoal} onClick={async () => {
            await setDailyGoal(v);
            toast(`Daily goal set to ${v} XP`, 'sage');
          }}>{v}</button>
        ))}
      </div>

      <h3>Desired retention</h3>
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
            toast(`Retention set to ${v}`, 'sage');
          }}>{v}</button>
        ))}
      </div>

      <h3>The game layer</h3>
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

      <h3>Scheduler</h3>
      <p className="small">
        FSRS-6 via ts-fsrs, vendored locally at <code>/vendor/ts-fsrs.mjs</code>. No CDN, so the
        app works offline once loaded.
      </p>
    </div>
  );
}
