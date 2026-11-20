/**
 * Display prices and checkout links. Prices here are labels only; the real
 * amounts live in your Lemon Squeezy products. Set checkout URLs in .env.
 */
export type Tier = {
  id: 'monthly' | 'yearly' | 'lifetime';
  name: string;
  price: string;
  cadence: string;
  checkoutUrl: string | undefined;
};

const env = import.meta.env;

export const TIERS: Tier[] = [
  { id: 'monthly', name: 'Pro monthly', price: '$9', cadence: 'per month', checkoutUrl: env.VITE_CHECKOUT_URL_MONTHLY || undefined },
  { id: 'yearly', name: 'Pro yearly', price: '$79', cadence: 'per year', checkoutUrl: env.VITE_CHECKOUT_URL_YEARLY || undefined },
  { id: 'lifetime', name: 'Pro lifetime', price: '$149', cadence: 'one-off', checkoutUrl: env.VITE_CHECKOUT_URL_LIFETIME || undefined },
];

export const SUPPORT_EMAIL: string = env.VITE_SUPPORT_EMAIL ?? '';
