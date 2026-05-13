export type Role = 'admin' | 'parent';
export type Language = 'en' | 'kn';

export interface UserProfile {
  uid: string;
  phoneNumber: string;
  email?: string;
  displayName?: string;
  name?: string;
  photoUrl?: string;
  role: Role;
  language: Language;
  updatedAt: string;
}

export interface MealRecord {
  id: string; // date YYYY-MM-DD
  date: string;
  photoUrl: string;
  menuEn: string;
  menuKn: string;
  publisherId: string;
  updatedAt: string;
}

export interface FacilityRecord {
  id: string;
  category: string;
  photoUrl: string;
  captionEn: string;
  captionKn: string;
  updatedAt: string;
}

export interface StudentStar {
  id: string;
  name: string;
  achievementEn: string;
  achievementKn: string;
  photoUrl: string;
  date: string;
  updatedAt: string;
}

export interface FeedbackRecord {
  id: string;
  text: string;
  type: 'suggestion' | 'bug';
  isAnonymous: boolean;
  userId?: string;
  status: 'pending' | 'reviewed';
  createdAt: string;
}
