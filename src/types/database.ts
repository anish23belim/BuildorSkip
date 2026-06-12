export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  problem: string;
  solution: string;
  target_audience: string | null;
  category: string;
  description: string | null;
  build_votes_count: number;
  skip_votes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  status: 'validating' | 'building' | 'skipped';
  decision_notes: string | null;
  decision_url: string | null;
}

export interface Poll {
  id: string;
  idea_id: string;
  question: string;
  created_at: string;
  options?: PollOption[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  votes_count: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  poll_option_id: string;
  user_id: string;
  created_at: string;
}


export interface Vote {
  id: string;
  user_id: string;
  idea_id: string;
  vote_type: 'build' | 'skip';
  skip_reason: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  idea_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  participant_1_profile?: Profile;
  participant_2_profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  profiles?: Profile;
}

export const CATEGORIES = [
  'SaaS',
  'Marketplace',
  'AI / ML',
  'FinTech',
  'HealthTech',
  'EdTech',
  'E-Commerce',
  'Social',
  'Developer Tools',
  'Sustainability',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'follow';
  read: boolean;
  created_at: string;
  actor_profile?: Profile;
}
