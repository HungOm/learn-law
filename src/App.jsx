import { AnimatePresence, motion } from 'framer-motion';
import { Routes, Route, useLocation } from 'react-router-dom';
import Rail from './components/Rail.jsx';
import Overlays from './components/Overlays.jsx';
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
import Progress from './routes/Progress.jsx';
import Seals from './routes/Seals.jsx';
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

export default function App() {
  const { ready, error } = useStudy();
  const location = useLocation();

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
    <div className="shell">
      <Rail />
      <main className="main">
        {!ready
          ? <div className="wrap"><p className="lede">Opening the file…</p></div>
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
                <Route path="/progress"        element={<Page><Progress /></Page>} />
                <Route path="/seals"           element={<Page><Seals /></Page>} />
                <Route path="/settings"        element={<Page><Settings /></Page>} />
                <Route path="*"                element={<Page><NotFound /></Page>} />
              </Routes>
            </AnimatePresence>
          )}
      </main>
      <Overlays />
    </div>
  );
}
