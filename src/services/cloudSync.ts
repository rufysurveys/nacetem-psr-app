import { ScheduledTournamentItem } from '../store/useStore';

// Permanent Cross-Device Real-Time Cloud Storage Endpoints
const CRUDCRUD_URL = 'https://crudcrud.com/api/b12d3d6001eb4ebaa7a2a71623161e17/scheduledTournaments';
const RESTFUL_API_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a0aa9cab151d7a';
const LOCAL_STORAGE_KEY = 'nacetem_psr_scheduled_tournaments_v2';

// Multi-tab channel for instant local sync
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('nacetem_psr_tournament_sync')
  : null;

export const cloudSyncService = {
  // Read local storage cache
  getSavedLocalTournaments(): ScheduledTournamentItem[] | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return null;
  },

  // Save to local storage & broadcast to other tabs
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
    // Try Primary Endpoint (CrudCrud)
    try {
      const res = await fetch(CRUDCRUD_URL, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id || item._id,
            title: item.title,
            competitionMode: item.competitionMode || 'intra_dept',
            targetOrg: item.targetOrg || 'NACETEM',
            startDateTime: item.startDateTime || new Date().toISOString(),
            cutoffDateTime: item.cutoffDateTime || new Date().toISOString(),
            winnerBadgeTitle: item.winnerBadgeTitle || 'Trophy',
            registeredCount: item.registeredCount || 1,
            isSubscribed: item.isSubscribed || false,
            createdBy: item.createdBy || 'Administrator',
            description: item.description || ''
          }));
        }
      }
    } catch (e) {
      console.warn('CrudCrud fetch error, switching to fallback:', e);
    }

    // Try Fallback Endpoint (Restful-API)
    try {
      const res = await fetch(RESTFUL_API_URL, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data && Array.isArray(json.data.items)) {
          return json.data.items;
        }
      }
    } catch (e) {
      console.warn('Restful-API fetch error:', e);
    }

    return null;
  },

  // Publish a new tournament globally so Device B (Lagos) instantly sees it
  async publishScheduledTournament(newItem: ScheduledTournamentItem): Promise<boolean> {
    let success = false;

    // 1. Post to CrudCrud
    try {
      const res = await fetch(CRUDCRUD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) success = true;
    } catch (e) {
      console.warn('CrudCrud publish error:', e);
    }

    // 2. Post to Restful-API Fallback
    try {
      const existing = (await this.fetchCloudTournaments()) || [];
      const updated = [newItem, ...existing.filter(i => i.id !== newItem.id)];
      await fetch(RESTFUL_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'NACETEM_PSR_GLOBAL_TOURNAMENTS',
          data: { items: updated }
        })
      });
      success = true;
    } catch (e) {
      console.warn('Restful-API publish error:', e);
    }

    return success;
  },

  // Update subscription/player count globally across devices
  async updateSubscriptionInCloud(id: string, updatedItem: ScheduledTournamentItem): Promise<boolean> {
    try {
      const res = await fetch(CRUDCRUD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      return res.ok;
    } catch (e) {
      console.warn('Cloud subscription update error:', e);
      return false;
    }
  }
};
