import { createContext } from 'react';
import type { ReactNode } from 'react';

export interface AdminShellState {
  title: ReactNode;
  actions?: ReactNode;
  hideTopbarTitle?: boolean;
  hideHeaderSearch?: boolean;
  breadcrumbs?: string[];
}

export const AdminShellContext = createContext<((state: AdminShellState) => void) | null>(null);
