'use client';

import React from 'react';

type TaskTab = 'all' | 'today' | 'overdue';

interface TaskTabConfig {
    id: TaskTab;
    label: string;
    dotColor?: string; // optional colored dot
}

const TASK_TABS: TaskTabConfig[] = [
    { id: 'all',     label: 'All' },
    { id: 'today',   label: 'Today',   dotColor: 'bg-amber-400' },
    { id: 'overdue', label: 'Overdue', dotColor: 'bg-red-500'   },
];

interface MyTasksBarProps {
    counts: Record<TaskTab, number>;
    activeTab: TaskTab;
    onTabChange: (tab: TaskTab) => void;
}

const MyTasksBar: React.FC<MyTasksBarProps> = ({ counts, activeTab, onTabChange }) => {
    return (
        <div className="flex items-center gap-1 mb-5">
            <span className="text-sm font-medium text-text-heading/80 mr-2">My tasks</span>

            {TASK_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            isActive
                                ? 'bg-icon-linkedin text-white border-icon-linkedin'
                                : 'bg-white text-text border-stroke/50 hover:border-stroke'
                        }`}
                    >
                        {tab.dotColor && (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${tab.dotColor}`} />
                        )}
                        {tab.label}
                        <span className={`text-xs font-semibold ${isActive ? 'text-white/80' : 'text-icon-linkedin'}`}>
                            {counts[tab.id]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default MyTasksBar;