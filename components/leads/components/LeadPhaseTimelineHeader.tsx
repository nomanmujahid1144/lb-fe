'use client';

import React, { ReactNode } from 'react';

interface LeadPhaseTimelineHeaderProps {
    title: string;
    icon?: React.ReactNode;
    headerActions?: React.ReactNode; // Actions in the header (right side)
    children?: ReactNode;
}

const LeadPhaseTimelineHeader: React.FC<LeadPhaseTimelineHeaderProps> = ({
    title,
    icon,
    headerActions,
    children
}) => {
    return (
        <div className='rounded-xl border border-stroke'>
            <div className="flex items-center justify-between mb-3 p-3 md:p-4 border-b border-stroke bg-stroke/30 rounded-t-xl">
                <div className="flex items-center gap-2">
                    {icon && <span className="flex-shrink-0">{icon}</span>}
                    <p className="text-sm font-medium text-text-heading">{title}</p>
                </div>
                {headerActions && (
                    <div className="flex items-center gap-4">
                        {headerActions}
                    </div>
                )}
            </div>
            {children && <div>{children}</div>}
        </div>
    );
};

export default LeadPhaseTimelineHeader;