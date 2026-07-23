'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';
import toast from 'react-hot-toast';

interface Message {
  content: string;
  messageDate: string;
  senderId: string;
}

interface Prospect {
  id?: string;
  first_name?: string;
  last_name?: string;
  prospect_id: string;
  profile_id?: string;
}

interface ChatPopUpProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
  userUuid?: string;
}

const formatTimeAgo = (date: Date | string): string => {
  //console.log(date);
  if (!date) {
    return "unknown time";
  }
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // Check if the date is valid and dateObj exists
  if (!dateObj || isNaN(dateObj.getTime())) {
    return "unknown time";
  }
  
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
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

export default function ChatPopUp({ isOpen, onClose, prospect, userUuid }: ChatPopUpProps) {
  const [chat, setChat] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [noChatFound, setNoChatFound] = useState(false);

  const handleViewChat = async (profileId: string, prospectId: string) => {
    setLoadingChat(true);
    setNoChatFound(false);
    const backendUrl = getBackendUrl();

    const token = getCookie('token');
    if (!token || !userUuid) {
      toast.error('Authentication token is missing. Please log in again.', {
        duration: 4000,
        position: 'top-center',
      });
      setLoadingChat(false);
      return;
    }

    // Helper: get cached chat
    const getCachedChat = async () => {
      const params = new URLSearchParams({
        prospect_id: prospectId,
        customer_id: profileId,
      });
      try {
        const res = await fetch(`${backendUrl}/api/cache/chat?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const cachedData = await res.json();
          if (cachedData.chat !== undefined && cachedData.chat !== null) {
            if (Array.isArray(cachedData.chat) && cachedData.chat.length > 0) {
              return cachedData.chat;
            } else {
              return [];
            }
          }
        }
      } catch (err) {
        // cache unavailable, fall through to API
      }
      return null; // null means "not cached, need to fetch"
    };

    // Helper: cache chat
    const cacheChat = async (chatData: any) => {
      try {
        const res = await fetch(`${backendUrl}/api/cache/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prospect_id: prospectId, customer_id: profileId, chat: chatData }),
        });
      } catch (err) {
        // cache write failed, ignore
      }
    };

    try {
      // 1. Try cache first
      let chatData = await getCachedChat();

      // 2. If not cached, fetch from main API and cache
      if (chatData === null) {
        const apiUrl = `${backendUrl}/api/linked-in-chats?filters[customer_id][$eq]=${profileId}&filters[profile_id][$eq]=${prospectId}&populate=messages`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data?.data?.length > 0 && data.data[0]?.messages?.length > 0) {
          chatData = data.data[0].messages.map((msg: any) => ({
            content: msg.content,
            messageDate: msg.message_date,
            senderId: msg.sender_id,
          })).sort((a: any, b: any) => new Date(a.messageDate).getTime() - new Date(b.messageDate).getTime());
          await cacheChat(chatData);
        } else {
          chatData = [];
          await cacheChat([]);
        }
      }

      // 3. Set chat state
      if (chatData && chatData.length > 0) {
        setChat(chatData);
        setNoChatFound(false);
      } else {
        setChat([]);
        setNoChatFound(true);
      }
    } catch (error) {
      setChat([]);
      setNoChatFound(true);
    } finally {
      setLoadingChat(false);
    }
  };

  // Auto-fetch chat when popup opens
  useEffect(() => {
    if (isOpen && prospect?.profile_id && prospect?.prospect_id) {
      handleViewChat(prospect.profile_id, prospect.prospect_id);
    }
  }, [isOpen, prospect?.profile_id, prospect?.prospect_id, userUuid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">
            Chat with {prospect?.first_name} {prospect?.last_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50">
          {loadingChat ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-600">Loading chat...</p>
            </div>
          ) : noChatFound ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">No chat available for this prospect.</p>
            </div>
          ) : (
            chat.map((msg, index) => {
              const isProspect = msg.senderId === prospect?.prospect_id;
              return (
                <div key={index} className={`flex w-full ${isProspect ? 'justify-start' : 'justify-end'}`}>
                  <div className={`px-4 py-2 rounded-xl max-w-lg ${isProspect ? 'bg-gray-200 text-gray-900 rounded-bl-none' : 'bg-leadblocks-navy text-white rounded-br-none'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p 
                      className={`text-xs mt-1 ${isProspect ? 'text-gray-500 text-left' : 'text-gray-200 text-right'}`}
                      title={new Date(msg.messageDate).toLocaleString()}
                    >
                      {formatTimeAgo(msg.messageDate)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer with close button */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end flex-shrink-0">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
