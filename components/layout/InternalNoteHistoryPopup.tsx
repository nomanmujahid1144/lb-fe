'use client';

import React from 'react';
import { FaStickyNote } from 'react-icons/fa';

interface LeadNote {
  content: string;
  date: string;
  creator: string;
}

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  internal_note: LeadNote[];
}

interface InternalNoteHistoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}

const formatTimeAgo = (date: Date | string): string => {
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

export default function InternalNoteHistoryPopup({ isOpen, onClose, prospect }: InternalNoteHistoryPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">
            Internal Note History - {prospect?.first_name} {prospect?.last_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Internal Note History Body */}
        <div className="flex-grow p-6 overflow-y-auto bg-gray-50">
          {prospect?.internal_note && prospect.internal_note.length > 0 ? (
            <div className="space-y-4">
              {prospect.internal_note
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((note, idx) => {
                  const isCustomer = note.creator === 'Customer';
                  return (
                    <div key={idx} className={`flex w-full ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                      <div className={`px-4 py-3 rounded-xl max-w-lg shadow-sm ${isCustomer ? 'bg-gray-200 text-gray-900 rounded-bl-none' : 'bg-leadblocks-navy text-white rounded-br-none'}`}>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className={`flex flex-col items-start mt-2 ${isCustomer ? '' : 'items-end'}`}>
                          <span className={`text-xs font-medium ${isCustomer ? 'text-gray-600' : 'text-gray-200'}`}>
                            {note.creator}
                          </span>
                          <span
                            className={`text-xs ${isCustomer ? 'text-gray-500' : 'text-gray-200'}`}
                            title={new Date(note.date).toLocaleString()}
                          >
                            {formatTimeAgo(note.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center py-8 text-gray-500">
                <FaStickyNote className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No internal note history available for this prospect.</p>
              </div>
            </div>
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
