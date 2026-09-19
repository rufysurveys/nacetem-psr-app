export function tournamentLink(gameId: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('match', gameId);
  return url.toString();
}

export function rememberTournamentLink(gameId: string): void {
  window.history.replaceState({}, '', tournamentLink(gameId));
}

export async function copyTournamentLink(gameId: string): Promise<void> {
  const link = tournamentLink(gameId);
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(link); return; } catch { /* Try the legacy browser path below. */ }
  }
  const input = document.createElement('textarea');
  input.value = link;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Automatic copying is unavailable. Select and copy the room link shown below.');
}
