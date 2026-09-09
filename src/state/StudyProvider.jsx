import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import catalogue from '../lib/content.js';
import * as sched from '../lib/scheduler.js';
import * as game from '../lib/game.js';
import * as lessonsLib from '../lib/lessons.js';
import * as prog from '../lib/progression.js';
import { bestMap } from '../lib/quiz.js';
import { cardState } from '../lib/db.js';
import { Ctx } from './StudyContext.jsx';

let toastSeq = 0;

export function StudyProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState(game.emptyState());
  const [counts, setCounts] = useState({ total: 0, due: 0, fresh: 0, learning: 0, review: 0 });
  const [read, setRead] = useState({});
  const [best, setBest] = useState({});
  const [unlockAll, setUnlockAllState] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [seals, setSeals] = useState([]);      // achievement popups, queued
  const [burst, setBurst] = useState(0);       // bumped to fire confetti

  // The game state is read once and then owned by React. A ref keeps the write
  // path from racing the render path: two awards in the same tick (a graded card
  // that also completes a streak) must both land.
  const gameRef = useRef(gameState);
  gameRef.current = gameState;

  useEffect(() => {
    (async () => {
      try {
        await sched.init();
        await seedNewCards();
        const [g, r, c, b, ua] = await Promise.all([
          game.load(), lessonsLib.readMap(), sched.counts(),
          bestMap(), prog.unlockAllSetting(),
        ]);
        setGameState(g);
        setRead(r);
        setCounts(c);
        setBest(b);
        setUnlockAllState(ua);
        setReady(true);
      } catch (err) {
        setError(err);
      }
    })();
  }, []);

  const refreshCounts = useCallback(async () => {
    const c = await sched.counts();
    setCounts(c);
    return c;
  }, []);

  const toast = useCallback((text, tone = 'plain') => {
    const id = ++toastSeq;
    setToasts(t => [...t, { id, text, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const celebrate = useCallback(() => setBurst(n => n + 1), []);

  /** Apply a game event, persist it, and queue whatever should be celebrated. */
  const award = useCallback(async (event) => {
    const ctx = { lessonCount: catalogue.lessons.length };
    const result = game.apply(gameRef.current, event, ctx);
    gameRef.current = result.state;
    setGameState(result.state);
    await game.save(result.state);
    if (result.unlocked.length) setSeals(q => [...q, ...result.unlocked]);
    if (result.leveledUp) setLevelUp(result.leveledUp);
    return result;
  }, []);

  /** Re-read the quiz high scores. Called after a run, because a pass unlocks. */
  const refreshBest = useCallback(async () => {
    const b = await bestMap();
    setBest(b);
    return b;
  }, []);

  const setUnlockAll = useCallback(async (v) => {
    await prog.setUnlockAll(v);
    setUnlockAllState(Boolean(v));
  }, []);

  const dismissSeal = useCallback(() => setSeals(q => q.slice(1)), []);
  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  const setDailyGoal = useCallback(async (goal) => {
    const next = { ...gameRef.current, dailyGoal: goal };
    gameRef.current = next;
    setGameState(next);
    await game.save(next);
  }, []);

  const markLesson = useCallback(async (id, wasRead) => {
    const map = wasRead ? await lessonsLib.markUnread(id) : await lessonsLib.markRead(id);
    setRead(map);
    if (!wasRead) {
      const r = await award({ kind: 'lesson' });
      toast(`Lesson read · +${r.xp} XP`, 'correct');
    } else {
      await award({ kind: 'unlesson' });
    }
    return map;
  }, [award, toast]);

  const value = useMemo(() => ({
    cat: catalogue,
    ready,
    error,
    game: gameState,
    rank: game.rankFor(gameState.xp),
    goal: game.goalProgress(gameState),
    counts,
    refreshCounts,
    read,
    best,
    refreshBest,
    unlockAll,
    setUnlockAll,
    unlock: prog.unlockMap(catalogue.lessons, read, best, unlockAll),
    markLesson,
    award,
    toast,
    toasts,
    celebrate,
    burst,
    levelUp,
    dismissLevelUp,
    seal: seals[0] || null,
    dismissSeal,
    setDailyGoal,
    reload: async () => {
      const [g, r, c, b] = await Promise.all([
        game.load(), lessonsLib.readMap(), sched.counts(), bestMap(),
      ]);
      gameRef.current = g;
      setGameState(g); setRead(r); setCounts(c); setBest(b);
    },
  }), [ready, error, gameState, counts, read, best, unlockAll, toasts, burst, levelUp, seals,
       refreshCounts, refreshBest, setUnlockAll, markLesson, award, toast, celebrate,
       dismissLevelUp, dismissSeal, setDailyGoal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Any card in /content with no saved state gets a fresh FSRS state. */
async function seedNewCards() {
  const existing = new Set((await cardState.all()).map(c => c.id));
  const missing = catalogue.cards.filter(c => !existing.has(c.id));
  if (!missing.length) return;
  await cardState.putMany(missing.map(c => sched.newState(c.id, c.moduleId)));
}
