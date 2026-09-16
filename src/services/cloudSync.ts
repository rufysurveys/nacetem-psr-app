import { ScheduledTournamentItem } from '../store/useStore';

// Public Realtime Cloud Storage endpoint for NACETEM PSR Gamification App
const CLOUD_ENDPOINT = 'https://nacetem-psr-gamification-default-rtdb.firebaseio.com/scheduledTournaments.json';
const LOCAL_STORAGE_KEY = 'nacetem_psr_scheduled_tournaments_v1';

export const cloudSyncService = {
  // 1. Get initial local storage items
  getSavedLocalTournaments(): ScheduledTournamentItem[] | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading local storage scheduled tournaments:', e);
    }
    return null;
  },

  // 2. Save local storage items
  saveLocalTournaments(items: ScheduledTournamentItem[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Error saving local storage scheduled tournaments:', e);
    }
  },

  // 3. Fetch remote tournaments from Cloud Endpoint (cross-device real-time sync)
  async fetchCloudTournaments(): Promise<ScheduledTournamentItem[] | null> {
    try {
      const res = await fetch(CLOUD_ENDPOINT);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data) return [];
      
      let list: ScheduledTournamentItem[] = [];
      if (Array.isArray(data)) {
        list = data.filter(Boolean);
      } else if (typeof data === 'object') {
        list = Object.values(data);
      }
      return list;
    } catch (err) {
      console.warn('Cloud sync fetch warning:', err);
      return null;
    }
  },

  // 4. Publish a scheduled tournament to Cloud Endpoint
  async publishScheduledTournament(tournament: ScheduledTournamentItem): Promise<boolean> {
    try {
      const singleItemEndpoint = `https://nacetem-psr-gamification-default-rtdb.firebaseio.com/scheduledTournaments/${tournament.id}.json`;
      const res = await fetch(singleItemEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournament)
      });
      return res.ok;
    } catch (err) {
      console.warn('Cloud sync publish warning:', err);
      return false;
    }
  },

  // 5. Update subscription count in Cloud Endpoint
  async updateSubscriptionInCloud(id: string, updatedTournament: ScheduledTournamentItem): Promise<boolean> {
    try {
      const singleItemEndpoint = `https://nacetem-psr-gamification-default-rtdb.firebaseio.com/scheduledTournaments/${id}.json`;
      const res = await fetch(singleItemEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTournament)
      });
      return res.ok;
    } catch (err) {
      console.warn('Cloud sync subscription update warning:', err);
      return false;
    }
  }
};
