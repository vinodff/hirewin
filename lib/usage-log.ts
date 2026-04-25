import { createServiceClient } from '@/lib/supabase/server';
import { costUsd, MODEL_NAME } from '@/lib/anthropic';

type LogInput = {
  userId: string | null;
  versionId?: string | null;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  model?: string;
};

export async function logUsage(input: LogInput): Promise<void> {
  if (input.inputTokens === 0 && input.outputTokens === 0) return;
  try {
    const sb = await createServiceClient();
    await sb.from('usage_events').insert({
      user_id: input.userId,
      version_id: input.versionId ?? null,
      endpoint: input.endpoint,
      model: input.model ?? MODEL_NAME,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      cost_usd: costUsd(input.inputTokens, input.outputTokens),
    });
  } catch (e) {
    console.error('[usage-log] failed to write', e);
    // never block the main flow on usage logging
  }
}
