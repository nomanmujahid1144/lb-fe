'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Pagination from '@/components/layout/Pagination';
import { FaRobot } from "react-icons/fa";
import { FaLinkedin } from 'react-icons/fa';
import { FaExclamationCircle, FaCheckCircle, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { RiResetLeftFill } from 'react-icons/ri';
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import { getBackendUrl } from '@/lib/api-config';
import MultiSelect from '@/components/MultiSelect';
import { ClipLoader } from 'react-spinners';

interface User {
  id: number;
  username: string;
  email: string;
  uuid: string;
  type: string;
}

interface Note {
  id?: string;
  content?: string;
}

interface Profile {
  id: string;
  profile_name: string;
}

interface Campaign {
  id: string;
  profile?: Profile;
}

interface CampaignProspect {
  id: string;
  campaign?: Campaign;
}

interface DataSenderTask {
  id: string;
  documentId: string;
  data_type: string;
  content: string;
  profile_id: string;
  prospect_id: string;
  profile_url: string;
  due_date: string;
  note: Note[];
  data_category: 'robot_task' | 'chatter_task' | 'api_task' | 'backoffice_task';
  campaign_prospect?: CampaignProspect;
  raw_data?: any;
}

// Helper to format due date as relative time
function formatRelativeDueDate(dueDateString: string) {
  if (!dueDateString) return '-';
  const now = new Date();
  const due = new Date(dueDateString);
  const diffMs = due.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMs > 0) {
    if (diffMonths > 0) return `in ${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMin > 0) return `in ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    return 'in a few seconds';
  } else {
    if (diffMonths > 0) return `overdue by ${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    if (diffDays >= 1) return `overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    // Less than 24 hours overdue
    return 'due today';
  }
}

