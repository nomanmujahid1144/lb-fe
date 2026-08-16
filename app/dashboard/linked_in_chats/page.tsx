'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import ChatPopUp from '@/components/layout/ChatPopUp';
import Pagination from '@/components/layout/Pagination';
import { FaRegComments, FaLinkedin, FaUser } from 'react-icons/fa';
import { IoIosChatbubbles } from "react-icons/io";
import { getBackendUrl } from '@/lib/api-config';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';

interface User {
    id: number;
    username: string;
    email: string;
    uuid: string;
    type: string;
}

interface ChatListItem {
    id: string;
    updatedAt: string;
    profile_name: string;
    first_name: string;
    last_name: string;
    linkedin_url: string;
    profile_id: string;
    prospect_id: string;
}

interface Message {
    content: string;
    messageDate: string;
    senderId: string;
    first_name?: string;
    last_name?: string;
}

const parseCustomDate = (dateStr: string): Date | null => {
    // Example input: "14-7-2021, 15:49:23"
    const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4}), (\d{1,2}):(\d{2}):(\d{2})$/);
    if (!match) return null;

    const [_, day, month, year, hour, minute, second] = match.map(Number);
    return new Date(year, month - 1, day, hour, minute, second); // Note: month is 0-based
};


const formatTimeAgo = (input: string | Date): string => {
    let date: Date;

    if (typeof input === 'string') {
        date = new Date(input);
        if (isNaN(date.getTime())) {
            const parsed = parseCustomDate(input);
            if (!parsed || isNaN(parsed.getTime())) {
                console.warn("Invalid date passed to formatTimeAgo:", input);
                return "unknown time";
            }
            date = parsed;
        }
    } else {
        date = input;
    }

    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 5) return "just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 604800;
    if (interval > 1) return Math.floor(interval) + ` week${Math.floor(interval) > 1 ? 's' : ''} ago`;
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ` day${Math.floor(interval) > 1 ? 's' : ''} ago`;
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ` hour${Math.floor(interval) > 1 ? 's' : ''} ago`;
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ` minute${Math.floor(interval) > 1 ? 's' : ''} ago`;

    return Math.floor(seconds) + " seconds ago";
};


