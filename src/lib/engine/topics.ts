/** The situations Tenantkit covers. Kept separate so browser code doesn't load the schema. */
export const TOPICS = ['eviction', 'repairs', 'deposit'] as const;
export type TopicId = (typeof TOPICS)[number];
