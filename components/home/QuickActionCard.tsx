import React from 'react';
import { ChartIcon, UsersGroupIcon, UserListIcon, ChatIcon, ArrowRightIcon } from '../Icons';
import { QuickAction } from '@/types/home';

interface QuickActionCardProps {
  action: QuickAction;
  index: number;
}

const iconMap = {
  chart: ChartIcon,
  'users-group': UsersGroupIcon,
  'user-list': UserListIcon,
  chat: ChatIcon,
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({ action, index }) => {
  const IconComponent = iconMap[action.icon];
  const isPrimary = action.variant === 'primary';

  return (
    <div
      className={`${action.bgColor} rounded-lg border ${isPrimary ? 'border-primary/20' : 'border-stroke'} p-3 md:p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in`}
      style={{ animationDelay: `${(index + 4) * 100}ms` }}
    >
      <div className="flex flex-col justify-between h-full gap-3 md:gap-4">
        {/* Icon + Text */}
        <div className="flex items-start gap-2 md:gap-3">
          <div className={`${isPrimary ? 'bg-primary' : 'bg-icon-box'} rounded-lg w-8 h-8 md:w-9 md:h-9 shrink-0 flex justify-center items-center transition-transform hover:scale-110`}>
            <IconComponent
              className={isPrimary ? 'text-white' : 'text-text-heading'}
              size={14}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-xs md:text-sm leading-4 font-semibold text-text-heading mb-0.5 md:mb-1">
              {action.title}
            </h3>
            <p className="text-xs text-text leading-4">
              {action.description}
            </p>
          </div>
        </div>

        {/* Button */}
        <button
          className={`w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 cursor-pointer rounded-lg font-medium text-xs md:text-sm transition-all duration-200 group ${isPrimary
            ? 'bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md'
            : 'bg-white text-text-heading border border-stroke hover:bg-white/10'
            }`}
        >
          <span>{action.buttonText}</span>
          <ArrowRightIcon
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default QuickActionCard;