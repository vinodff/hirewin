/** Bounds shared by request validation and the runner. */

/** Jobs per run. Naukri's own daily quota is the real ceiling; this keeps one run reviewable. */
export const MAX_TARGETS = 25;

/** Tabs at once. More than this is the burst pattern that trips Naukri's reCAPTCHA. */
export const MAX_CONCURRENCY = 5;
