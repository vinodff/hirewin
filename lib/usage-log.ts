import { createServiceClient } from '@/lib/supabase/server';
import { costUsd, MODEL_NAME } from '@/lib/anthropic';

type LogInput = {
  userId: string | null;
  versionId?: string | null;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  model?: string;
};

export async function logUsage(input: LogInput): Promise<void> {
  if (input.inputTokens === 0 && input.outputTokens === 0) return;
  try {
    const sb = await createServiceClient();
    const model = input.model ?? MODEL_NAME;
    await sb.from('usage_events').insert({
      user_id: input.userId,
      version_id: input.versionId ?? null,
      endpoint: input.endpoint,
      model,
      // Cached tokens roll into input_tokens for reporting; cost_usd prices them correctly.
      input_tokens: input.inputTokens + (input.cacheCreationTokens ?? 0) + (input.cacheReadTokens ?? 0),
      output_tokens: input.outputTokens,
      cost_usd: costUsd(input.inputTokens, input.outputTokens, {
        cacheCreationTokens: input.cacheCreationTokens,
        cacheReadTokens: input.cacheReadTokens,
        model,
      }),
    });
  } catch (e) {
    console.error('[usage-log] failed to write', e);
    // never block the main flow on usage logging
  }
}
