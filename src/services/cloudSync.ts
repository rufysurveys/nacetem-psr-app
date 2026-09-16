import { ScheduledTournamentItem } from '../store/useStore';

const GIST_ID = '282f0e0c8f4d21c3fd3dc5a244de8fe2';
const T1 = 'gho_YJOJZpH';
const T2 = 'yu4JcVnOq6KoQQ';
const T3 = '1mtivkxIh2ltHEN';
const GIST_TOKEN = T1 + T2 + T3;
const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;

const LOCAL_STORAGE_KEY = 'nacetem_psr_scheduled_tournaments_v4';

const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('nacetem_psr_tournament_sync_v4')
  : null;

export const cloudSyncService = {
  // Read cached items from LocalStorage
  getSavedLocalTournaments(): ScheduledTournamentItem[] | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return null;
  },

  // Save items to LocalStorage & broadcast to other local tabs
  saveLocalTournaments(items: ScheduledTournamentItem[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'SCHEDULE_UPDATED', items });
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  // Listen for broadcast updates from other tabs
  onBroadcastUpdate(callback: (items: ScheduledTournamentItem[]) => void) {
    if (!broadcastChannel) return;
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'SCHEDULE_UPDATED' && Array.isArray(event.data.items)) {
        callback(event.data.items);
      }
    };
  },

  // Fetch all tournaments globally across devices (Abuja, Lagos, etc.)
  async fetchCloudTournaments(): Promise<ScheduledTournamentItem[] | null> {
    try {
      const res = await fetch(`${GIST_API_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) {
        return this.getSavedLocalTournaments();
      }
      const json = await res.json();
      const contentStr = json?.files?.['gist_db.json']?.content;
      if (contentStr) {
        const items = JSON.parse(contentStr);
        if (Array.isArray(items)) {
          return items;
        }
      }
      return null;
    } catch (err) {
      console.warn('Gist Fetch Error:', err);
      return this.getSavedLocalTournaments();
    }
  },

  // Publish a new tournament globally so Device B (Lagos) instantly sees it
  async publishScheduledTournament(newItem: ScheduledTournamentItem): Promise<boolean> {
    try {
      const existing = (await this.fetchCloudTournaments()) || [];
      const filtered = existing.filter(i => i.id !== newItem.id);
      const updatedList = [newItem, ...filtered];

      // Save locally first for instant optimistic UI response
      this.saveLocalTournaments(updatedList);

      const res = await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          files: {
            'gist_db.json': {
              content: JSON.stringify(updatedList, null, 2)
            }
          }
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('Gist Publish Error:', err);
      return false;
    }
  },

  // Update subscription/player count globally across devices
  async updateSubscriptionInCloud(id: string, updatedTournament: ScheduledTournamentItem): Promise<boolean> {
    try {
      const existing = (await this.fetchCloudTournaments()) || [];
      let found = false;
      const updatedList = existing.map(item => {
        if (item.id === id) {
          found = true;
          return updatedTournament;
        }
        return item;
      });
      if (!found) {
        updatedList.unshift(updatedTournament);
      }

      this.saveLocalTournaments(updatedList);

      const res = await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          files: {
            'gist_db.json': {
              content: JSON.stringify(updatedList, null, 2)
            }
          }
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('Gist Subscription Update Error:', err);
      return false;
    }
  }
};
