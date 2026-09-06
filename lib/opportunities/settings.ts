/**
 * Admin-editable agent settings.
 *
 * The schedule lives here rather than in vercel.json because that file is
 * static, deployed, and unreachable from an admin UI — and because Vercel's
 * Hobby plan lets one cron entry fire only once a day, so "run four times"
 * cannot be written there at all.
 *
 * The arrangement instead:
 *   * vercel.json registers 24 entries, one per hour. That is *permission* to
 *     run at any hour, granted once at deploy time.
 *   * `run_hours_ist` decides which of those hours does work. Every other
 *     invocation reads this row, finds itself not scheduled, and returns.
 *
 * So an admin changes the schedule by editing a row, and it takes effect on the
 * next hour with no deploy. The cost is 24 near-instant invocations a day
 * instead of 2, which is a rounding error against one real run.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AgentSettings {
  /** IST hours at which a scheduled run should do work. */
  runHoursIst: number[];
  sweepLimit: number;
  maxPublishPerRun: number;
  autoPublish: boolean;
  paused: boolean;
  updatedAt: string | null;
}

/**
 * Used when the settings row cannot be read.
 *
 * Matches the migration's defaults exactly. A database hiccup must not silently
 * change the schedule — and in particular must not default `paused` to true and
 * quietly stop the agent for days before anyone notices an empty board.
 */
export const DEFAULT_SETTINGS: AgentSettings = {
  runHoursIst: [6, 18],
  sweepLimit: 40,
  maxPublishPerRun: 200,
  autoPublish: true,
  paused: false,
  updatedAt: null,
};

function toSettings(row: Record<string, unknown>): AgentSettings {
  const hours = Array.isArray(row.run_hours_ist)
    ? row.run_hours_ist
        .map((h) => Number(h))
        .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23)
    : [];

  return {
    // An empty array after filtering would mean "never run" — which is what
    // `paused` is for, and is never what a malformed row should be read as.
    runHoursIst: hours.length > 0 ? [...new Set(hours)].sort((a, b) => a - b) : DEFAULT_SETTINGS.runHoursIst,
    sweepLimit: typeof row.sweep_limit === 'number' ? row.sweep_limit : DEFAULT_SETTINGS.sweepLimit,
    maxPublishPerRun:
      typeof row.max_publish_per_run === 'number' ? row.max_publish_per_run : DEFAULT_SETTINGS.maxPublishPerRun,
    autoPublish: row.auto_publish !== false,
    paused: row.paused === true,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function readSettings(supabase: SupabaseClient): Promise<AgentSettings> {
  const { data, error } = await supabase.from('opportunity_settings').select('*').maybeSingle();

  if (error || !data) {
    if (error) console.error('[opportunity-settings] falling back to defaults:', error.message);
    return DEFAULT_SETTINGS;
  }
  return toSettings(data as Record<string, unknown>);
}

export interface SettingsPatch {
  runHoursIst?: number[];
  sweepLimit?: number;
  maxPublishPerRun?: number;
  autoPublish?: boolean;
  paused?: boolean;
}

/**
 * Validate an admin's edit before it reaches the database.
 *
 * The CHECK constraints in 014 are the floor and will refuse genuinely invalid
 * data whatever happens here. This exists so the admin gets a sentence
 * explaining what was wrong instead of a Postgres constraint name.
 */
export function validatePatch(patch: SettingsPatch): string | null {
  if (patch.runHoursIst !== undefined) {
    const hours = patch.runHoursIst;
    if (!Array.isArray(hours) || hours.length === 0) {
      return 'Pick at least one hour. To stop the agent entirely, use Pause.';
    }
    if (hours.length > 24) return 'There are only 24 hours in a day.';
    if (hours.some((h) => !Number.isInteger(h) || h < 0 || h > 23)) {
      return 'Hours must be whole numbers between 0 and 23.';
    }
  }
  if (patch.sweepLimit !== undefined && (patch.sweepLimit < 0 || patch.sweepLimit > 200)) {
    return 'Links re-checked per run must be between 0 and 200.';
  }
  if (
    patch.maxPublishPerRun !== undefined &&
    (patch.maxPublishPerRun < 0 || patch.maxPublishPerRun > 1000)
  ) {
    return 'Publish cap must be between 0 and 1000.';
  }
  return null;
}

export async function writeSettings(
  supabase: SupabaseClient,
  patch: SettingsPatch,
  adminId: string | null
): Promise<AgentSettings> {
  const row: Record<string, unknown> = { updated_by: adminId };

  if (patch.runHoursIst !== undefined) {
    row.run_hours_ist = [...new Set(patch.runHoursIst)].sort((a, b) => a - b);
  }
  if (patch.sweepLimit !== undefined) row.sweep_limit = patch.sweepLimit;
  if (patch.maxPublishPerRun !== undefined) row.max_publish_per_run = patch.maxPublishPerRun;
  if (patch.autoPublish !== undefined) row.auto_publish = patch.autoPublish;
  if (patch.paused !== undefined) row.paused = patch.paused;

  const { data, error } = await supabase
    .from('opportunity_settings')
    .update(row)
    .eq('id', true)
    .select('*')
    .single();

  if (error) throw new Error(`Could not save settings: ${error.message}`);
  return toSettings(data as Record<string, unknown>);
}

/** The hour, 0–23, on the IST wall clock. */
export function istHour(at: Date = new Date()): number {
  return new Date(at.getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
}

export interface DueVerdict {
  due: boolean;
  /** Why not, for the cron response — a silent no-op is impossible to debug. */
  reason: string;
}

/**
 * Should a scheduled invocation at this moment do work?
 *
 * Hobby fires a cron anywhere inside its scheduled hour, so this compares
 * HOURS, never minutes. An entry registered at `0 6 * * *` that actually lands
 * at 06:47 is still the 6 o'clock run.
 */
export function isDue(settings: AgentSettings, at: Date = new Date()): DueVerdict {
  if (settings.paused) {
    return { due: false, reason: 'agent is paused' };
  }
  const hour = istHour(at);
  if (!settings.runHoursIst.includes(hour)) {
    return {
      due: false,
      reason: `not a scheduled hour (IST ${hour}:00; scheduled ${settings.runHoursIst.join(', ')})`,
    };
  }
  return { due: true, reason: `scheduled for IST ${hour}:00` };
}
