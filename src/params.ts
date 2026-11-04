import { defineParams } from '@sveltejs/kit/params';
import { TOPICS, type TopicId } from './lib/engine/topics.ts';
import { isLocale } from './lib/i18n/config.ts';

/** Route parameters: /[lang=lang]/… and /[state]/[topic=topic]/… */
export const params = defineParams({
	lang: (param) => (isLocale(param) ? param : undefined),
	topic: (param) => ((TOPICS as readonly string[]).includes(param) ? (param as TopicId) : undefined)
});
