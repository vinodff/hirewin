/**
 * Answer engine for the local auto-apply runner.
 *
 * `createAnswerEngine` is the entry point the runner and adapters use; the
 * rest is exported for tests and for adapters that need the same option
 * matching when they set a control.
 */
export { createAnswerEngine, type AnswerEngineOptions } from './engine';
export { answerWithAi, buildFormPrompt, validateAiAnswer, MIN_AI_CONFIDENCE, type AiCall } from './ai';
export { AnswerCache, cacheKey, profileFingerprint, CACHE_MIN_CONFIDENCE } from './cache';
export { applyGuard, classifyQuestion, type GuardKind } from './guards';
export { answerFromProfile } from './profile-rules';
export {
  containsWord,
  findDeclineOption,
  isChoiceQuestion,
  matchOption,
  matchOptions,
  matchOptionStrict,
  matchQuantityOption,
  normalizeText,
  parseRange,
  polarityOf,
  type Quantity,
  type QuantityUnit,
} from './option-match';
