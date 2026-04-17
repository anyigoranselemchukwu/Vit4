// src/navConfig.js
// Navigation configuration for all pages

export const NAV_ITEMS = [
  {
    label: 'Predict',
    items: [
      { id: 'dashboard', icon: '▤', label: 'Dashboard' },
      { id: 'picks', icon: '★', label: 'Market Picks' },
      { id: 'accumulator', icon: '⊕', label: 'Accumulators' },
    ],
  },
  {
    label: 'Market',
    items: [
      { id: 'odds', icon: '◈', label: 'Odds & Arbitrage' },
      { id: 'analytics', icon: '↗', label: 'Analytics' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'training', icon: '◎', label: 'Training' },
      { id: 'dataset', icon: '📂', label: 'Dataset' },
      { id: 'admin', icon: '⚙', label: 'Admin' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'subscription', icon: '💎', label: 'Plans' },
    ],
  },
]