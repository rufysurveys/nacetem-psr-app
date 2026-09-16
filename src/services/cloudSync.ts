import { ScheduledTournamentItem } from '../store/useStore';

// Permanent Global Cloud Database Object for NACETEM Gamification App (accessible from any device/browser)
const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0aa9cab151d7a';
const API_URL = `https://api.restful-api.dev/objects/${CLOUD_OBJECT_ID}`;
const LOCAL_STORAGE_KEY = 'nacetem_psr_scheduled_tournaments_v1';

export const cloudSyncService = {
  // 1. Read cached items from LocalStorage
  getSavedLocalTournaments(): ScheduledTournamentItem[] | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return null;
  },

  // 2. Save items to LocalStorage
  saveLocalTournaments(items: ScheduledTournamentItem[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  // 3. Fetch tournaments from global cloud API across devices (Abuja, Lagos, etc.)
  async fetchCloudTournaments(): Promise<ScheduledTournamentItem[] | null> {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.data && Array.isArray(json.data.items)) {
        return json.data.items;
      }
      return null;
    } catch (err) {
      console.warn('Global Cloud Fetch Error:', err);
      return null;
    }
  },

  // 4. Publish a new tournament globally to cloud database so Device B instantly sees it
  async publishScheduledTournament(newItem: ScheduledTournamentItem): Promise<boolean> {
    try {
      const existingItems = (await this.fetchCloudTournaments()) || [];
      const filtered = existingItems.filter(item => item.id !== newItem.id);
      const updatedList = [newItem, ...filtered];
      
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'NACETEM_PSR_GLOBAL_TOURNAMENTS',
          data: { items: updatedList }
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('Global Cloud Publish Error:', err);
      return false;
    }
  },

  // 5. Update subscription/player count globally in cloud database
  async updateSubscriptionInCloud(id: string, updatedTournament: ScheduledTournamentItem): Promise<boolean> {
    try {
      const existingItems = (await this.fetchCloudTournaments()) || [];
      let found = false;
      const updatedList = existingItems.map(item => {
        if (item.id === id) {
          found = true;
          return updatedTournament;
        }
        return item;
      });
      if (!found) {
        updatedList.unshift(updatedTournament);
      }

      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'NACETEM_PSR_GLOBAL_TOURNAMENTS',
          data: { items: updatedList }
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('Global Cloud Subscription Update Error:', err);
      return false;
    }
  }
};
