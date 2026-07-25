import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
}

export const UsersIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
export const LinkIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);
export const MessageIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3332 9.16668C18.3332 8.75718 18.3288 8.34768 18.32 7.937C18.2656 5.38239 18.2383 4.10509 17.2958 3.15889C16.3531 2.2127 15.0413 2.17974 12.4175 2.11382C10.8004 2.07319 9.19926 2.07319 7.58219 2.11381C4.95845 2.17973 3.64657 2.21269 2.70396 3.15889C1.76135 4.10508 1.73412 5.38239 1.67964 7.93699C1.66212 8.75843 1.66213 9.57493 1.67965 10.3963C1.73412 12.951 1.76136 14.2283 2.70397 15.1745C3.64657 16.1207 4.95845 16.1536 7.5822 16.2195C8.39076 16.2398 9.19526 16.25 9.99984 16.25" stroke="#E64233" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.83301 6.25L8.28469 7.69953C9.71402 8.54458 10.2853 8.54458 11.7147 7.69953L14.1664 6.25" stroke="#E64233" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.3335 17.9169C18.2368 15.8132 18.3225 15.0477 16.9533 14.0661C16.2803 13.5836 14.9263 13.2657 13.0982 13.4373M14.5433 11.3273L12.6294 13.122C12.4677 13.2838 12.4665 13.5467 12.6267 13.7101L14.5433 15.5334" stroke="#E64233" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

);
export const ThumbsUpIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
);
export const ChartIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H14" stroke="#252B37" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 11.3333V6" stroke="#252B37" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.6665 11.3333V3.33333" stroke="#252B37" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.3335 11.3333V9.33333" stroke="#252B37" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const UsersGroupIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
export const UserListIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
);
export const ChatIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14 10C14 10.3536 13.8595 10.6928 13.6095 10.9428C13.3594 11.1929 13.0203 11.3333 12.6667 11.3333H4.66667L2 14V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H12.6667C13.0203 2 13.3594 2.14048 13.6095 2.39052C13.8595 2.64057 14 2.97971 14 3.33333V10Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const ArrowRightIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);
export const HomeIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
);
export const LogoutIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 12" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11.4333 6.66667H4C3.81111 6.66667 3.65278 6.60278 3.525 6.475C3.39722 6.34722 3.33333 6.18889 3.33333 6C3.33333 5.81111 3.39722 5.65278 3.525 5.525C3.65278 5.39722 3.81111 5.33333 4 5.33333H11.4333L10.8667 4.76667C10.7333 4.63333 10.6694 4.47778 10.675 4.3C10.6806 4.12222 10.7444 3.96667 10.8667 3.83333C11 3.7 11.1583 3.63056 11.3417 3.625C11.525 3.61944 11.6833 3.68333 11.8167 3.81667L13.5333 5.53333C13.6667 5.66667 13.7333 5.82222 13.7333 6C13.7333 6.17778 13.6667 6.33333 13.5333 6.46667L11.8167 8.18333C11.6833 8.31667 11.525 8.38056 11.3417 8.375C11.1583 8.36944 11 8.3 10.8667 8.16667C10.7444 8.03333 10.6806 7.87778 10.675 7.7C10.6694 7.52222 10.7333 7.36667 10.8667 7.23333L11.4333 6.66667ZM8 3.33333V1.33333H1.33333V10.6667H8V8.66667C8 8.47778 8.06389 8.31944 8.19167 8.19167C8.31944 8.06389 8.47778 8 8.66667 8C8.85556 8 9.01389 8.06389 9.14167 8.19167C9.26945 8.31944 9.33333 8.47778 9.33333 8.66667V10.6667C9.33333 11.0333 9.20278 11.3472 8.94167 11.6083C8.68056 11.8694 8.36667 12 8 12H1.33333C0.966667 12 0.652778 11.8694 0.391667 11.6083C0.130556 11.3472 0 11.0333 0 10.6667V1.33333C0 0.966667 0.130556 0.652778 0.391667 0.391667C0.652778 0.130556 0.966667 0 1.33333 0H8C8.36667 0 8.68056 0.130556 8.94167 0.391667C9.20278 0.652778 9.33333 0.966667 9.33333 1.33333V3.33333C9.33333 3.52222 9.26945 3.68056 9.14167 3.80833C9.01389 3.93611 8.85556 4 8.66667 4C8.47778 4 8.31944 3.93611 8.19167 3.80833C8.06389 3.68056 8 3.52222 8 3.33333Z" />
    </svg>
);
export const MultiPersonsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="currentColor" className={className}>
        <path d="M6.39896 7.1708C5.39886 7.1708 4.57422 6.3637 4.59177 5.34606C4.59177 4.34596 5.39886 3.52132 6.39896 3.52132C7.39905 3.52132 8.2237 4.34596 8.2237 5.34606C8.2237 6.3637 7.4166 7.1708 6.39896 7.1708ZM7.27624 7.73225C8.66233 7.73225 9.78525 8.78499 9.78525 10.0834C9.78525 10.3465 9.55716 10.5395 9.27643 10.5395H3.53903C3.25831 10.5395 3.04776 10.3465 3.04776 10.0834C3.04776 8.78499 4.15313 7.73225 5.53923 7.73225H7.27624ZM9.78525 4.36351C8.9957 4.36351 8.38161 3.74941 8.38161 2.95987C8.38161 2.18786 8.9957 1.55622 9.78525 1.55622C10.5573 1.55622 11.1889 2.18786 11.1889 2.95987C11.1889 3.74941 10.5573 4.36351 9.78525 4.36351ZM4.01276 5.34606C4.01276 5.94261 4.24086 6.48652 4.60931 6.89007H1.1002C0.924748 6.89007 0.801929 6.7497 0.801929 6.57425C0.801929 5.66188 1.48621 4.92497 2.34594 4.92497H3.41622C3.64431 4.92497 3.85485 4.9776 4.04786 5.08288C4.03031 5.1706 4.01276 5.25833 4.01276 5.34606ZM3.04776 4.36351C2.25821 4.36351 1.64412 3.74941 1.64412 2.95987C1.64412 2.18786 2.25821 1.55622 3.04776 1.55622C3.81976 1.55622 4.4514 2.18786 4.4514 2.95987C4.4514 3.74941 3.81976 4.36351 3.04776 4.36351ZM10.4695 4.92497C11.3293 4.92497 12.0311 5.66188 12.0311 6.57425C12.0311 6.7497 11.8907 6.89007 11.7153 6.89007H8.20615C8.57461 6.48652 8.78515 5.94261 8.78515 5.34606C8.78515 5.25833 8.76761 5.1706 8.76761 5.08288C8.96061 4.99515 9.17115 4.92497 9.39925 4.92497H10.4695Z" />
    </svg>
);
export const SinglePersonIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11.0832 12.25V11.0833C11.0832 10.4645 10.8373 9.871 10.3998 9.43342C9.96217 8.99583 9.36868 8.75 8.74984 8.75H5.24984C4.631 8.75 4.03751 8.99583 3.59992 9.43342C3.16234 9.871 2.9165 10.4645 2.9165 11.0833V12.25" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.99984 6.41667C8.2885 6.41667 9.33317 5.372 9.33317 4.08333C9.33317 2.79467 8.2885 1.75 6.99984 1.75C5.71117 1.75 4.6665 2.79467 4.6665 4.08333C4.6665 5.372 5.71117 6.41667 6.99984 6.41667Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

);
export const LinkedinIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 4.99998V8.49998" stroke="#34446F" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 6.49998V8.49998M5.5 6.49998C5.5 5.67153 6.17155 4.99998 7 4.99998C7.82845 4.99998 8.5 5.67153 8.5 6.49998V8.49998M5.5 6.49998V4.99998" stroke="#34446F" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.50384 3.49998H3.49951" stroke="#34446F" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.25 5.99998C1.25 3.76081 1.25 2.64122 1.94562 1.9456C2.64124 1.24998 3.76083 1.24998 6 1.24998C8.23915 1.24998 9.35875 1.24998 10.0544 1.9456C10.75 2.64122 10.75 3.76081 10.75 5.99998C10.75 8.23913 10.75 9.35873 10.0544 10.0544C9.35875 10.75 8.23915 10.75 6 10.75C3.76083 10.75 2.64124 10.75 1.94562 10.0544C1.25 9.35873 1.25 8.23913 1.25 5.99998Z" stroke="#34446F" strokeWidth="0.75" strokeLinejoin="round" />
    </svg>
);
export const LinkedinBoldIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M9.3335 4.66667C10.2618 4.66667 11.152 5.03542 11.8084 5.6918C12.4647 6.34818 12.8335 7.23841 12.8335 8.16667V12.25H10.5002V8.16667C10.5002 7.85725 10.3772 7.56051 10.1585 7.34171C9.93966 7.12292 9.64292 7.00001 9.3335 7.00001C9.02408 7.00001 8.72733 7.12292 8.50854 7.34171C8.28975 7.56051 8.16683 7.85725 8.16683 8.16667V12.25H5.8335V8.16667C5.8335 7.23841 6.20225 6.34818 6.85862 5.6918C7.515 5.03542 8.40524 4.66667 9.3335 4.66667Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.49984 5.25H1.1665V12.25H3.49984V5.25Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.33317 3.50001C2.9775 3.50001 3.49984 2.97767 3.49984 2.33334C3.49984 1.68901 2.9775 1.16667 2.33317 1.16667C1.68884 1.16667 1.1665 1.68901 1.1665 2.33334C1.1665 2.97767 1.68884 3.50001 2.33317 3.50001Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const CalendarIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 1V3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 1V3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 2H2.5C1.94772 2 1.5 2.44772 1.5 3V10C1.5 10.5523 1.94772 11 2.5 11H9.5C10.0523 11 10.5 10.5523 10.5 10V3C10.5 2.44772 10.0523 2 9.5 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 5H10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const TimeIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="#676F7E" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 3V6L8 7" stroke="#676F7E" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const HomeScreenIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 14V8.66667C10 8.48986 9.92976 8.32029 9.80474 8.19526C9.67971 8.07024 9.51014 8 9.33333 8H6.66667C6.48986 8 6.32029 8.07024 6.19526 8.19526C6.07024 8.32029 6 8.48986 6 8.66667V14" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 6.66673C1.99995 6.47277 2.04222 6.28114 2.12386 6.1052C2.20549 5.92927 2.32453 5.77326 2.47267 5.64806L7.13933 1.64873C7.37999 1.44533 7.6849 1.33374 8 1.33374C8.3151 1.33374 8.62001 1.44533 8.86067 1.64873L13.5273 5.64806C13.6755 5.77326 13.7945 5.92927 13.8761 6.1052C13.9578 6.28114 14 6.47277 14 6.66673V12.6667C14 13.0203 13.8595 13.3595 13.6095 13.6095C13.3594 13.8596 13.0203 14.0001 12.6667 14.0001H3.33333C2.97971 14.0001 2.64057 13.8596 2.39052 13.6095C2.14048 13.3595 2 13.0203 2 12.6667V6.66673Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const DBIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5.33325C11.3137 5.33325 14 4.43782 14 3.33325C14 2.22868 11.3137 1.33325 8 1.33325C4.68629 1.33325 2 2.22868 2 3.33325C2 4.43782 4.68629 5.33325 8 5.33325Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 3.33325V12.6666C2 13.197 2.63214 13.7057 3.75736 14.0808C4.88258 14.4559 6.4087 14.6666 8 14.6666C9.5913 14.6666 11.1174 14.4559 12.2426 14.0808C13.3679 13.7057 14 13.197 14 12.6666V3.33325" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 8C2 8.53043 2.63214 9.03914 3.75736 9.41421C4.88258 9.78929 6.4087 10 8 10C9.5913 10 11.1174 9.78929 12.2426 9.41421C13.3679 9.03914 14 8.53043 14 8" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const ListIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2 8H2.00667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12H2.00667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 4H2.00667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.3335 8H14.0002" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.3335 12H14.0002" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.3335 4H14.0002" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const SettingIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M8.14667 1.33325H7.85333C7.49971 1.33325 7.16057 1.47373 6.91053 1.72378C6.66048 1.97382 6.52 2.31296 6.52 2.66659V2.78659C6.51976 3.0204 6.45804 3.25005 6.34103 3.45248C6.22401 3.65491 6.05583 3.82301 5.85333 3.93992L5.56667 4.10659C5.36398 4.22361 5.13405 4.28522 4.9 4.28522C4.66595 4.28522 4.43603 4.22361 4.23333 4.10659L4.13333 4.05325C3.82738 3.87676 3.46389 3.82888 3.12267 3.92012C2.78145 4.01137 2.49037 4.23428 2.31333 4.53992L2.16667 4.79325C1.99018 5.09921 1.9423 5.46269 2.03354 5.80392C2.12478 6.14514 2.34769 6.43622 2.65333 6.61325L2.75333 6.67992C2.95485 6.79626 3.12241 6.96331 3.23937 7.16447C3.35632 7.36563 3.4186 7.5939 3.42 7.82659V8.16659C3.42093 8.40153 3.35977 8.63255 3.2427 8.83626C3.12563 9.03996 2.95681 9.20911 2.75333 9.32659L2.65333 9.38659C2.34769 9.56362 2.12478 9.8547 2.03354 10.1959C1.9423 10.5371 1.99018 10.9006 2.16667 11.2066L2.31333 11.4599C2.49037 11.7656 2.78145 11.9885 3.12267 12.0797C3.46389 12.171 3.82738 12.1231 4.13333 11.9466L4.23333 11.8933C4.43603 11.7762 4.66595 11.7146 4.9 11.7146C5.13405 11.7146 5.36398 11.7762 5.56667 11.8933L5.85333 12.0599C6.05583 12.1768 6.22401 12.3449 6.34103 12.5474C6.45804 12.7498 6.51976 12.9794 6.52 13.2133V13.3333C6.52 13.6869 6.66048 14.026 6.91053 14.2761C7.16057 14.5261 7.49971 14.6666 7.85333 14.6666H8.14667C8.50029 14.6666 8.83943 14.5261 9.08948 14.2761C9.33953 14.026 9.48 13.6869 9.48 13.3333V13.2133C9.48024 12.9794 9.54196 12.7498 9.65898 12.5474C9.77599 12.3449 9.94418 12.1768 10.1467 12.0599L10.4333 11.8933C10.636 11.7762 10.866 11.7146 11.1 11.7146C11.3341 11.7146 11.564 11.7762 11.7667 11.8933L11.8667 11.9466C12.1726 12.1231 12.5361 12.171 12.8773 12.0797C13.2186 11.9885 13.5096 11.7656 13.6867 11.4599L13.8333 11.1999C14.0098 10.894 14.0577 10.5305 13.9665 10.1893C13.8752 9.84803 13.6523 9.55695 13.3467 9.37992L13.2467 9.32659C13.0432 9.20911 12.8744 9.03996 12.7573 8.83626C12.6402 8.63255 12.5791 8.40153 12.58 8.16659V7.83325C12.5791 7.59831 12.6402 7.36728 12.7573 7.16358C12.8744 6.95988 13.0432 6.79072 13.2467 6.67325L13.3467 6.61325C13.6523 6.43622 13.8752 6.14514 13.9665 5.80392C14.0577 5.46269 14.0098 5.09921 13.8333 4.79325L13.6867 4.53992C13.5096 4.23428 13.2186 4.01137 12.8773 3.92012C12.5361 3.82888 12.1726 3.87676 11.8667 4.05325L11.7667 4.10659C11.564 4.22361 11.3341 4.28522 11.1 4.28522C10.866 4.28522 10.636 4.22361 10.4333 4.10659L10.1467 3.93992C9.94418 3.82301 9.77599 3.65491 9.65898 3.45248C9.54196 3.25005 9.48024 3.0204 9.48 2.78659V2.66659C9.48 2.31296 9.33953 1.97382 9.08948 1.72378C8.83943 1.47373 8.50029 1.33325 8.14667 1.33325Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const BlockListIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_274_9440)">
            <path d="M8.00016 14.6666C11.6821 14.6666 14.6668 11.6818 14.6668 7.99992C14.6668 4.31802 11.6821 1.33325 8.00016 1.33325C4.31826 1.33325 1.3335 4.31802 1.3335 7.99992C1.3335 11.6818 4.31826 14.6666 8.00016 14.6666Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.2666 3.2666L12.7333 12.7333" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
            <clipPath id="clip0_274_9440">
                <rect width={size} height={size} fill="white" />
            </clipPath>
        </defs>
    </svg>
);

