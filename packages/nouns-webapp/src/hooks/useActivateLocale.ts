/**
 * useActiveLocale.ts is a modified version of https://github.com/Uniswap/interface/blob/main/src/hooks/useActiveLocale.ts
 */
import { DEFAULT_LOCALE, SupportedLocale } from '../i18n/locales';

// Alps is English-only: the Japanese catalog (inherited from Nouns) only covers part of the app and there's
// no language switcher, so the browser's language is ignored. To bring languages back, restore locale
// detection here (see git history: stored choice, then navigator.language) and the NavLocaleSwitcher.
export const initialLocale: SupportedLocale = DEFAULT_LOCALE;

export function useActiveLocale(): SupportedLocale {
  return DEFAULT_LOCALE;
}
