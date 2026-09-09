// The context object and its hook, deliberately kept in a file of their own.
//
// React Fast Refresh can only treat a module as a refresh boundary when every
// export is a component. This file used to export `useStudy` alongside
// `StudyProvider`, which made it permanently un-refreshable: every edit to the
// provider fell back to a full page reload, and because the provider sits above
// the whole tree that reload took Home, Review, Progress, Settings and
// ModuleView with it. Splitting the hook out gives StudyProvider.jsx a
// component-only export list, so it refreshes in place.
//
// The .jsx extension stays even though nothing here is JSX: eighteen modules
// import `useStudy` by this exact path, and the churn is not worth it.
import { createContext, useContext } from 'react';

export const Ctx = createContext(null);

export function useStudy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudy outside StudyProvider');
  return ctx;
}
