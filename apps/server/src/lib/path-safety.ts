import path from 'node:path';

export function assertSafeLocalPath(inputPath: string): string {
  if (inputPath.trim().length === 0) throw new Error('Path is required');
  if (inputPath.includes('\0')) throw new Error('Path contains invalid characters');
  return path.resolve(inputPath);
}

export function resolveInside(root: string, childPath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedChild = path.resolve(resolvedRoot, childPath);
  const relative = path.relative(resolvedRoot, resolvedChild);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Resolved path escapes project root');
  return resolvedChild;
}
