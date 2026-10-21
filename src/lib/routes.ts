export function boardPath(id: string): string {
  return `/boards/${encodeURIComponent(id)}`
}
