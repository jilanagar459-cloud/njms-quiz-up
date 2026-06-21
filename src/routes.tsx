import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

// Routes are managed directly in App.tsx using nested React Router structure.
// This file is kept for RouteConfig type exports.
export const routes: RouteConfig[] = [
  { name: 'Root', path: '/', element: <Navigate to="/login" replace />, public: true },
];
