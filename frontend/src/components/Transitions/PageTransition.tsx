import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  transitionKey?: string;
}

const transitionConfig = {
  duration: 0.22,
  ease: 'easeOut' as const,
};

export const PageTransition = ({ children, transitionKey }: PageTransitionProps) => {
  const { pathname } = useLocation();
  const key = transitionKey || pathname;

  return (
    <motion.div
      key={key}
      className="page-transition"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={transitionConfig}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
