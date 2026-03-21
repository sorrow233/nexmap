import { lazyWithRetry } from '../utils/lazyWithRetry';
import { Tokushoho, Privacy, Terms } from '../pages/legal/LegalPages';

export const GalleryPage = lazyWithRetry(() => import('../pages/GalleryPage'));
export const BoardPage = lazyWithRetry(() => import('../pages/BoardPage'));
export const LandingPage = lazyWithRetry(() => import('../modules/landing'));
export const FreeTrialPage = lazyWithRetry(() => import('../pages/FreeTrialPage'));
export const FeedbackPage = lazyWithRetry(() => import('../pages/FeedbackPage'));
export const PricingPage = lazyWithRetry(() => import('../pages/PricingPage'));
export const AboutPage = lazyWithRetry(() => import('../pages/AboutPage'));
export const HistoryPage = lazyWithRetry(() => import('../pages/HistoryPage'));
export const AdminPage = lazyWithRetry(() => import('../pages/AdminPage'));
export const NotFound = lazyWithRetry(() => import('../pages/NotFound'));
export const SearchModal = lazyWithRetry(() => import('../components/SearchModal'));

export const LegalPages = {
    Tokushoho,
    Privacy,
    Terms
};