export default function RobotTasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<DataSenderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [selectedDataType, setSelectedDataType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [currentPage, setCurrentPage] = useState(1);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sentFollow, setsentFollow] = useState<Set<string>>(new Set());
  const [sentConnect, setConnect] = useState<Set<string>>(new Set());
  const [revokedConnect, setRevoked] = useState<Set<string>>(new Set());
  const [checkFollowUpSent, setCheckFollowUpSent] = useState<Set<string>>(new Set());
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [disconnectedTasks, setDisconnectedTasks] = useState<Set<string>>(new Set());
  const [contactDetails, setContactDetails] = useState<Record<string, { email: string; phone: string; birthday: string, date_connected: string }>>({});
  const [profileUrlQuery, setProfileUrlQuery] = useState('');
  const pageSize = 10;

  // Server-side pagination state
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPageCount, setServerPageCount] = useState(0);
  const [availableProfileOptions, setAvailableProfileOptions] = useState<Array<{id: number, profile_name: string}>>([]);
  const [availableDataTypeOptions, setAvailableDataTypeOptions] = useState<string[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Inactive period state
  const [isInactivePeriod, setIsInactivePeriod] = useState(false);
  const [allInactivePeriods, setAllInactivePeriods] = useState<any[]>([]);

  // Custom input component for date picker
  const CustomDateInput = React.forwardRef<HTMLDivElement, { value?: string; onClick?: () => void; placeholder?: string }>(
    ({ value, onClick, placeholder }, ref) => (
      <div
        ref={ref}
        className="p-2 border border-gray-300 rounded-md text-xs w-full flex items-center justify-between cursor-pointer"
        onClick={onClick}
      >
        <span>{value || placeholder}</span>
        <FaCalendarAlt className="text-gray-500" />
      </div>
    )
  );

  // Function to check if current date falls within any inactive period for selected profiles
  const checkInactivePeriod = (selectedProfileIds: string[]) => {
    if (selectedProfileIds.length === 0 || allInactivePeriods.length === 0) {
      setIsInactivePeriod(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for date comparison

    // Check if any selected profile has an active inactive period
    const hasActiveInactivePeriod = allInactivePeriods.some(period => {
      // Check if this inactive period belongs to any of the selected profiles
      const profileIds = period.profiles?.map((p: any) => String(p.id)) || [];
      const isForSelectedProfile = selectedProfileIds.some(id => profileIds.includes(id));

      if (!isForSelectedProfile) return false;

      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date

      return today >= startDate && today <= endDate;
    });

    setIsInactivePeriod(hasActiveInactivePeriod);
  };

  // Function to fetch all inactive periods
  const fetchInactivePeriods = async (token: string) => {
    try {
      const backendUrl = getBackendUrl();
      const queryUrl = new URL(`${backendUrl}/api/inactive-periods`);
      queryUrl.searchParams.append("populate", "profiles");

      const response = await fetch(queryUrl.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inactive periods');
      }

      const data = await response.json();
      setAllInactivePeriods(data.data || []);
    } catch (error) {
      console.error('Error fetching inactive periods:', error);
      setAllInactivePeriods([]);
    }
  };

  useEffect(() => {
    const getCookie = (name: string): string | undefined => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    const fetchData = async (token: string) => {
      const backendUrl = getBackendUrl();

      try {
        // Initial load: no filters, page 1
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', String(pageSize));

        const response = await fetch(`${backendUrl}/api/all-robot-tasks?${params.toString()}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch robot tasks');

        const json = await response.json();
        
        setTasks(json.data || []);
        setServerTotal(json.meta?.pagination?.total || 0);
        setServerPageCount(json.meta?.pagination?.pageCount || 0);
        
        // Set available filter options from server
        if (json.meta?.availableFilters) {
          const profiles = json.meta.availableFilters.profiles || [];
          const dataTypes = json.meta.availableFilters.dataTypes || [];
          setAvailableProfileOptions(profiles);
          setAvailableDataTypeOptions(dataTypes);
          // Auto-select all profiles and data types
          setSelectedProfiles(profiles.map((p: any) => String(p.id)));
          setSelectedDataTypes(dataTypes);
        }
        
        setIsInitialLoadDone(true);
        setError(false);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    const token = getCookie('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/auth/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    setLoading(true);
    fetchData(token);
    fetchInactivePeriods(token);
  }, [router]);

  // Shared fetch function used by pagination and applyFilters
  const fetchFiltered = async (page: number) => {
    setLoading(true);
    const getCookie = (name: string): string | undefined => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };
    const token = getCookie('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const backendUrl = getBackendUrl();
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      // Only send profile filter if not all profiles are selected
      if (selectedProfiles.length > 0 && selectedProfiles.length < availableProfileOptions.length) {
        selectedProfiles.forEach(id => params.append('profileIds', id));
      }
      // Only send data type filter if not all types are selected
      if (selectedDataTypes.length > 0 && selectedDataTypes.length < availableDataTypeOptions.length) {
        selectedDataTypes.forEach(dt => params.append('dataTypes', dt));
      }
      if (profileUrlQuery) {
        params.set('profileUrlSearch', profileUrlQuery);
      }
      if (startDate) {
        params.set('startDate', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        params.set('endDate', endDate.toISOString().split('T')[0]);
      }

      const response = await fetch(`${backendUrl}/api/all-robot-tasks?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch robot tasks');

      const json = await response.json();
      setTasks(json.data || []);
      setServerTotal(json.meta?.pagination?.total || 0);
      setServerPageCount(json.meta?.pagination?.pageCount || 0);
      setError(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(true);
      setLoading(false);
    }
  };

  // Re-fetch when page changes (pagination only)
  useEffect(() => {
    if (!isInitialLoadDone) return;
    fetchFiltered(currentPage);
  }, [currentPage]);

  // Apply filters: reset to page 1 and fetch
  const applyFilters = () => {
    if (!isInitialLoadDone) return;
    checkInactivePeriod(selectedProfiles);
    setCurrentPage(1);
    fetchFiltered(1);
  };

  // Check if any filter differs from default (all selected, no search, no date range)
  const isResetNeeded = 
    (availableProfileOptions.length > 0 && selectedProfiles.length !== availableProfileOptions.length) ||
    (availableDataTypeOptions.length > 0 && selectedDataTypes.length !== availableDataTypeOptions.length) ||
    profileUrlQuery.trim() !== '' ||
    startDate !== null ||
    endDate !== null;

  // Reset filters to initial state (all selected) and fetch
  const resetFilters = () => {
    if (!isInitialLoadDone) return;
    setSelectedProfiles(availableProfileOptions.map(p => String(p.id)));
    setSelectedDataTypes([...availableDataTypeOptions]);
    setProfileUrlQuery('');
    setDateRange([null, null]);
    setCurrentPage(1);
    // Fetch with no filters (all selected = no filter params sent)
    const getCookie = (name: string): string | undefined => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };
    const token = getCookie('token');
    if (!token) return;
    const backendUrl = getBackendUrl();
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', String(pageSize));
    fetch(`${backendUrl}/api/all-robot-tasks?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()).then(json => {
      setTasks(json.data || []);
      setServerTotal(json.meta?.pagination?.total || 0);
      setServerPageCount(json.meta?.pagination?.pageCount || 0);
      setError(false);
    }).catch(err => {
      console.error('Error fetching tasks:', err);
      setError(true);
    });
    checkInactivePeriod(availableProfileOptions.map(p => String(p.id)));
  };

  // Set default selections to all after tasks are loaded (only once)
  const hasSetFilterDefaults = useRef(false);
  useEffect(() => {
    if (hasSetFilterDefaults.current) return;
    if (availableProfileOptions.length > 0 && selectedProfiles.length === 0) {
      setSelectedProfiles(availableProfileOptions.map(p => String(p.id)));
    }
    if (availableDataTypeOptions.length > 0 && selectedDataTypes.length === 0) {
      setSelectedDataTypes([...availableDataTypeOptions]);
    }
    if (availableProfileOptions.length > 0 && availableDataTypeOptions.length > 0) {
      hasSetFilterDefaults.current = true;
    }
  }, [availableProfileOptions, availableDataTypeOptions, selectedProfiles.length, selectedDataTypes.length]);

  // Check for inactive periods on initial load
  useEffect(() => {
    if (isInitialLoadDone) {
      checkInactivePeriod(selectedProfiles);
    }
  }, [isInitialLoadDone, allInactivePeriods]);

  //console.log(tasks);
  const uniqueProfiles = availableProfileOptions.map(p => [p.id, p.profile_name] as [number, string]).sort((a, b) => {
    const nameA = a[1] || '';
    const nameB = b[1] || '';
    return nameA.localeCompare(nameB);
  });
  //console.log('Unique Profiles:', uniqueProfiles);
  
  // Get unique data types from server
  const orderedDataTypes = [...availableDataTypeOptions].sort();

  // Server-side pagination - tasks are already filtered and paginated by the backend
  const paginatedTasks = tasks;
  const totalTasks = serverTotal;
  const totalPages = serverPageCount;
  const startIndex = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIndex + pageSize, totalTasks);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages || 1);
  }, [totalPages, currentPage]);

  const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.clear();
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      setUser(null);
      setTasks([]);

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

  // Updated handleSendRequest with async fetch call to your backend
  const handleSendRequest = async (taskId: string) => {
    const taskToSend = tasks.find(t => t.id === taskId);
    if (!taskToSend) return;

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token missing. Please login again.', {
          duration: 4000,
          position: 'top-center',
        });
        router.push('/auth/login');
        return;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/connection_request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskToSend),
      });

      if (!response.ok) {
        throw new Error('Failed to send connection request');
      }

      setSentRequests(prev => new Set(prev).add(taskId));

      toast.success('Connection request sent successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Error sending connection request. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleFollowUp = async (taskId: string) => {
    const taskToSend = tasks.find(t => t.id === taskId);
    if (!taskToSend) return;

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token missing. Please login again.', {
          duration: 4000,
          position: 'top-center',
        });
        router.push('/auth/login');
        return;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/follow_up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskToSend),
      });

      if (!response.ok) {
        throw new Error('Failed to send follow-up');
      }

      setsentFollow(prev => new Set(prev).add(taskId));

      toast.success('Follow-up sent successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error sending follow-up:', error);
      toast.error('Error sending follow-up. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleConnect = async (taskId: string) => {
    const taskToSend = tasks.find(t => t.id === taskId);
    if (!taskToSend) return;

    const contact = contactDetails[taskId] || { email: '', phone: '', birthday: '', date_connected: '' };

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token missing. Please login again.', {
          duration: 4000,
          position: 'top-center',
        });
        router.push('/auth/login');
        return;
      }

      const payload = {
        ...taskToSend,
        email: contact.email,
        phone: contact.phone,
        birthday: contact.birthday,
        date_connected: contact.date_connected,
      };

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to send connection request');
      }

      setConnect(prev => new Set(prev).add(taskId));

      toast.success('Connection confirmation sent successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error sending connect confirmation:', error);
      toast.error('Error sending connect confirmation. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleRevoke = async (taskId: string) => {
    const taskToSend = tasks.find(t => t.id === taskId);
    if (!taskToSend) return;

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token missing. Please login again.', {
          duration: 4000,
          position: 'top-center',
        });
        router.push('/auth/login');
        return;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskToSend),
      });

      if (!response.ok) {
        throw new Error('Failed to send revoke request');
      }

      setRevoked(prev => new Set(prev).add(taskId));

      toast.success('Revoke confirmation sent successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error sending revoke confirmation:', error);
      toast.error('Error sending revoke confirmation. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleCheckFollowUp = async (taskId: string, action: 'sent' | 'not_sent') => {
    const taskToSend = tasks.find(t => t.id === taskId);
    if (!taskToSend) return;

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token missing. Please login again.', {
          duration: 4000,
          position: 'top-center',
        });
        router.push('/auth/login');
        return;
      }

      console.log(taskToSend);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/check_follow_up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, raw_data: taskToSend.raw_data, documentId: taskToSend.documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update check follow-up');
      }

      // Update the state based on the action
      setCheckFollowUpSent(prev => {
        const newSet = new Set(prev);
        if (action === 'sent') {
          newSet.add(taskId);
        } else {
          newSet.delete(taskId);
        }
        return newSet;
      });
      setCheckedTasks(prev => new Set(prev).add(taskId));

      toast.success('Check follow-up updated successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error updating check follow-up:', error);
      toast.error('Error updating check follow-up. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleDisconnect = async (taskId: string) => {
    const taskToSend = tasks.find(t => t.id === taskId);
    if (!taskToSend) return;

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        toast.error('Authentication token missing. Please login again.', {
          duration: 4000,
          position: 'top-center',
        });
        router.push('/auth/login');
        return;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskToSend),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect prospect');
      }

      setDisconnectedTasks(prev => new Set(prev).add(taskId));

      toast.success('Prospect disconnected successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error disconnecting prospect:', error);
      toast.error('Error disconnecting prospect. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-0">
      {/* {user && <Navigation user={user} onLogout={handleLogout} currentPage="Robot Tasks" pageIcon={FaRobot} />} */}

      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          
          <div className="flex flex-col md:flex-row md:items-start gap-4 w-full md:justify-end">
            {/* Profile Select */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={uniqueProfiles
                  .filter(([id]) => id)
                  .map(([id, profile_name]) => ({
                    value: String(id!),
                    label: profile_name!
                  }))}
                selectedValues={selectedProfiles}
                onChange={setSelectedProfiles}
                title="Profiles"
              />
            </div>

            {/* Data Type Select */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={orderedDataTypes.map(dataType => ({
                  value: dataType,
                  label: dataType
                }))}
                selectedValues={selectedDataTypes}
                onChange={setSelectedDataTypes}
                title="Data Types"
              />
            </div>

            {/* Profile URL Search */}
            <div className="w-full md:w-56">
              <input
                id="profileUrlSearch"
                type="text"
                placeholder="Type part of the LinkedIn URL..."
                value={profileUrlQuery}
                onChange={(e) => setProfileUrlQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedProfiles.length > 0 && selectedDataTypes.length > 0) applyFilters(); }}
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder:text-xs focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date Range Picker */}
            <div className="w-full md:w-64">
              <ReactDatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                }}
                customInput={<CustomDateInput placeholder="Select date range" />}
                dateFormat="yyyy-MM-dd"
                isClearable
              />
            </div>

            {/* Apply Filters Button */}
            <div className="w-full md:w-auto flex gap-2">
              <button
                onClick={applyFilters}
                disabled={selectedProfiles.length === 0 || selectedDataTypes.length === 0}
                className={`h-[38px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-200 ${
                  selectedProfiles.length === 0 || selectedDataTypes.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2'
                }`}
                title="Apply Filters"
              >
                <FaFilter className="w-4 h-4" />
              </button>
              <button
                onClick={resetFilters}
                disabled={!isResetNeeded}
                className={`h-[38px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-200 ${
                  isResetNeeded 
                    ? 'hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                title="Reset Filters"
              >
                <RiResetLeftFill className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto bg-white shadow-lg rounded-lg relative">
            {/* Inactive Period Overlay */}
            {isInactivePeriod && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                    <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-md mx-4">
                        <div className="text-2xl mb-4">⚠️</div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Inactive Period</h3>
                        <p className="text-gray-600">Enjoy some time off because no work needs to be done today!</p>
                    </div>
                </div>
            )}

          {loading ? (
              <div className="flex items-center justify-center py-10">
                <ClipLoader color="#47577d" size={50} />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-red-600 text-base md:text-lg">Failed to load tasks.</p>
              </div>
            ) : paginatedTasks.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-gray-600 text-base md:text-lg">No tasks found.</p>
              </div>
            ) : (
            <>
              <div className="flex items-center gap-x-6 bg-gray-100 rounded-md shadow-sm font-semibold text-gray-600 text-sm p-4">
                <div className="w-[200px]">Data Type</div>
                <div className="w-[150px]">Profile URL</div>
                <div className="w-[150px]">Due Date</div>
                <div className="w-[350px]">Content</div>
                <div className="w-[250px]">Actions</div>
              </div>

              {paginatedTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} shadow-md rounded-lg p-4 flex flex-col gap-2 text-sm ${isInactivePeriod ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-start gap-x-6">
                    <div className="w-[200px] font-medium text-gray-900 text-sm self-start">
                      {task.data_type}
                    </div>
                    <div className="w-[150px] text-blue-600 break-all text-xs self-start">
                      {task.profile_url && (
                        <a
                          href={task.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-800"
                          title="View LinkedIn"
                        >
                          <FaLinkedin className="inline-block text-2xl" />
                        </a>
                      )}
                    </div>
                    <div className="w-[150px] self-start">
                      {task.due_date ? (() => {
                        const dueDate = new Date(task.due_date);
                        const now = new Date();
                        const diffMs = now.getTime() - dueDate.getTime();

                        // If in the future → gray
                        if (dueDate > now) {
                          return (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                              {formatRelativeDueDate(task.due_date)}
                            </span>
                          );
                        }

                        // If overdue > 24h → red
                        if (diffMs > 24 * 60 * 60 * 1000) {
                          return (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                              <FaExclamationCircle className="inline-block text-sm" />
                              {formatRelativeDueDate(task.due_date)}
                            </span>
                          );
                        }

                        // Else (overdue <= 24h) → dark green
                        return (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            <FaCheckCircle className="inline-block text-sm" />
                            {formatRelativeDueDate(task.due_date)}
                          </span>
                        );
                      })() : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                          -
                        </span>
                      )}
                    </div>
                    <div className="w-[350px] text-xs self-start">
                      <span
                        className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold cursor-pointer"
                        title={task.content}
                      >
                        {task.content || '-'}
                      </span>
                    </div>
                    <div className="w-[250px] self-start">
                      {
                      task.data_type === 'Connection Request' ? (
                        sentRequests.has(task.id) ? (
                          <button
                            disabled
                            className="btn btn-secondary w-full px-4 py-2 rounded text-sm"
                          >
                            Request Sent
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary w-full px-4 py-2 rounded text-sm"
                            onClick={() => handleSendRequest(task.id)}
                          >
                            Send Request
                          </button>
                        )
                      ) : 
                      task.data_type?.startsWith('Send follow-up') ? (
                        sentFollow.has(task.id) ? (
                          <button
                            disabled
                            className="btn btn-secondary w-full px-4 py-2 rounded text-sm"
                          >
                            {task.data_type.replace('Send ', '')} Sent
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary w-full px-4 py-2 rounded text-sm"
                            onClick={() => handleFollowUp(task.id)}
                          >
                            {task.data_type}
                          </button>
                        )
                      ) : 
                      task.data_type === 'Revoke connection request' ? (
                        <div className="space-y-2">
                          {revokedConnect.has(task.id) ? (
                            <button
                              disabled
                              className="btn btn-secondary w-full px-4 py-2 rounded text-sm"
                            >
                              Revoked
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary w-full px-4 py-2 rounded text-sm"
                              onClick={() => handleRevoke(task.id)}
                            >
                              Revoke
                            </button>
                          )}
                          
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs font-medium text-gray-700 mb-2">Connect Details:</div>
                            <div className="space-y-1">
                              <input
                                type="email"
                                placeholder="Email"
                                value={contactDetails[task.id]?.email || ''}
                                onChange={(e) => setContactDetails(prev => ({
                                  ...prev,
                                  [task.id]: { ...prev[task.id], email: e.target.value }
                                }))}
                                className="w-full p-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="tel"
                                placeholder="Phone"
                                value={contactDetails[task.id]?.phone || ''}
                                onChange={(e) => setContactDetails(prev => ({
                                  ...prev,
                                  [task.id]: { ...prev[task.id], phone: e.target.value }
                                }))}
                                className="w-full p-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                placeholder="Birthday"
                                value={contactDetails[task.id]?.birthday || ''}
                                onChange={(e) => setContactDetails(prev => ({
                                  ...prev,
                                  [task.id]: { ...prev[task.id], birthday: e.target.value }
                                }))}
                                className="w-full p-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="date"
                                placeholder="Date Connected"
                                value={contactDetails[task.id]?.date_connected || ''}
                                onChange={(e) => setContactDetails(prev => ({
                                  ...prev,
                                  [task.id]: { ...prev[task.id], date_connected: e.target.value }
                                }))}
                                className="w-full p-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                            {sentConnect.has(task.id) ? (
                              <button
                                disabled
                                className="btn btn-secondary px-4 py-2 rounded text-sm w-full mt-2"
                              >
                                Connected
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary px-4 py-2 rounded text-sm w-full mt-2"
                                onClick={() => handleConnect(task.id)}
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      ) : task.data_type?.startsWith('Check send follow-up') ? (
                        !checkedTasks.has(task.id) ? (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-primary flex-1 px-4 py-2 rounded text-sm"
                              onClick={() => handleCheckFollowUp(task.id, 'sent')}
                            >
                              Sent
                            </button>
                            <button
                              className="btn btn-secondary flex-1 px-4 py-2 rounded text-sm"
                              onClick={() => handleCheckFollowUp(task.id, 'not_sent')}
                            >
                              Not Sent
                            </button>
                          </div>
                        ) : null
                      ) : null}
                      <div className="mt-2">
                        {disconnectedTasks.has(task.id) ? (
                          <button
                            disabled
                            className="w-full px-4 py-1.5 rounded text-xs border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                          >
                            Disconnected
                          </button>
                        ) : (
                          <button
                            className="w-full px-4 py-1.5 rounded text-xs border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                            onClick={() => handleDisconnect(task.id)}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalTasks}
              itemsPerPage={pageSize}
              onNext={handleNextPage}
              onPrev={handlePrevPage}
              />
          </div>
      </div>
    </div>
  );
}