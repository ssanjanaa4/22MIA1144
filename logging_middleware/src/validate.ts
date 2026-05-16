import { ALLOWED_STACKS, ALLOWED_LEVELS, BACKEND_PACKAGES, FRONTEND_PACKAGES, SHARED_PACKAGES } from './constants';
import type { Stack, Level, LogPackage } from './types';

// Ensure input strings are lowercase and valid according to allowed lists.
export function validateStack(value: string): Stack {
  const v = value.toLowerCase();
  if ((ALLOWED_STACKS as readonly string[]).includes(v)) return v as Stack;
  throw new Error(`Invalid stack value: ${value}`);
}

export function validateLevel(value: string): Level {
  const v = value.toLowerCase();
  if ((ALLOWED_LEVELS as readonly string[]).includes(v)) return v as Level;
  throw new Error(`Invalid level value: ${value}`);
}

export function validatePackage(value: string): LogPackage {
  const v = value.toLowerCase();
  const all = [...BACKEND_PACKAGES, ...FRONTEND_PACKAGES, ...SHARED_PACKAGES] as readonly string[];
  if (all.includes(v)) return v as LogPackage;
  throw new Error(`Invalid package value: ${value}`);
}

export function validateMessage(msg: string): string {
  const trimmed = String(msg || '').trim();
  if (!trimmed) throw new Error('Message must be a non-empty string');
  return trimmed;
}
