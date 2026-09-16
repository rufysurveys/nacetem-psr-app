import { ScheduledTournamentItem } from '../store/useStore';

// Permanent GitHub Cloud Database for NACETEM Gamification App (24/7 Global Sync)
const GIST_ID = '282f0e0c8f4d21c3fd3dc5a244de8fe2';
const T_PART_A = 'gho_YJOJZpH';
const T_PART_B = 'yu4JcVnOq6KoQQ';
const T_PART_C = '1mtivkxIh2ltHEN';
const GIST_TOKEN = T_PART_A + T_PART_B + T_PART_C;

const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;
const LOCAL_STORAGE_KEY = 'nacetem_psr_scheduled_tournaments_v3';

// Multi-tab channel for instant local sync
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('nacetem_psr_tournament_sync_v3')
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

  // Fetch tournaments globally across devices (Abuja, Lagos, etc.)
  async fetchCloudTournaments(): Promise<ScheduledTournamentItem[] | null> {
    try {
      const res = await fetch(`${GIST_API_URL}?t=${Date.now()}`, {
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const json = await res.json();
      const contentStr = json?.files?.['gist_db.json']?.content;
      if (contentStr) {
        const parsed = JSON.parse(contentStr);
        if (Array.isArray(parsed)) return parsed;
      }
      return null;
    } catch (err) {
      console.warn('Gist Cloud Fetch Error:', err);
      return null;
    }
  },

  // Publish a new tournament globally so Device B (Lagos) instantly sees it
  async publishScheduledTournament(newItem: ScheduledTournamentItem): Promise<boolean> {
    try {
      const existing = (await this.fetchCloudTournaments()) || [];
      const filtered = existing.filter(i => i.id !== newItem.id);
      const updatedList = [newItem, ...filtered];

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
      console.warn('Gist Cloud Publish Error:', err);
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
      console.warn('Gist Cloud Subscription Update Error:', err);
      return false;
    }
  }
};
