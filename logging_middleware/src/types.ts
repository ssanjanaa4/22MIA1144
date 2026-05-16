// Type definitions for the logging middleware
export type Stack = typeof import('./constants').ALLOWED_STACKS[number];
export type Level = typeof import('./constants').ALLOWED_LEVELS[number];

export type BackendPackage = typeof import('./constants').BACKEND_PACKAGES[number];
export type FrontendPackage = typeof import('./constants').FRONTEND_PACKAGES[number];
export type SharedPackage = typeof import('./constants').SHARED_PACKAGES[number];

export type LogPackage = BackendPackage | FrontendPackage | SharedPackage;

export type LogPayload = {
  stack: Stack;
  level: Level;
  package: LogPackage;
  message: string;
};
