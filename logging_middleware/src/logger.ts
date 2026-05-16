import { validateStack, validateLevel, validatePackage, validateMessage } from './validate';
import { getToken } from './auth';
import { sendLog } from './client';
import type { LogPayload } from './types';

/**
 * Main Log implementation.
 * Validates inputs, obtains auth token, sends payload, and returns response.
 */
export async function Log(stack: string, level: string, packageName: string, message: string) {
  // Validate and normalize inputs
  const s = validateStack(stack);
  const l = validateLevel(level);
  const p = validatePackage(packageName);
  const m = validateMessage(message);

  const payload: LogPayload = {
    stack: s,
    level: l,
    package: p,
    message: m,
  };

  try {
    // Get bearer token (cached by auth module)
    const token = await getToken();

    // Send log to API and return result
    const result = await sendLog(token, payload);
    return result;
  } catch (err: any) {
    // Wrap and rethrow with clear message
    const msg = err?.message ?? 'Unknown error sending log';
    throw new Error(`Log failed: ${msg}`);
  }
}

export default { Log };
