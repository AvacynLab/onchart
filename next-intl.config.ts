// Re-export the central next-intl configuration used across the app so that
// tooling, the middleware and the build-time plugin all reference the same
// object defined under `i18n/config.ts`.
export { default } from './i18n/config';
