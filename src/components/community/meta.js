export const GRADIENTS = {
  indigo: ['#4F46E5', '#2A63EE', '#0EA5E9'],
  sunset: ['#F97316', '#EC4899', '#8B5CF6'],
  ocean: ['#0EA5E9', '#14B8A6', '#22C55E'],
  forest: ['#16A34A', '#65A30D', '#0D9488'],
  rose: ['#F43F5E', '#EC4899', '#F59E0B'],
  amber: ['#F59E0B', '#F97316', '#EF4444'],
  violet: ['#7C3AED', '#A855F7', '#EC4899'],
  slate: ['#334155', '#475569', '#0EA5E9'],
};
export const grad = (key) => {
  const g = GRADIENTS[key] || GRADIENTS.indigo;
  return `linear-gradient(135deg, ${g[0]}, ${g[1]} 55%, ${g[2]})`;
};
export const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'ARTISTS', label: 'Artists' },
  { id: 'VENUES', label: 'Venues' },
  { id: 'CREW', label: 'Crew' },
  { id: 'CITY', label: 'Cities' },
  { id: 'GENRE', label: 'Genres' },
  { id: 'GIGS', label: 'Gigs' },
  { id: 'GENERAL', label: 'General' },
];
export const FLAIRS = ['Question', 'Gig', 'Collab', 'Gear', 'Showcase', 'Advice', 'News', 'Discussion'];
export const REPORT_REASONS = [
  ['INAPPROPRIATE', 'Abusive, hateful or adult content'],
  ['SPAM', 'Spam or self-promotion'],
  ['HARASSMENT', 'Harassment or bullying'],
  ['SCAM', 'Scam or fraud'],
  ['OTHER', 'Something else'],
];
export const RULES_DEFAULT = [
  { title: 'Be kind and respectful', body: 'No harassment, hate or personal attacks.' },
  { title: 'Keep it clean', body: 'No abusive language or adult content.' },
  { title: 'Stay on topic', body: 'Posts should be useful to this community.' },
];
