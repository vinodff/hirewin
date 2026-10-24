/**
 * Naukri applier: the one entry point the runner needs, plus the login check
 * it should call once before opening job tabs.
 */
export { applyOnNaukri, type NaukriApplierOptions } from './applier';
export { checkNaukriLogin, type LoginCheck, type LoginCheckOptions } from './login';
export {
  classifyJobPage,
  parseApplyResponse,
  type ApplyResponseKind,
  type NaukriPageState,
  type ParsedApplyResponse,
} from './signals';