export default function LinkedInChatsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [latestChats, setLatestChats] = useState<ChatListItem[]>([]);
    const [latestChatsLoading, setLatestChatsLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedProspect, setSelectedProspect] = useState<any>(null);
    const [latestChatsPage, setLatestChatsPage] = useState(1);
    const latestChatsPageSize = 10; // or whatever number you prefer
    const [selectedProfile, setSelectedProfile] = useState<string>(''); // New filter state
    const [profileUrlQuery, setProfileUrlQuery] = useState('');
    const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; profile_id: string }[]>([]);
    const [hasProfile, setHasProfile] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Fetch user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Redirect non-admins to the dashboard
    useEffect(() => {
      if (user && !['Admin', 'Backoffice', 'Customer'].includes(user.type)) {
          router.push('/dashboard');
      }
    }, [user, router]);

    const getCookie = (name: string): string | undefined => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
    };

    useEffect(() => {

        const fetchUserProfiles = async () => {
            const backendUrl = getBackendUrl();

            try {
                const token = getCookie('token');
                const storedUser = localStorage.getItem('user');
                if (!token || !storedUser) {
                    router.push('/auth/login');
                    return;
                }

                const user = JSON.parse(storedUser);
                setUser(user);

                // 1. Fetch user with their customers and profiles
                const userUuid = user.uuid;
                const userResponse = await fetch(
                    `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?` +
                        new URLSearchParams({
                            'populate[profile]': 'true',
                            'populate[customers][populate][profiles]': 'true',
                        }),
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!userResponse.ok)
                    throw new Error(`Failed to fetch user: ${userResponse.status}`);

                const userData = await userResponse.json();

                const profile = userData.profile;
                if (profile) {
                    setUserProfile(profile);
                    setHasProfile(true);
                    setSelectedProfile(profile.profile_name);
                    setAllProfiles([{
                        id: profile.id.toString(),
                        name: profile.profile_name,
                        profile_id: profile.profile_id
                    }]);
                } else {
                    setHasProfile(false);
                    setUserProfile(null);
                    setSelectedProfile('');
                    setAllProfiles([]);
                }
            } catch (error) {
                console.error('Error fetching user profiles:', error);
                setLatestChats([]);
            }
        };

        fetchUserProfiles();
    }, [router]);

    useEffect(() => {
        if (!hasProfile) {
            setLatestChats([]);
            setLatestChatsLoading(false);
        }
    }, [hasProfile]);

    // Separate effect to load chats when selectedProfile changes
    useEffect(() => {
        if (!selectedProfile || allProfiles.length === 0) return;

        const loadChatsForProfile = async () => {
            setLatestChatsLoading(true);
            const backendUrl = getBackendUrl();

            try {
                const token = getCookie('token');

                // Find the selected profile's profile_id
                const selectedProfileData = allProfiles.find(p => p.name === selectedProfile);
                if (!selectedProfileData) return;

                // 2. Build query URL for linked-in-chats filtered by the selected profile and first_connections_chat flag
                const queryUrl = new URL(`${backendUrl}/api/linked-in-chats`);
                queryUrl.searchParams.append('sort', 'updatedAt:desc');

                // Filter by first_connections_chat flag
                queryUrl.searchParams.append(
                    'filters[first_connections_chat][$eq]',
                    'true'
                );

                // Filter by the selected profile only
                queryUrl.searchParams.append(
                    'filters[profile_prospect][profile][profile_id][$eq]',
                    selectedProfileData.profile_id
                );

                // Populate minimal needed fields
                queryUrl.searchParams.append(
                    'populate[profile_prospect][populate][prospect][fields][0]',
                    'first_name'
                );
                queryUrl.searchParams.append(
                    'populate[profile_prospect][populate][prospect][fields][1]',
                    'last_name'
                );
                queryUrl.searchParams.append(
                    'populate[profile_prospect][populate][prospect][fields][2]',
                    'linkedin_url'
                );
                queryUrl.searchParams.append(
                    'populate[profile_prospect][populate][prospect][fields][3]',
                    'prospect_id'
                );
                queryUrl.searchParams.append(
                    'populate[profile_prospect][populate][profile][fields][0]',
                    'profile_name'
                );
                queryUrl.searchParams.append(
                    'populate[profile_prospect][populate][profile][fields][1]',
                    'profile_id'
                );

                const fourWeeksAgo = new Date();
                fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
                const fourWeeksAgoISO = fourWeeksAgo.toISOString();

                queryUrl.searchParams.append(
                    'filters[updatedAt][$gte]',
                    fourWeeksAgoISO
                );

                let allMessages: any[] = [];
                let page = 1;
                const pageSize = 100;
                let total = 0;

                do {
                    queryUrl.searchParams.set('pagination[page]', page.toString());
                    queryUrl.searchParams.set('pagination[pageSize]', pageSize.toString());

                    const response = await fetch(queryUrl.toString(), {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (!response.ok) throw new Error(`Failed to fetch messages: ${response.status}`);

                    const messagesData = await response.json();
                    allMessages = allMessages.concat(messagesData.data || []);
                    total = messagesData.meta?.pagination?.total || 0;
                    page++;
                } while (allMessages.length < total);

                // Flatten chats as before
                const messages = allMessages.map((chat) => {
                    const prospect = chat?.profile_prospect?.prospect || {};
                    return {
                        id: chat.id,
                        chat_id: chat?.id || null,
                        updatedAt: chat.updatedAt,
                        prospect_id: prospect.prospect_id || null,
                        first_name: prospect.first_name || '',
                        last_name: prospect.last_name || '',
                        linkedin_url: prospect.linkedin_url || '',
                        profile_name: chat?.profile_prospect?.profile?.profile_name || '',
                        profile_id: chat?.profile_prospect?.profile?.profile_id || '',
                    };
                });

                setLatestChats(messages);
                setLatestChatsPage(1); // Reset to first page when loading new profile
            } catch (error) {
                console.error('Error fetching chats for profile:', error);
                setLatestChats([]);
            } finally {
                setLatestChatsLoading(false);
            }
        };

        loadChatsForProfile();
    }, [selectedProfile, allProfiles]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.clear();
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            setUser(null);
            setLatestChats([]);
            setShowPopup(false);
            setSelectedProfile(''); // Reset profile filter
            setHasProfile(false);
            setUserProfile(null);

            toast.success('Successfully logged out!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });

            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            router.push('/auth/login');
        }
    };

    const handleViewChat = (profileId: string, prospectId: string, chatItem: ChatListItem) => {
        // Map ChatListItem to the ChatPopUp Prospect interface
        const prospectForChat = {
            prospect_id: chatItem.prospect_id,
            profile_id: chatItem.profile_id,
            first_name: chatItem.first_name,
            last_name: chatItem.last_name,
        };
        setSelectedProspect(prospectForChat);
        setShowPopup(true);
    };

    // Get unique profiles for filtering (from allProfiles instead of latestChats)
    const uniqueProfiles = allProfiles.map(p => p.name);

    // Filter and sort latestChats by profile (you can add more sorting if needed)
    const filteredLatestChats = latestChats.filter(chat => {
    const matchesProfile = !selectedProfile || chat.profile_name === selectedProfile;
    const matchesUrl =
        !profileUrlQuery ||
        (chat.linkedin_url && chat.linkedin_url.toLowerCase().includes(profileUrlQuery.toLowerCase()));
    return matchesProfile && matchesUrl;
    });

    // Number of chats
    const totalLatestChats = filteredLatestChats.length;

    // Total pages
    const totalLatestChatsPages = Math.ceil(totalLatestChats / latestChatsPageSize);

    // Ensure current page doesn't exceed total pages
    useEffect(() => {
        if (latestChatsPage > totalLatestChatsPages) { setLatestChatsPage(totalLatestChatsPages || 1);}
    }, [totalLatestChatsPages, latestChatsPage]);

    // Slice for current page
    const startIdx = (latestChatsPage - 1) * latestChatsPageSize;
    const endIdx = Math.min(startIdx + latestChatsPageSize, totalLatestChats);
    const paginatedLatestChats = filteredLatestChats.slice(startIdx, endIdx);

    // Handlers for pagination buttons
    const handleLatestChatsPrevPage = () => {
        setLatestChatsPage((p) => Math.max(p - 1, 1));
    };

    const handleLatestChatsNextPage = () => {
        setLatestChatsPage((p) => Math.min(p + 1, totalLatestChatsPages));
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-0">
            {/* {user && <Navigation user={user} onLogout={handleLogout} currentPage="Non-Campaign Chats (last month)" pageIcon={IoIosChatbubbles} />} */}

            <div className="max-w-7xl mx-auto px-6 mt-6">
                <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                        <div className="w-full md:w-56">
                            {hasProfile ? (
                                <div className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm bg-gray-100">
                                    {userProfile.profile_name}
                                </div>
                            ) : (
                                <div className="mt-1 block w-full p-2 border border-red-300 rounded-md shadow-sm text-sm bg-red-50 text-red-700">
                                    Not connected to a profile
                                </div>
                            )}
                        </div>
                        {/* Search bar for LinkedIn URL */}
                        <div className="w-full md:w-56">
                            <input
                            id="profileUrlSearch"
                            type="text"
                            placeholder="Type part of the LinkedIn URL..."
                            value={profileUrlQuery}
                            onChange={e => {
                                setProfileUrlQuery(e.target.value);
                                setLatestChatsPage(1);
                            }}
                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder:text-xs focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="bg-white shadow-lg rounded-lg">
                        <ul className="divide-y divide-gray-200">
                        {!hasProfile ? (
                            <div className="flex items-center justify-center py-10">
                                <p className="text-gray-600 text-base md:text-lg">Not connected to a profile</p>
                            </div>
                        ) : latestChatsLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <ClipLoader color="#47577d" size={50} />
                            </div>
                            ) : latestChats.length === 0 ? (
                            <div className="flex items-center justify-center py-10">
                                <p className="text-gray-600 text-base md:text-lg">No chats found.</p>
                            </div>
                            ) : (
                            paginatedLatestChats.map((chat, idx) => (
                            <li
                                key={chat.id || idx}
                                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} flex flex-col md:flex-row items-start md:items-left px-4 py-4 rounded-lg`}
                            >
                                <div className="flex-1 min-w-0">
                                <div className="font-medium text-lg">
                                    {chat.first_name} {chat.last_name}
                                </div>
                                {chat.linkedin_url && (
                                    <a
                                    href={chat.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                    title="View LinkedIn"
                                    >
                                    <FaLinkedin className="inline-block text-2xl" />
                                    </a>
                                )}
                                <span className="ml-3 inline-block bg-blue-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                                    {formatTimeAgo(new Date(chat.updatedAt))}
                                </span>
                                <span className="ml-3 inline-block bg-blue-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                                    <FaUser className="inline-block text-sm" /> {chat.profile_name}
                                </span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <button
                                        className="btn btn-primary px-6 py-4 rounded text-xs font-semibold w-full flex items-center justify-center gap-2"
                                        onClick={() => handleViewChat(chat.profile_id, chat.prospect_id, chat)}
                                        >
                                        <FaRegComments className="text-lg" />
                                        View Chat
                                    </button>
                                </div>
                            </li>
                            ))
                        )}
                        </ul>
                    </div>

                    {/* Pagination Info and Controls */}
                    {!latestChatsLoading && latestChats.length > 0 && (
                        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between">
                            <Pagination
                                currentPage={latestChatsPage}
                                totalPages={totalLatestChatsPages}
                                totalItems={totalLatestChats}
                                itemsPerPage={latestChatsPageSize}
                                onNext={handleLatestChatsNextPage}
                                onPrev={handleLatestChatsPrevPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Popup Component */}
            <ChatPopUp
                isOpen={showPopup}
                onClose={() => setShowPopup(false)}
                prospect={selectedProspect}
                userUuid={user?.uuid}
            />
        </div>
    );
}