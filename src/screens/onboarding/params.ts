/** Builds the query string that carries goalId / onboarding through the template flow. */
export function templateQuery(params: { goalId?: string; onboarding?: string }): string {
  const q: string[] = [];
  if (params.goalId) q.push(`goalId=${encodeURIComponent(params.goalId)}`);
  if (params.onboarding) q.push('onboarding=1');
  return q.length ? `?${q.join('&')}` : '';
}
