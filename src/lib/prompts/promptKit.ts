import type { IPromptMessage, IPromptVariable, PromptItem } from '@/services/prompts';

/**
 * Shared prompt helpers used by the library, the editor and the playground,
 * so variable detection, preview rendering and labels behave the same
 * everywhere. Categories mirror the backend's PROMPT_CATEGORIES.
 */

export const PROMPT_CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'development', label: 'Development' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'database', label: 'Database' },
  { id: 'ui-ux', label: 'UI / UX' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'testing', label: 'Testing' },
  { id: 'devops', label: 'DevOps' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'ai', label: 'AI' },
  { id: 'security', label: 'Security' },
  { id: 'performance', label: 'Performance' },
  { id: 'custom', label: 'Custom' }
] as const;

export const categoryLabel = (id: string): string =>
  PROMPT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const VISIBILITY_OPTIONS: Array<{ id: PromptItem['visibility']; label: string; hint: string }> = [
  { id: 'private', label: 'Private', hint: 'Only you, admins and people you share it with' },
  { id: 'project', label: 'Project', hint: 'Everyone who can open the linked project' },
  { id: 'organization', label: 'Workspace', hint: 'Everyone in this workspace with prompt access' }
];

const VARIABLE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Variable names used in the template, in order of first appearance. */
export const extractVariables = (body: string, messages: IPromptMessage[] = []): string[] => {
  const text = messages.length > 0 ? messages.map((m) => m.content).join('\n') : body;
  return [...new Set([...text.matchAll(VARIABLE)].map((m) => m[1]))];
};

/**
 * Keeps the variable schema in step with the template: definitions for
 * names still used are kept (with their type/default), new names get a
 * plain required string definition, removed names are dropped.
 */
export const syncVariables = (current: IPromptVariable[], names: string[]): IPromptVariable[] => {
  const byName = new Map(current.map((v) => [v.name, v]));
  return names.map(
    (name) => byName.get(name) ?? { name, type: 'string', description: '', defaultValue: '', required: true }
  );
};

/** Template with values filled in (unfilled variables stay as {{name}}). */
export const resolveTemplate = (text: string, values: Record<string, unknown>): string =>
  text.replace(VARIABLE, (whole, name: string) => {
    const value = values[name];
    return value === undefined || value === '' ? whole : String(value);
  });

/** Starting values for a run: each variable's default. */
export const defaultValues = (variables: IPromptVariable[]): Record<string, string> =>
  Object.fromEntries(variables.map((v) => [v.name, v.defaultValue ?? '']));
