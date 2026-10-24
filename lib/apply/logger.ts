/**
 * Per-job logger: the real trail of what happened, kept with the run.
 *
 * Each entry goes three places — the job's in-memory list (persisted into
 * run.json by the runner), the dev-server terminal, and screenshots saved into
 * the run folder. When an application fails, the answer to "why" should be in
 * these files, not reconstructed from memory.
 *
 * Data passed to a log call is redacted by key name: nothing that looks like a
 * cookie, token or password is ever written, even if a caller slips one in.
 */
import fs from 'fs';
import path from 'path';
import type { Page } from 'playwright';
import { runDir } from './paths';
import type { JobLogger, LogLevel, RunLogEntry } from './types';

const SECRET_KEY = /cookie|token|authorization|password|passwd|secret|nkparam|session/i;
const MAX_MSG = 1000;

function redact(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_KEY.test(key)) {
      clean[key] = '[redacted]';
    } else if (typeof value === 'string') {
      clean[key] = value.length > MAX_MSG ? `${value.slice(0, MAX_MSG)}…` : value;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function fileSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 40) || 'x';
}

export class FileJobLogger implements JobLogger {
  private readonly list: RunLogEntry[] = [];
  private readonly shots: string[] = [];

  constructor(
    private readonly runId: string,
    private readonly jobId: string,
    /** Called after every new entry, so the runner can persist progress live. */
    private readonly onChange?: () => void,
    /** Mirror to the terminal. Off in tests. */
    private readonly echo: boolean = process.env.NODE_ENV !== 'test'
  ) {}

  private push(level: LogLevel, step: string, msg: string, data?: Record<string, unknown>): void {
    const entry: RunLogEntry = {
      t: Date.now(),
      level,
      step,
      msg: msg.length > MAX_MSG ? `${msg.slice(0, MAX_MSG)}…` : msg,
      data: redact(data),
    };
    this.list.push(entry);
    if (this.echo) {
      const detail = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      process.stdout.write(`[apply ${this.runId.slice(0, 8)} ${this.jobId}] ${level.toUpperCase()} ${step}: ${entry.msg}${detail}\n`);
    }
    this.onChange?.();
  }

  info(step: string, msg: string, data?: Record<string, unknown>): void {
    this.push('info', step, msg, data);
  }

  warn(step: string, msg: string, data?: Record<string, unknown>): void {
    this.push('warn', step, msg, data);
  }

  error(step: string, msg: string, data?: Record<string, unknown>): void {
    this.push('error', step, msg, data);
  }

  async screenshot(page: Page, label: string): Promise<string | null> {
    try {
      const dir = runDir(this.runId);
      fs.mkdirSync(dir, { recursive: true });
      const name = `${fileSafe(this.jobId)}-${this.shots.length + 1}-${fileSafe(label)}.png`;
      await page.screenshot({ path: path.join(dir, name), fullPage: false, timeout: 10_000 });
      this.shots.push(name);
      return name;
    } catch (error) {
      this.warn('screenshot', `Could not save screenshot "${label}"`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  entries(): RunLogEntry[] {
    return [...this.list];
  }

  screenshots(): string[] {
    return [...this.shots];
  }
}
