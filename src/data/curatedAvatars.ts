export type CuratedAvatar = {
  id: string;
  title: string;
  url: string;
};

export const CURATED_AVATARS: CuratedAvatar[] = [
  { id: 'av-1', title: 'Creative professional', url: '/avatars/creative-professional.svg' },
  { id: 'av-2', title: 'Confident leader', url: '/avatars/confident-leader.svg' },
  { id: 'av-3', title: 'Warm collaborator', url: '/avatars/warm-collaborator.svg' },
  { id: 'av-4', title: 'Technology specialist', url: '/avatars/technology-specialist.svg' },
  { id: 'av-5', title: 'Policy advisor', url: '/avatars/policy-advisor.svg' },
  { id: 'av-6', title: 'Senior administrator', url: '/avatars/senior-administrator.svg' },
];
