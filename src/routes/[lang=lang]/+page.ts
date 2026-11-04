import { LOCALE_CODES } from '#lib/i18n/config.ts';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => LOCALE_CODES.map((lang) => ({ lang }));