// Leads Page Icons

export const TimeLineListIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M3.33333 7.49998C3.79357 7.49998 4.16667 7.12688 4.16667 6.66665C4.16667 6.20641 3.79357 5.83331 3.33333 5.83331C2.8731 5.83331 2.5 6.20641 2.5 6.66665C2.5 7.12688 2.8731 7.49998 3.33333 7.49998Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.33333 14.1667C3.79357 14.1667 4.16667 13.7936 4.16667 13.3333C4.16667 12.8731 3.79357 12.5 3.33333 12.5C2.8731 12.5 2.5 12.8731 2.5 13.3333C2.5 13.7936 2.8731 14.1667 3.33333 14.1667Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.3335 17.5V2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.26184 7.84518L7.79462 7.37796C7.74494 7.32827 7.7201 7.30343 7.69815 7.27759C7.58527 7.14467 7.51693 6.97968 7.50276 6.80586C7.5 6.77206 7.5 6.73693 7.5 6.66667C7.5 6.5964 7.5 6.56128 7.50276 6.52748C7.51693 6.35366 7.58527 6.18867 7.69815 6.05574C7.7201 6.0299 7.74494 6.00506 7.79462 5.95538L8.26184 5.48816C8.50267 5.2473 8.62317 5.12687 8.77625 5.06343C8.92942 5 9.09975 5 9.44033 5H14.1667C14.9523 5 15.3452 5 15.5892 5.24408C15.8333 5.48816 15.8333 5.88099 15.8333 6.66667C15.8333 7.45234 15.8333 7.84518 15.5892 8.08926C15.3452 8.33333 14.9523 8.33333 14.1667 8.33333H9.44033C9.09975 8.33333 8.92942 8.33333 8.77625 8.2699C8.62317 8.20647 8.50267 8.08603 8.26184 7.84518Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.26184 14.5119L7.79462 14.0447C7.74494 13.9949 7.7201 13.9701 7.69815 13.9443C7.58527 13.8114 7.51693 13.6464 7.50276 13.4725C7.5 13.4388 7.5 13.4036 7.5 13.3334C7.5 13.2631 7.5 13.2279 7.50276 13.1942C7.51693 13.0204 7.58527 12.8554 7.69815 12.7224C7.7201 12.6966 7.74494 12.6718 7.79462 12.622L8.26184 12.1549C8.50267 11.914 8.62317 11.7935 8.77625 11.7301C8.92942 11.6667 9.09975 11.6667 9.44033 11.6667H15.8333C16.619 11.6667 17.0118 11.6667 17.2559 11.9108C17.5 12.1549 17.5 12.5477 17.5 13.3334C17.5 14.119 17.5 14.5119 17.2559 14.7559C17.0118 15 16.619 15 15.8333 15H9.44033C9.09975 15 8.92942 15 8.77625 14.9366C8.62317 14.8732 8.50267 14.7527 8.26184 14.5119Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const CardCounterIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 21 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M5.41568 15.7917C4.33225 15.6851 3.52063 15.3597 2.97631 14.8154C2 13.8391 2 12.2677 2 9.12502V8.70835C2 5.56565 2 3.99431 2.97631 3.018C3.95262 2.04169 5.52397 2.04169 8.66667 2.04169H12C15.1427 2.04169 16.7141 2.04169 17.6903 3.018C18.6667 3.99431 18.6667 5.56565 18.6667 8.70835V9.12502C18.6667 12.2677 18.6667 13.8391 17.6903 14.8154C16.7141 15.7917 15.1427 15.7917 12 15.7917C11.5329 15.8021 11.1609 15.8376 10.7955 15.9209C9.79683 16.1508 8.87208 16.6618 7.95822 17.1074C6.65607 17.7424 6.005 18.0599 5.59641 17.7626C4.81474 17.1804 5.57878 15.3766 5.75 14.5417" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <path fillRule="evenodd" clipRule="evenodd" d="M6.24316 7.06602C6.24316 6.72372 6.53231 6.44623 6.889 6.44623H10.3334C10.6901 6.44623 10.9793 6.72372 10.9793 7.06602C10.9793 7.40832 10.6901 7.68581 10.3334 7.68581H6.889C6.53231 7.68581 6.24316 7.40832 6.24316 7.06602ZM6.24316 11.198C6.24316 10.8557 6.53231 10.5782 6.889 10.5782H13.7779C14.1346 10.5782 14.4237 10.8557 14.4237 11.198C14.4237 11.5403 14.1346 11.8178 13.7779 11.8178H6.889C6.53231 11.8178 6.24316 11.5403 6.24316 11.198Z" fill="#36465F" />
    </svg>
);
export const PencilEditIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 21 21" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14.3718 4.02945L15.238 3.16321C15.9557 2.4456 17.1192 2.4456 17.8368 3.16321C18.5544 3.88083 18.5544 5.04431 17.8368 5.76193L16.9705 6.62818M14.3718 4.02945L8.54488 9.85635C8.10081 10.3005 7.78579 10.8568 7.63347 11.4661L7 14L9.53391 13.3665C10.1432 13.2142 10.6995 12.8992 11.1437 12.4551L16.9705 6.62818M14.3718 4.02945L16.9705 6.62818" stroke="currentColor" strokeWidth="1.3125" strokeLinejoin="round" />
        <path d="M16.6249 11.8125C16.6249 14.6891 16.6249 16.1273 15.8305 17.0954C15.6851 17.2726 15.5226 17.4351 15.3453 17.5805C14.3773 18.375 12.939 18.375 10.0624 18.375H9.625C6.32517 18.375 4.67526 18.375 3.65014 17.3498C2.62503 16.3248 2.625 14.6748 2.625 11.375V10.9375C2.625 8.06095 2.625 6.62269 3.41945 5.65464C3.5649 5.47741 3.72741 5.3149 3.90464 5.16945C4.87269 4.375 6.31095 4.375 9.1875 4.375" stroke="currentColor" strokeWidth="1.3125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const SidebarLeftIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M1.6665 10C1.6665 6.92572 1.6665 5.38858 2.34469 4.29898C2.59559 3.89585 2.90726 3.54522 3.2656 3.26295C4.23414 2.5 5.60048 2.5 8.33317 2.5H11.6665C14.3992 2.5 15.7655 2.5 16.7341 3.26295C17.0924 3.54522 17.4041 3.89585 17.655 4.29898C18.3332 5.38858 18.3332 6.92572 18.3332 10C18.3332 13.0742 18.3332 14.6114 17.655 15.701C17.4041 16.1042 17.0924 16.4547 16.7341 16.7371C15.7655 17.5 14.3992 17.5 11.6665 17.5H8.33317C5.60048 17.5 4.23414 17.5 3.2656 16.7371C2.90726 16.4547 2.59559 16.1042 2.34469 15.701C1.6665 14.6114 1.6665 13.0742 1.6665 10Z" stroke="currentColor" strokeWidth="1.25" />
        <path d="M7.9165 2.5V17.5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M4.1665 5.83331H4.99984M4.1665 8.33331H4.99984" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const DotsHorizontalViewMoreIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 21 21" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="5.5" cy="10.5" r="1.5" fill="#36465F" />
        <circle cx="10.5" cy="10.5" r="1.5" fill="#36465F" />
        <circle cx="15.5" cy="10.5" r="1.5" fill="#36465F" />
    </svg>
);
export const DotsVerticleViewMoreIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 5 22" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="2.2" cy="2.2" r="2.2" transform="matrix(1 0 0 -1 0 4.39999)" fill="#D9D9D9" />
        <circle cx="2.2" cy="2.2" r="2.2" transform="matrix(1 0 0 -1 0 13.1999)" fill="#D9D9D9" />
        <circle cx="2.2" cy="2.2" r="2.2" transform="matrix(1 0 0 -1 0 21.9999)" fill="#D9D9D9" />
    </svg>
);
export const DoubleArrowIcon: React.FC<IconProps & { isCollapsed?: boolean }> = ({
    className = '',
    size = 20,
    isCollapsed = false
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M18.3335 2.5L9.5835 8.76365L0.833496 2.50135L0.833496 4.14231L9.5835 10.4073L18.3335 4.14231V2.5ZM18.3335 10.3023L9.5835 16.5673L0.833496 10.301L0.833496 11.9433L9.5835 18.2083L18.3335 11.9433V10.3023Z" fill="#34446F" />
    </svg>
);
export const GridViewIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M3.88886 9.66294C4.39331 10 5.09554 10 6.5 10C7.90447 10 8.6067 10 9.11115 9.66294C9.32953 9.51702 9.51703 9.32952 9.66294 9.11114C10 8.60669 10 7.90446 10 6.5C10 5.09554 10 4.39331 9.66294 3.88886C9.51703 3.67048 9.32953 3.48298 9.11115 3.33706C8.6067 3 7.90447 3 6.5 3C5.09554 3 4.39331 3 3.88886 3.33706C3.67048 3.48298 3.48298 3.67048 3.33707 3.88886C3 4.39331 3 5.09554 3 6.5C3 7.90446 3 8.60669 3.33707 9.11114C3.48298 9.32952 3.67048 9.51702 3.88886 9.66294Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14.8888 9.66294C15.3933 10 16.0955 10 17.5 10C18.9044 10 19.6067 10 20.1111 9.66294C20.3295 9.51702 20.517 9.32952 20.6629 9.11114C21 8.60669 21 7.90446 21 6.5C21 5.09554 21 4.39331 20.6629 3.88886C20.517 3.67048 20.3295 3.48298 20.1111 3.33706C19.6067 3 18.9044 3 17.5 3C16.0955 3 15.3933 3 14.8888 3.33706C14.6705 3.48298 14.483 3.67048 14.337 3.88886C14 4.39331 14 5.09554 14 6.5C14 7.90446 14 8.60669 14.337 9.11114C14.483 9.32952 14.6705 9.51702 14.8888 9.66294Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3.88886 20.6629C4.39331 21 5.09554 21 6.5 21C7.90447 21 8.6067 21 9.11115 20.6629C9.32953 20.517 9.51703 20.3295 9.66294 20.1111C10 19.6067 10 18.9045 10 17.5C10 16.0955 10 15.3933 9.66294 14.8889C9.51703 14.6705 9.32953 14.483 9.11115 14.3371C8.6067 14 7.90447 14 6.5 14C5.09554 14 4.39331 14 3.88886 14.3371C3.67048 14.483 3.48298 14.6705 3.33707 14.8889C3 15.3933 3 16.0955 3 17.5C3 18.9045 3 19.6067 3.33707 20.1111C3.48298 20.3295 3.67048 20.517 3.88886 20.6629Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14.8888 20.6629C15.3933 21 16.0955 21 17.5 21C18.9044 21 19.6067 21 20.1111 20.6629C20.3295 20.517 20.517 20.3295 20.6629 20.1111C21 19.6067 21 18.9045 21 17.5C21 16.0955 21 15.3933 20.6629 14.8889C20.517 14.6705 20.3295 14.483 20.1111 14.3371C19.6067 14 18.9044 14 17.5 14C16.0955 14 15.3933 14 14.8888 14.3371C14.6705 14.483 14.483 14.6705 14.337 14.8889C14 15.3933 14 16.0955 14 17.5C14 18.9045 14 19.6067 14.337 20.1111C14.483 20.3295 14.6705 20.517 14.8888 20.6629Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
);
export const ListViewIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 19H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const SearchIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M9.83572 9.04709L7.94744 7.16436C8.55668 6.3882 8.88725 5.42973 8.88603 4.44301C8.88603 3.56427 8.62545 2.70526 8.13724 1.97461C7.64904 1.24396 6.95514 0.674487 6.14328 0.338206C5.33143 0.00192505 4.43809 -0.0860614 3.57623 0.0853732C2.71437 0.256808 1.9227 0.679964 1.30133 1.30133C0.679964 1.9227 0.256808 2.71437 0.0853732 3.57623C-0.0860614 4.43809 0.00192505 5.33143 0.338206 6.14328C0.674487 6.95514 1.24396 7.64904 1.97461 8.13724C2.70526 8.62545 3.56427 8.88603 4.44301 8.88603C5.42973 8.88725 6.3882 8.55668 7.16436 7.94744L9.04709 9.83572C9.09872 9.88777 9.16014 9.92909 9.22782 9.95729C9.2955 9.98548 9.36809 10 9.4414 10C9.51472 10 9.58731 9.98548 9.65499 9.95729C9.72267 9.92909 9.78409 9.88777 9.83572 9.83572C9.88777 9.78409 9.92909 9.72267 9.95729 9.65499C9.98548 9.58731 10 9.51472 10 9.4414C10 9.36809 9.98548 9.2955 9.95729 9.22782C9.92909 9.16014 9.88777 9.09872 9.83572 9.04709ZM1.11076 4.44301C1.11076 3.78396 1.30619 3.1397 1.67234 2.59171C2.0385 2.04372 2.55892 1.61662 3.16781 1.36441C3.77671 1.1122 4.44671 1.04621 5.09311 1.17478C5.7395 1.30336 6.33325 1.62073 6.79928 2.08675C7.2653 2.55278 7.58267 3.14653 7.71125 3.79292C7.83982 4.43932 7.77383 5.10932 7.52162 5.71821C7.26941 6.32711 6.84231 6.84753 6.29432 7.21369C5.74633 7.57984 5.10207 7.77527 4.44301 7.77527C3.55924 7.77527 2.71167 7.4242 2.08675 6.79928C1.46183 6.17436 1.11076 5.32678 1.11076 4.44301Z" fill="#878790" />
    </svg>
);
export const ArrowDownIcon: React.FC<IconProps & { rotate?: boolean }> = ({
    className = '',
    size = 20,
    rotate = false
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 10 6"
        fill="none"
        className={`${className} ${rotate ? 'transition-transform rotate-180' : 'transition-transform'}`}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M0.353516 0.353577L4.85352 4.85358L9.35352 0.353577" stroke="currentColor" />
    </svg>
);
export const FilterIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M9.18376 2.34894C9.22548 2.25814 9.24769 2.1618 9.26396 2.03534C9.36506 1.24934 9.41562 0.85634 9.18514 0.602639C8.95467 0.348938 8.5471 0.348938 7.73196 0.348938H1.96628C1.15114 0.348938 0.74357 0.348938 0.513098 0.602639C0.282625 0.856339 0.333178 1.24934 0.434284 2.03534C0.463812 2.26489 0.512919 2.3952 0.66279 2.57327C1.14694 3.14851 2.03362 4.17174 3.27785 5.10198C3.39155 5.18698 3.46616 5.32591 3.47876 5.47964C3.61892 7.19212 3.74733 8.36199 3.81551 8.93784C3.85127 9.23991 4.18615 9.47225 4.46213 9.27711C4.9257 8.94923 5.79175 8.58179 5.90618 7.97104C5.96028 7.68231 6.03943 7.17836 6.12879 6.34894" stroke="currentColor" strokeWidth="0.697917" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.59912 2.84894V6.34894M9.34912 4.59894L5.84912 4.59894" stroke="currentColor" strokeWidth="0.697917" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const SortIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 9 9" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M0.416504 3.08337L5.30539 3.08342" stroke="currentColor" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.416504 5.75H3.52761" stroke="currentColor" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.416504 0.416687H7.52762" stroke="currentColor" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.30545 8.41671V3.08337M7.30545 8.41671C6.99423 8.41671 6.41279 7.53035 6.19434 7.3056M7.30545 8.41671C7.61666 8.41671 8.1981 7.53035 8.41656 7.3056" stroke="currentColor" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const PlusIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 6H9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 2.5V9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const CalendarLeadIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 2C1.23478 2 0.98043 2.10536 0.792893 2.29289C0.605357 2.48043 0.5 2.73478 0.5 3V12.5C0.5 12.7652 0.605357 13.0196 0.792893 13.2071C0.98043 13.3946 1.23478 13.5 1.5 13.5H12.5C12.7652 13.5 13.0196 13.3946 13.2071 13.2071C13.3946 13.0196 13.5 12.7652 13.5 12.5V3C13.5 2.73478 13.3946 2.48043 13.2071 2.29289C13.0196 2.10536 12.7652 2 12.5 2H10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.5 5.5H13.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 0.5V3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.5 0.5V3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 2H8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const DoublePrevIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11.7265 12L12.6665 11.06L9.61317 8L12.6665 4.94L11.7265 4L7.7265 8L11.7265 12Z" fill="black" />
        <path d="M7.33344 12L8.27344 11.06L5.2201 8L8.27344 4.94L7.33344 4L3.33344 8L7.33344 12Z" fill="black" />
    </svg>
);
export const DoubleNextIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4.2735 4L3.3335 4.94L6.38683 8L3.3335 11.06L4.2735 12L8.2735 8L4.2735 4Z" fill="black" />
        <path d="M8.66656 4L7.72656 4.94L10.7799 8L7.72656 11.06L8.66656 12L12.6666 8L8.66656 4Z" fill="black" />
    </svg>
);
export const TickCorrectIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11.6668 3.5L5.25016 9.91667L2.3335 7" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const TickCorrectBoxIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10.5 5.25V9.5C10.5 9.76522 10.3946 10.0196 10.2071 10.2071C10.0196 10.3946 9.76522 10.5 9.5 10.5H2.5C2.23478 10.5 1.98043 10.3946 1.79289 10.2071C1.60536 10.0196 1.5 9.76522 1.5 9.5V2.5C1.5 2.23478 1.60536 1.98043 1.79289 1.79289C1.98043 1.60536 2.23478 1.5 2.5 1.5H8.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 5.5L6 7L11 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const PhoneIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_274_4591)">
            <path d="M12.8333 9.87002V11.62C12.834 11.7825 12.8007 11.9433 12.7356 12.0921C12.6705 12.241 12.5751 12.3746 12.4554 12.4844C12.3357 12.5943 12.1943 12.6779 12.0404 12.7299C11.8865 12.782 11.7235 12.8013 11.5617 12.7867C9.76665 12.5916 8.04242 11.9783 6.5275 10.9958C5.11807 10.1002 3.92311 8.90528 3.0275 7.49585C2.04166 5.97405 1.42814 4.24143 1.23667 2.43835C1.22209 2.27704 1.24126 2.11446 1.29296 1.96096C1.34466 1.80747 1.42775 1.66642 1.53695 1.54679C1.64615 1.42717 1.77905 1.3316 1.92721 1.26615C2.07537 1.20071 2.23553 1.16684 2.3975 1.16668H4.1475C4.4306 1.1639 4.70505 1.26415 4.9197 1.44874C5.13434 1.63334 5.27455 1.88969 5.31417 2.17002C5.38803 2.73005 5.52501 3.27994 5.7225 3.80918C5.80099 4.01797 5.81797 4.24488 5.77145 4.46303C5.72492 4.68118 5.61684 4.88141 5.46 5.04002L4.71917 5.78085C5.54958 7.24125 6.75877 8.45044 8.21917 9.28085L8.96 8.54002C9.1186 8.38318 9.31884 8.27509 9.53699 8.22857C9.75513 8.18205 9.98205 8.19903 10.1908 8.27752C10.7201 8.475 11.27 8.61199 11.83 8.68585C12.1134 8.72582 12.3722 8.86855 12.5571 9.08689C12.7421 9.30522 12.8404 9.58393 12.8333 9.87002Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
            <clipPath id="clip0_274_4591">
                <rect width="14" height="14" fill="currentColor" />
            </clipPath>
        </defs>
    </svg>
);
export const MailBoxIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_274_4594)">
            <path d="M11.6665 2.33331H2.33317C1.68884 2.33331 1.1665 2.85565 1.1665 3.49998V10.5C1.1665 11.1443 1.68884 11.6666 2.33317 11.6666H11.6665C12.3108 11.6666 12.8332 11.1443 12.8332 10.5V3.49998C12.8332 2.85565 12.3108 2.33331 11.6665 2.33331Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.8332 4.08331L7.60067 7.40831C7.42058 7.52114 7.21236 7.58099 6.99984 7.58099C6.78732 7.58099 6.5791 7.52114 6.399 7.40831L1.1665 4.08331" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
            <clipPath id="clip0_274_4594">
                <rect width="14" height="14" fill="currentColor" />
            </clipPath>
        </defs>
    </svg>
);
export const PhaseChangeIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 2V10" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 14C5.10457 14 6 13.1046 6 12C6 10.8954 5.10457 10 4 10C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6C12 7.5913 11.3679 9.11742 10.2426 10.2426C9.11742 11.3679 7.5913 12 6 12" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const FileIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10.6667 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V5.33333L10.6667 2Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 2V4.66667C10 5.02029 10.1405 5.35943 10.3905 5.60948C10.6406 5.85952 10.9797 6 11.3333 6H14" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const ReplyIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M5.99984 11.3333L2.6665 7.99999L5.99984 4.66666" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.3332 12V10.6667C13.3332 9.95942 13.0522 9.28115 12.5521 8.78105C12.052 8.28095 11.3737 8 10.6665 8H2.6665" stroke="#0074B3" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const ViewConversationIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.26683 13.3333C6.53921 13.986 8.00289 14.1628 9.39409 13.8318C10.7853 13.5009 12.0125 12.6839 12.8547 11.5281C13.6968 10.3723 14.0984 8.9538 13.9872 7.5281C13.876 6.1024 13.2592 4.7633 12.248 3.75212C11.2368 2.74093 9.89775 2.12416 8.47206 2.01293C7.04636 1.90171 5.62781 2.30335 4.47204 3.14549C3.31627 3.98762 2.49929 5.21486 2.16831 6.60607C1.83733 7.99727 2.01412 9.46094 2.66683 10.7333L1.3335 14.6667L5.26683 13.3333Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const CancelIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M6.99984 12.8333C10.2215 12.8333 12.8332 10.2217 12.8332 6.99999C12.8332 3.77833 10.2215 1.16666 6.99984 1.16666C3.77818 1.16666 1.1665 3.77833 1.1665 6.99999C1.1665 10.2217 3.77818 12.8333 6.99984 12.8333Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.75 5.25L5.25 8.75" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.25 5.25L8.75 8.75" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const OpenIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_274_4713)">
            <path d="M6.99984 12.8333C10.2215 12.8333 12.8332 10.2217 12.8332 6.99999C12.8332 3.77833 10.2215 1.16666 6.99984 1.16666C3.77818 1.16666 1.1665 3.77833 1.1665 6.99999C1.1665 10.2217 3.77818 12.8333 6.99984 12.8333Z" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
            <clipPath id="clip0_274_4713">
                <rect width={size} height={size} fill="white" />
            </clipPath>
        </defs>
    </svg>
);
export const ArrowRightDirectionIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M2.9165 7H11.0832" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 2.91667L11.0833 7L7 11.0833" stroke="currentColor" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const SendCRMIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 19 19" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12.667 7.91663C13.7754 7.91663 14.3297 7.91663 14.753 8.13236C15.1254 8.32212 15.4282 8.62485 15.6179 8.99725C15.8337 9.42063 15.8337 9.97488 15.8337 11.0833V13.4583C15.8337 15.3243 15.8337 16.2572 15.254 16.837C14.6743 17.4166 13.7413 17.4166 11.8753 17.4166H7.12533C5.25935 17.4166 4.32636 17.4166 3.74667 16.837C3.16699 16.2572 3.16699 15.3243 3.16699 13.4583V11.0833C3.16699 9.97488 3.16699 9.42063 3.38271 8.99725C3.57246 8.62485 3.87523 8.32212 4.24763 8.13236C4.671 7.91663 5.22522 7.91663 6.33366 7.91663" stroke="currentColor" strokeWidth="1.1875" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 12.6666V3.16663" stroke="currentColor" strokeWidth="1.1875" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.875 4.74998C11.875 4.74998 10.1258 2.37501 9.5 2.375C8.87411 2.37499 7.125 4.75 7.125 4.75" stroke="currentColor" strokeWidth="1.1875" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const AddTaskIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 15 14" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M6.5625 2.06256H14.0625" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" />
        <path d="M6.5625 6.56256H14.0625" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" />
        <path d="M6.5625 11.0626H14.0625" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" />
        <path d="M0.5625 3.10721C0.5625 3.10721 1.3125 3.59606 1.6875 4.31256C1.6875 4.31256 2.8125 1.50006 4.3125 0.562561" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.5625 11.3572C0.5625 11.3572 1.3125 11.8461 1.6875 12.5626C1.6875 12.5626 2.8125 9.75006 4.3125 8.81256" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const AddNoteIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11.625 1.50006V3.75006M4.875 1.50006V3.75006M8.25 1.50006V3.75006" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.25 9.00006V7.87506C14.25 5.40019 14.25 4.16275 13.4812 3.3939C12.7123 2.62506 11.4748 2.62506 9 2.62506H7.5C5.02513 2.62506 3.78769 2.62506 3.01885 3.39391C2.25 4.16275 2.25 5.40019 2.25 7.87506V11.2501C2.25 13.7249 2.25 14.9623 3.01885 15.7312C3.78769 16.5001 5.02513 16.5001 7.5 16.5001H8.25" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.25 11.2501H8.25M5.25 8.25006H11.25" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.8025 16.2395L10.5 16.5L10.7605 15.1975C10.8134 14.9329 10.9435 14.6899 11.1342 14.4992L14.1833 11.4501C14.4501 11.1833 14.8828 11.1833 15.1496 11.4501L15.5499 11.8504C15.8167 12.1172 15.8167 12.5499 15.5499 12.8167L12.5008 15.8658C12.31 16.0565 12.067 16.1866 11.8025 16.2395Z" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const AtRateIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M8.00016 10.6666C9.47292 10.6666 10.6668 9.47274 10.6668 7.99998C10.6668 6.52722 9.47292 5.33331 8.00016 5.33331C6.5274 5.33331 5.3335 6.52722 5.3335 7.99998C5.3335 9.47274 6.5274 10.6666 8.00016 10.6666Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.6668 5.33332V8.66665C10.6668 9.19709 10.8776 9.70579 11.2526 10.0809C11.6277 10.4559 12.1364 10.6667 12.6668 10.6667C13.1973 10.6667 13.706 10.4559 14.0811 10.0809C14.4561 9.70579 14.6668 9.19709 14.6668 8.66665V7.99999C14.6668 6.49819 14.1598 5.04038 13.2278 3.86276C12.2958 2.68514 10.9935 1.8567 9.53186 1.51166C8.07023 1.16662 6.53493 1.32519 5.17468 1.96169C3.81444 2.59818 2.70895 3.67531 2.03732 5.01856C1.3657 6.36181 1.16729 7.89248 1.47424 9.36257C1.78119 10.8327 2.57551 12.1561 3.72852 13.1183C4.88153 14.0806 6.32567 14.6254 7.82696 14.6644C9.32825 14.7034 10.7987 14.2344 12.0002 13.3333" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const CircularCheckMarkIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12.75C8 12.75 9.6 13.6625 10.4 15C10.4 15 12.8 9.75 16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const ShareExportIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12.5V3.33333M10 3.33333L7.08333 6.25M10 3.33333L12.9167 6.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.33333 11.6667V15C3.33333 15.9205 4.07953 16.6667 5 16.6667H15C15.9205 16.6667 16.6667 15.9205 16.6667 15V11.6667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
export const ResetIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C9.67 2.5 11.17 3.22 12.22 4.36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10.5 4.5L12.5 4.5L12.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
