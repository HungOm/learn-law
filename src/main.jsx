import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import { StudyProvider } from './state/StudyProvider.jsx';
// Order matters: tokens define the roles (and pull in the palette), the design
// system's two files consume them, and the lesson-surface files come last.
import './styles/tokens.css';
import './styles/base.css';
import './styles/game.css';
// The liquid field and the phone navigation bar both consume the design
// system's tokens and both need to win over game.css, so they sit here rather
// than being imported from the components that render them: App.jsx is
// imported above this block, so a component-level import would inject its CSS
// BEFORE tokens/base/game and lose the cascade.
import './styles/liquid.css';
import './styles/rail.css';
import './styles/learn.css';
import './styles/plates.css';
import './styles/interactive.css';

// HashRouter, not BrowserRouter: GitHub Pages serves static files and has no
// rewrite rule, so a reload on /lessons would 404. It also keeps every URL the
// old build published (`#/lesson/l-precedent`) working unchanged.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* framer-motion does NOT honour prefers-reduced-motion on its own, and the
        CSS rule in base.css cannot reach it: that rule kills CSS animations and
        transitions, while framer-motion animates by writing inline styles every
        frame. Measured before this landed — with the preference set to reduce,
        a list row still travelled y:10 to 0 through 21 distinct states, exactly
        as it did with no preference.

        "user" disables transform and layout animations, which are the ones that
        cause trouble, and keeps opacity and colour, which do not. */}
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <StudyProvider>
          <App />
        </StudyProvider>
      </HashRouter>
    </MotionConfig>
  </StrictMode>
);

// Offline support. Registered after load so the service worker never competes
// with the first paint for bandwidth — on a prepaid connection that trade is
// the wrong way round. Production only: there is no sw.js on the dev server.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // A reader with no service worker still has a working site. Never let a
        // registration failure surface as an error to someone studying.
      });
  });
}
