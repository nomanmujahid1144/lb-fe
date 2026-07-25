import React from 'react';
import { Activity } from '@/types/home';
import { CalendarIcon, LinkedinIcon, TimeIcon } from '../Icons';
import Link from 'next/link';

interface ActivityItemProps {
  activity: Activity;
  index: number;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, index }) => {
  const renderActivityContent = () => {
    switch (activity.type) {
      case 'new_lead':
        return (
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-semibold text-sm text-text-heading">{activity.userName}</span>
                {activity.socials?.linkedin && (
                  <Link href={activity.socials.linkedin} target="_blank" rel="noopener noreferrer">
                    <LinkedinIcon size={14} />
                  </Link>
                )}
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-lg">
                  NEW LEAD
                </span>
                <span className="px-2 py-1 bg-icon-box text-text text-xs font-medium rounded-lg whitespace-nowrap">
                  Sentiment: Neutral
                </span>
              </div>
              <p className="text-xs text-text">
                {activity.details.position} at <span className="font-medium">{activity.details.company}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text">
                <div className="flex items-center gap-1">
                  <CalendarIcon size={12} />
                  Chatter: <span className="font-medium">{activity.details.chatterDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TimeIcon size={12} />
                  Internal: <span className="font-medium">{activity.details.internalDate}</span>
                </div>
              </div>
              <p className="text-xs text-text">{activity.timestamp}</p>
            </div>
          </div>
        );

      case 'meeting_booked':
        return (
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-semibold text-sm text-text-heading">{activity.userName}</span>
                <span className="text-sm text-text-heading">booked a meeting</span>
              </div>
              <p className="text-xs text-text">{activity.timestamp}</p>
            </div>
          </div>
        );

      case 'message_replied':
        return (
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-semibold text-sm text-text-heading">{activity.userName}</span>
                <span className="text-sm text-text-heading">replied to</span>
                <span className="px-1.5 py-0.5 bg-icon-box text-text text-xs font-medium rounded-lg">
                  {activity.details.platform}
                </span>
                <span className="text-sm text-text-heading">Message</span>
              </div>
              <p className="text-xs text-text">{activity.timestamp}</p>
            </div>
          </div>
        );

      case 'phase_changed':
        return (
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-semibold text-sm text-text-heading">{activity.userName}</span>
                <span className="text-sm text-text-heading">changed phase to</span>
                <span className="px-2 py-0.5 bg-info-bg text-info-text text-xs font-medium rounded-full">
                  {activity.details.phase}
                </span>
                {activity.details.status && (
                  <span className="px-1.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg whitespace-nowrap">
                    {activity.details.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-text">{activity.timestamp}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex items-start gap-3 md:gap-4 py-3 md:py-4 border-b border-stroke last:border-0 first:border-t hover:bg-neutral-50 -mx-4 px-4 transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-icon-box flex items-center justify-center text-text-heading font-semibold text-xs md:text-sm">
        {activity.userInitials}
      </div>

      {/* Content */}
      {renderActivityContent()}
    </div>
  );
};

export default ActivityItem;