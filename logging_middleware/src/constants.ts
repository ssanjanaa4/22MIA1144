// Allowed values for validation
export const ALLOWED_STACKS = ['backend', 'frontend'] as const;
export const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

export const BACKEND_PACKAGES = [
  'cache',
  'controller',
  'cron_job',
  'db',
  'domain',
  'handler',
  'repository',
  'route',
  'service',
] as const;

export const FRONTEND_PACKAGES = ['api', 'component', 'hook', 'page', 'state', 'style'] as const;

export const SHARED_PACKAGES = ['auth', 'config', 'middleware', 'utils'] as const;
