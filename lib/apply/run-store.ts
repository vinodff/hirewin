/**
 * Runs persisted to disk, one folder each: run.json plus screenshots.
 *
 * On disk rather than in memory because Next dev reloads modules on every
 * edit, and a run in progress would vanish from the UI mid-way. It also means
 * a failed run can be diagnosed afterwards from the real log and screenshots,
 * which is the whole point of keeping them.
 *
 * Writes are atomic (temp file + rename) so a poll never reads half a file.
 */
import fs from 'fs';
import path from 'path';
import { runDir, runsDir } from './paths';
import type { JobApplyResult, RunLogEntry } from './types';

export type JobPhase = 'queued' | 'running' | 'done';

export interface RunJob {
  jobId: string;
  title: string;
  company: string;
  jobUrl: string;
  phase: JobPhase;
  result: JobApplyResult | null;
  logs: RunLogEntry[];
}

export interface RunRecord {
  runId: string;
  createdAt: number;
  finishedAt: number | null;
  /** False = preview: everything is filled, nothing is submitted. */
  submit: boolean;
  concurrency: number;
  /** Set when the whole run could not start (e.g. not logged in). */
  fatal: string | null;
  jobs: RunJob[];
}

function runFile(runId: string): string {
  return path.join(runDir(runId), 'run.json');
}

export function writeRun(run: RunRecord): void {
  const dir = runDir(run.runId);
  fs.mkdirSync(dir, { recursive: true });
  const target = runFile(run.runId);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(run, null, 2), 'utf8');
  fs.renameSync(temp, target);
}

export function readRun(runId: string): RunRecord | null {
  try {
    return JSON.parse(fs.readFileSync(runFile(runId), 'utf8')) as RunRecord;
  } catch {
    return null;
  }
}

/** Newest first. Unreadable folders are skipped, not fatal. */
export function listRuns(limit = 20): RunRecord[] {
  let names: string[];
  try {
    names = fs.readdirSync(runsDir());
  } catch {
    return [];
  }
  return names
    .map((name) => {
      try {
        return readRun(name);
      } catch {
        return null;
      }
    })
    .filter((r): r is RunRecord => r !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/** Absolute path of a screenshot inside a run, or null if the name is not a plain file name. */
export function screenshotPath(runId: string, fileName: string): string | null {
  if (!/^[a-zA-Z0-9_.-]+\.png$/.test(fileName)) return null;
  return path.join(runDir(runId), fileName);
}
