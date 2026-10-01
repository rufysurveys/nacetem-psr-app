export type CuratedAvatar = {
  id: string;
  title: string;
  url: string;
};

export const CURATED_AVATARS: CuratedAvatar[] = [
  { id: 'av-ryu', title: 'Ryu - Dragon Fist', url: '/avatars/ryu-dragon-fighter.svg' },
  { id: 'av-chunli', title: 'Chun-Li - Lightning Kick', url: '/avatars/chun-li-legend.svg' },
  { id: 'av-ken', title: 'Ken - Flame Striker', url: '/avatars/ken-flame-master.svg' },
  { id: 'av-guile', title: 'Guile - Sonic Commando', url: '/avatars/guile-sonic-commando.svg' },
  { id: 'av-blanka', title: 'Blanka - Electric Beast', url: '/avatars/blanka-electric-beast.svg' },
  { id: 'av-cammy', title: 'Cammy - Delta Operative', url: '/avatars/cammy-delta-operative.svg' },
];
