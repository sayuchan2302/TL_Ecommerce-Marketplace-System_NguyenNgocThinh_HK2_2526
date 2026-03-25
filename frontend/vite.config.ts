import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const chunkGroups = [
  {
    name: 'admin-panel',
    includes: [
      '/src/pages/Admin/',
      '/src/config/panelNavigation.ts',
    ],
  },
  {
    name: 'seller-panel',
    includes: [
      '/src/pages/Vendor/',
    ],
  },
  {
    name: 'account-area',
    includes: [
      '/src/pages/Profile/',
      '/src/pages/Account/',
      '/src/pages/Auth/',
    ],
  },
  {
    name: 'checkout-flow',
    includes: [
      '/src/pages/Checkout/',
      '/src/pages/Cart/',
      '/src/pages/OrderDetail/',
      '/src/pages/OrderSuccess/',
      '/src/pages/OrderTracking/',
      '/src/pages/PaymentResult/',
    ],
  },
];

const resolveAppChunk = (id: string) => {
  for (const group of chunkGroups) {
    if (group.includes.some((segment) => id.includes(segment))) {
      return group.name;
    }
  }

  return undefined;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['framer-motion', 'react/jsx-runtime']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('/react-dom/') ||
              id.includes('\\react-dom\\') ||
              id.includes('/react-router-dom/') ||
              id.includes('\\react-router-dom\\')
            ) {
              return 'vendor-react';
            }

            if (
              id.includes('/lucide-react/') ||
              id.includes('\\lucide-react\\') ||
              id.includes('/framer-motion/') ||
              id.includes('\\framer-motion\\')
            ) {
              return 'vendor-ui';
            }

            return undefined;
          }

          return resolveAppChunk(id);
        },
      }
    }
  }
})
