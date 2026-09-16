import { ScheduledTournamentItem } from '../store/useStore';

// Serverless API Sync Endpoint (handles CORS & GitHub Gist server-side)
const GET_API_URL = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://nacetem-psr-app.vercel.app/api/sync';
    }
    return `${origin}/api/sync`;
  }
  return 'https://nacetem-psr-app.vercel.app/api/sync';
};

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
      const endpoint = GET_API_URL();
      const res = await fetch(`${endpoint}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      if (json && Array.isArray(json.items)) {
        return json.items;
      }
      return null;
    } catch (err) {
      console.warn('Serverless API Fetch Error:', err);
      return null;
    }
  },

  // Publish a new tournament globally so Device B (Lagos) instantly sees it
  async publishScheduledTournament(newItem: ScheduledTournamentItem): Promise<boolean> {
    try {
      const existing = (await this.fetchCloudTournaments()) || [];
      const filtered = existing.filter(i => i.id !== newItem.id);
      const updatedList = [newItem, ...filtered];

      const endpoint = GET_API_URL();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedList })
      });
      return res.ok;
    } catch (err) {
      console.warn('Serverless API Publish Error:', err);
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

      const endpoint = GET_API_URL();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedList })
      });
      return res.ok;
    } catch (err) {
      console.warn('Serverless API Subscription Update Error:', err);
      return false;
    }
  }
};
