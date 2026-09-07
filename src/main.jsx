import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { StudyProvider } from './state/StudyContext.jsx';
import './styles/base.css';
import './styles/game.css';

// HashRouter, not BrowserRouter: GitHub Pages serves static files and has no
// rewrite rule, so a reload on /lessons would 404. It also keeps every URL the
// old build published (`#/lesson/l-precedent`) working unchanged.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <StudyProvider>
        <App />
      </StudyProvider>
    </HashRouter>
  </StrictMode>
);
