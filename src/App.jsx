import { AnimatePresence, motion } from 'framer-motion';
import { Routes, Route, useLocation } from 'react-router-dom';
import Rail from './components/Rail.jsx';
import { SkipToContent, useDocumentTitle } from './components/Bits.jsx';
import Overlays from './components/Overlays.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import LiquidField from './components/Liquid.jsx';
import { useStudy } from './state/StudyContext.jsx';

import Home from './routes/Home.jsx';
import ModuleView from './routes/ModuleView.jsx';
import Review from './routes/Review.jsx';
import LessonIndex from './routes/LessonIndex.jsx';
import LessonView from './routes/LessonView.jsx';
import QuizIndex from './routes/QuizIndex.jsx';
import QuizRun from './routes/QuizRun.jsx';
import Arena from './routes/Arena.jsx';
import Problems from './routes/Problems.jsx';
import ProblemView from './routes/ProblemView.jsx';
import Books from './routes/Books.jsx';
import Cases from './routes/Cases.jsx';
import CaseView from './routes/CaseView.jsx';
import Progress from './routes/Progress.jsx';
import Seals from './routes/Seals.jsx';
import Glossary from './routes/Glossary.jsx';
import Settings from './routes/Settings.jsx';
import NotFound from './routes/NotFound.jsx';

const page = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

function Page({ children }) {
  return <motion.div {...page}>{children}</motion.div>;
}

/**
 * Which module the liquid field should take its colour from.
 *
 * The field says which part of the curriculum you are standing in (DESIGN.md
 * 2.12), so it has to be told. A module page names its module in the URL; a
 * lesson page names a lesson, and the lesson knows its module. Everywhere else
 * — home, review, the glossary — the reader is not in a module at all, and the
 * honest answer is null, which the field renders as the spread across all
 * sixteen rather than by picking one arbitrarily.
 */
function focusModule(pathname, cat) {
  const mod = pathname.match(/^\/module\/([^/]+)/);
  if (mod) return decodeURIComponent(mod[1]);
  const les = pathname.match(/^\/lesson\/([^/]+)/);
  if (les) {
    const id = decodeURIComponent(les[1]);
    const lesson = cat.lessons.find(l => l.id === id);
    return lesson ? lesson.moduleId : null;
  }
  return null;
}

export default function App() {
  const { ready, error, cat } = useStudy();
  const location = useLocation();
  useDocumentTitle();

  if (error) {
    return (
      <div className="wrap" style={{ padding: '3rem' }}>
        <div className="notice">
          <strong>Could not start.</strong><br />{error.message}
          <br /><br />
          Storage may be blocked — a private window with site data disabled will do this.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* A sibling of the shell, not a child. It is fixed and full-viewport,
          and the shell stops at --shell-max — so on a wide screen the field is
          the thing that fills the space either side of the app, which is what
          it is for. It paints below the shell and can never reach the text:
          .shell carries isolation: isolate, and every reading column sits on
          an opaque .sheet. See DESIGN.md 2.12. */}
      <LiquidField modules={cat.modules.map(m => m.id)} focus={focusModule(location.pathname, cat)} />

      <div className="shell">
      <SkipToContent />
      <Rail />
      {/* tabIndex -1 so the skip button can move focus here; a <main> is not
          focusable otherwise and the skip would silently do nothing. */}
      <main className="main" id="main" tabIndex={-1}>
        {!ready
          ? (
            /* A state branch that renders its own screen needs its own h1 — the
               same hole the review screen had. The smoke gate cannot catch this
               one: it is gone by the time the page settles, so it is a rule to
               hold by hand. role=status announces it to a screen reader, which
               would otherwise sit in silence while IndexedDB opens. */
            <div className="wrap" role="status">
              <h1>Opening the file</h1>
              <p className="lede">One moment — reading your progress from this device.</p>
            </div>
          )
          : (
            <AnimatePresence mode="wait" initial={false}>
              <Routes location={location} key={location.pathname}>
                <Route path="/"                 element={<Page><Home /></Page>} />
                <Route path="/module/:id"       element={<Page><ModuleView /></Page>} />
                <Route path="/review"          element={<Page><Review /></Page>} />
                <Route path="/lessons"         element={<Page><LessonIndex /></Page>} />
                <Route path="/lesson/:id"      element={<Page><LessonView /></Page>} />
                <Route path="/quiz"            element={<Page><QuizIndex /></Page>} />
                <Route path="/quiz/:id"        element={<Page><QuizRun /></Page>} />
                <Route path="/arena"           element={<Page><Arena /></Page>} />
                <Route path="/problems"        element={<Page><Problems /></Page>} />
                <Route path="/problem/:id"     element={<Page><ProblemView /></Page>} />
                <Route path="/books"           element={<Page><Books /></Page>} />
                <Route path="/cases"           element={<Page><Cases /></Page>} />
                <Route path="/case/:id"        element={<Page><CaseView /></Page>} />
                <Route path="/progress"        element={<Page><Progress /></Page>} />
                <Route path="/seals"           element={<Page><Seals /></Page>} />
                <Route path="/glossary"        element={<Page><Glossary /></Page>} />
                <Route path="/settings"        element={<Page><Settings /></Page>} />
                <Route path="*"                element={<Page><NotFound /></Page>} />
              </Routes>
            </AnimatePresence>
          )}
      </main>
      <Overlays />
      <CommandPalette />
      </div>
    </>
  );
}
