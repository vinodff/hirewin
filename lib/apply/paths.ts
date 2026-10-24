/**
 * Where the local auto-apply engine keeps its state on the owner's PC.
 *
 * Not os.tmpdir(): Windows and cleanup tools clear it, and the Naukri login
 * lives in the browser profile here. Everything is under one folder so it can
 * be inspected or wiped by hand. Override with HIREWIN_DATA_DIR.
 */
import os from 'os';
import path from 'path';

export function dataDir(): string {
  return process.env.HIREWIN_DATA_DIR || path.join(os.homedir(), '.hirewin');
}

/** Persistent Chrome profile holding the Naukri login. One per PC. */
export function browserProfileDir(): string {
  return path.join(dataDir(), 'browser-profile');
}

/** Cache of answers already given, so the same question gets the same answer. */
export function answerCachePath(): string {
  return path.join(dataDir(), 'answers.json');
}

/** One folder per run: run.json plus screenshots. */
export function runsDir(): string {
  return path.join(dataDir(), 'runs');
}

export function runDir(runId: string): string {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(runId)) throw new Error('invalid run id');
  return path.join(runsDir(), runId);
}
