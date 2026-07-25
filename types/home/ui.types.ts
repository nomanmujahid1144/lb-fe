export interface StatCard {
  id: string;
  label: string;
  value: number;
  percentage?: number;
  icon: 'users' | 'link' | 'message' | 'thumbsup';
  bgColor: string;
  iconColor: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: 'chart' | 'users-group' | 'user-list' | 'chat';
  buttonText: string;
  variant: 'default' | 'primary';
  bgColor: string;
}

export type ActivityType = 'new_lead' | 'meeting_booked' | 'message_replied' | 'phase_changed';

export interface Activity {
  id: string;
  type: ActivityType;
  userName: string;
  userInitials: string;
  timestamp: string;
  details: {
    title?: string;
    position?: string;
    company?: string;
    chatterDate?: string;
    internalDate?: string;
    platform?: string;
    phase?: string;
    status?: string;
  };
  socials: {
    linkedin?: string;
  };
}