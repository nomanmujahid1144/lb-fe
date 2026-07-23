'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import ChatPopUp from '@/components/layout/ChatPopUp';
import NoteHistoryPopup from '@/components/layout/NoteHistoryPopup';
import Pagination from '@/components/layout/Pagination';
import { FaComments, FaRegComments, FaLinkedin, FaExclamationCircle, FaCheckCircle, FaRegClock, FaFilter } from 'react-icons/fa';
import { RiResetLeftFill } from 'react-icons/ri';
import { CiStickyNote } from "react-icons/ci";
import { MdCampaign } from "react-icons/md";
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
  date?: string;
  creator?: string;
}

interface LeadNote {
  content: string;
  date: string;
  creator: string;
}

interface Profile {
  id: string;
  profile_name: string;
}

interface Message {
    content: string;
    messageDate: string;
    senderId: string;  // This could be used to differentiate between customer and prospect messages.
}

interface Campaign {
  id: string;
  campaign_name?: string;
  profile?: Profile;
}

interface Tag {
  id: string;
  tag_name: string;
  colour: string;
  is_standard: boolean;
  profiles: Profile[];
  campaign_prospects: CampaignProspect[];
}

interface CampaignProspect {
  id: string;
  campaign?: Campaign;
  tags_relation?: Tag[];
}

interface DataSenderTask {
  id: string;
  data_type: string;
  content: string;
  profile_id: string;
  prospect_id: string;
  campaign_id: string; // Ensure your API includes this
  profile_url: string;
  due_date: string;
  first_name: string;
  last_name: string;
  prospect_status: string;
  tags_relation: Tag[];
  note: Note[];
  chatter_notes?: Note[];
  data_category: 'robot_task' | 'chatter_task' | 'api_task';
  campaign_prospect?: CampaignProspect;
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

export default function ChatterTasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<DataSenderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Server-side pagination state
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPageCount, setServerPageCount] = useState(0);
  const [availableProfileOptions, setAvailableProfileOptions] = useState<Array<{id: number, profile_name: string}>>([]);
  const [availableDataTypeOptions, setAvailableDataTypeOptions] = useState<string[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // State for tracking expanded filters
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

  const handleFilterExpandedChange = (filterName: string, isExpanded: boolean) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(filterName);
      } else {
        newSet.delete(filterName);
      }
      return newSet;
    });
  };

  // Store per-task inputs
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const [dateInputs, setDateInputs] = useState<Record<string, string>>({});
  const [tagsInputs, setTagsInputs] = useState<Record<string, string>>({});
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, boolean>>({});
  const [followUpDateInputs, setFollowUpDateInputs] = useState<Record<string, string>>({});
  const [forwardEmailInputs, setForwardEmailInputs] = useState<Record<string, string>>({});
  const [forwardPhoneInputs, setForwardPhoneInputs]= useState<Record<string, string>>({});
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({});
  const [sentMessages, setSentMessages] = useState<Set<string>>(new Set());
  const [sentForwards, setSentForwards] = useState<Set<string>>(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [profileUrlQuery, setProfileUrlQuery] = useState('');
  const [disconnectedTasks, setDisconnectedTasks] = useState<Set<string>>(new Set());
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [selectedNote, setSelectedNote] = useState<LeadNote[]>([]);
  const [selectedNoteTitle, setSelectedNoteTitle] = useState<string>('');
  
  // New state for tags management
  const [availableTags, setAvailableTags] = useState<Record<string, Tag[]>>({});
  const [taskTags, setTaskTags] = useState<Record<string, Tag[]>>({});
  const [showTagSelector, setShowTagSelector] = useState<Record<string, boolean>>({});

  // Campaign content popup state
  const [campaignContentPopupOpen, setCampaignContentPopupOpen] = useState(false);
  const [campaignContentPopupContent, setCampaignContentPopupContent] = useState<any[]>([]);
  const [campaignContentPopupTitle, setCampaignContentPopupTitle] = useState<string>("");

  // Inactive period state
  const [isInactivePeriod, setIsInactivePeriod] = useState(false);
  const [allInactivePeriods, setAllInactivePeriods] = useState<any[]>([]);

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
      try {
        const backendUrl = getBackendUrl();

        // Initial load: no filters, page 1
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', String(pageSize));

        const response = await fetch(`${backendUrl}/api/all-chatter-tasks?${params.toString()}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch chatter tasks');
        }

        const json = await response.json();
        const tasksData = json.data || [];

        // Initialize task tags from the enriched data
        const initialTaskTags: Record<string, Tag[]> = {};
        tasksData.forEach((task: DataSenderTask) => {
          initialTaskTags[task.id] = task.campaign_prospect?.tags_relation || [];
        });
        setTaskTags(initialTaskTags);

        // Get unique profile IDs from available filters for tag fetching
        const profileIds: string[] = (json.meta?.availableFilters?.profiles || []).map((p: any) => String(p.id));

        // Fetch all available tags once (keep this for tag management)
        const allTags = await fetchAllAvailableTags(token);
        const profileTagsMap: Record<string, Tag[]> = {};
        profileIds.forEach((profileId) => {
          const profileIdStr = String(profileId);
          const tagsForProfile = allTags.filter((tag: Tag) => 
            tag.profiles && tag.profiles.some((profile: Profile) => String(profile.id) === profileIdStr)
          );
          profileTagsMap[profileIdStr] = tagsForProfile;
        });
        setAvailableTags(profileTagsMap);

        setTasks(tasksData);
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

      const response = await fetch(`${backendUrl}/api/all-chatter-tasks?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch chatter tasks');

      const json = await response.json();
      const tasksData = json.data || [];

      // Initialize task tags for new page
      const initialTaskTags: Record<string, Tag[]> = {};
      tasksData.forEach((task: DataSenderTask) => {
        initialTaskTags[task.id] = task.campaign_prospect?.tags_relation || [];
      });
      setTaskTags(prev => ({ ...prev, ...initialTaskTags }));

      setTasks(tasksData);
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

  // Check if any filter differs from default (all selected, no search)
  const isResetNeeded = 
    (availableProfileOptions.length > 0 && selectedProfiles.length !== availableProfileOptions.length) ||
    (availableDataTypeOptions.length > 0 && selectedDataTypes.length !== availableDataTypeOptions.length) ||
    profileUrlQuery.trim() !== '';

  // Reset filters to initial state (all selected) and fetch
  const resetFilters = () => {
    if (!isInitialLoadDone) return;
    setSelectedProfiles(availableProfileOptions.map(p => String(p.id)));
    setSelectedDataTypes([...availableDataTypeOptions]);
    setProfileUrlQuery('');
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
    fetch(`${backendUrl}/api/all-chatter-tasks?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()).then(json => {
      const tasksData = json.data || [];
      const initialTaskTags: Record<string, Tag[]> = {};
      tasksData.forEach((task: DataSenderTask) => {
        initialTaskTags[task.id] = task.campaign_prospect?.tags_relation || [];
      });
      setTaskTags(prev => ({ ...prev, ...initialTaskTags }));
      setTasks(tasksData);
      setServerTotal(json.meta?.pagination?.total || 0);
      setServerPageCount(json.meta?.pagination?.pageCount || 0);
      setError(false);
    }).catch(err => {
      console.error('Error fetching tasks:', err);
      setError(true);
    });
    checkInactivePeriod(availableProfileOptions.map(p => String(p.id)));
  };

  // Set default selections to all after filter options are loaded (only once)
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


  // Fetch all available tags
  const fetchAllAvailableTags = async (token: string) => {
    try {
      // Define helper function to fetch a page of tags
      const fetchTagsPage = async (page: number, pageSize: number) => {
        const backendUrl = getBackendUrl();
        const queryUrl = new URL(`${backendUrl}/api/tags`);
        queryUrl.searchParams.append("fields[0]", "id");
        queryUrl.searchParams.append("fields[1]", "tag_name");
        queryUrl.searchParams.append("fields[2]", "colour");
        queryUrl.searchParams.append("fields[3]", "is_standard");
        queryUrl.searchParams.append("populate[profiles][fields][0]", "id");
        // Set pagination parameters
        queryUrl.searchParams.append("pagination[page]", page.toString());
        queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

        const response = await fetch(queryUrl.toString(), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tags on page ${page}`);
        }

        return await response.json();
      };

      // First, try to get all tags at once with a large limit
      const pageSize = 100; // Use a large page size
      const firstPageData = await fetchTagsPage(1, pageSize);

      let allTags: any[] = [...(firstPageData.data || [])];

      // Check if we need to fetch more pages
      const pagination = firstPageData.meta?.pagination;
      if (pagination && pagination.pageCount > 1) {
        // Fetch all remaining pages in parallel
        const remainingPagePromises: Promise<any>[] = [];
        for (let page = 2; page <= pagination.pageCount; page++) {
          remainingPagePromises.push(fetchTagsPage(page, pageSize));
        }

        const remainingPagesData = await Promise.all(remainingPagePromises);

        // Combine all pages
        remainingPagesData.forEach(pageData => {
          allTags = [...allTags, ...(pageData.data || [])];
        });
      }

      return allTags;
    } catch (error) {
      console.error('Error fetching all available tags:', error);
    }
    return [];
  };



  // Add tag to task (local only)
  const addTagToTask = (taskdocumentId: string, tag: Tag) => {
    setTaskTags(prev => ({
      ...prev,
      [taskdocumentId]: [...(prev[taskdocumentId] || []), tag]
    }));
    
    // Close the tag selector
    setShowTagSelector(prev => ({ ...prev, [taskdocumentId]: false }));
  };

  // Remove tag from task (local only)
  const removeTagFromTask = (taskdocumentId: string, tagId: string) => {
    setTaskTags(prev => ({
      ...prev,
      [taskdocumentId]: (prev[taskdocumentId] || []).filter(tag => tag.id !== tagId)
    }));
  };

  // Load available tags when tasks are loaded
  useEffect(() => {
      if (user && !['Admin', 'Chatter'].includes(user.type)) {
          router.push('/dashboard');
      }
  }, [user, router]);

   const uniqueProfiles = availableProfileOptions.map(p => [p.id, p.profile_name] as [number, string]).sort((a, b) => {
    const nameA = a[1] || '';
    const nameB = b[1] || '';
    return nameA.localeCompare(nameB);
  });

  const uniqueDataTypes = [...availableDataTypeOptions].sort();

  // Server-side pagination - tasks are already filtered and paginated by the backend
  const paginatedTasks = tasks;
  const totalTasks = serverTotal;
  const totalPages = serverPageCount;

  // Additional safety check: deduplicate paginated tasks by ID
  const deduplicatedPaginatedTasks = paginatedTasks.filter((task, index, self) =>
    index === self.findIndex(t => t.id === task.id)
  );

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
      setShowPopup(false); // Close chat popup if it's open

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

  const handleSendMessage = async (taskdocumentId: string) => {
    const taskToSend = tasks.find(t => t.id === taskdocumentId);
    if (!taskToSend) return;

    const message = messageInputs[taskdocumentId] || '';
    const dateSent = dateInputs[taskdocumentId] || '';
    const followUpDate = followUpDateInputs[taskdocumentId] || '';
    const additionalTags = tagsInputs[taskdocumentId] || '';
    const followUp = followUpInputs[taskdocumentId] || false;

    // Validation: If message is filled, dateSent must be filled
    if (message && !dateSent) {
        toast.error('Please fill in the date sent when you provide a message.', {
            duration: 4000,
            position: 'top-center',
        });
        return;
    }

    // Validation: If followUp is checked, followUpDate must be filled
    if (followUp && !followUpDate) {
        toast.error('Please fill in the follow-up date.', {
            duration: 4000,
            position: 'top-center',
        });
        return;
    }

    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      toast.error('No token found.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    const task = tasks.find(t => t.id === taskdocumentId);
    if (!task) {
      toast.error('Task not found.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    // Get selected tags (no need for tag names, only IDs)
    const selectedTags = taskTags[taskdocumentId] || [];

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/message_sent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...taskToSend,
          documentId: taskdocumentId,
          prospect_id: task.prospect_id,
          campaign_id: task.campaign_id,
          message,
          date_sent: dateSent,
          selected_tag_ids: selectedTags.map(tag => tag.id), // Only send tag IDs
          follow_up: followUp,
          follow_up_date: followUp ? followUpDate : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Mark as sent
      setSentMessages((prev) => new Set(prev).add(taskdocumentId));
      // Clear form data
      setMessageInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setDateInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setTagsInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setFollowUpInputs(prev => ({ ...prev, [taskdocumentId]: false }));
      setFollowUpDateInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setTaskTags(prev => ({ ...prev, [taskdocumentId]: [] })); // Clear selected tags
      toast.success('Message sent successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
      // Optionally refresh data
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleForwardToClient = async (taskdocumentId: string) => {
    const taskToSend = tasks.find(t => t.id === taskdocumentId);
    if (!taskToSend) return;

    const email = forwardEmailInputs[taskdocumentId] || '';
    const phone = forwardPhoneInputs[taskdocumentId] || '';
    const additionalTags = tagsInputs[taskdocumentId] || '';

    if (!email || !phone) {
      toast.error('Please fill in both email and phone number.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      toast.error('Authentication token is missing. Please log in again.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    const task = tasks.find(t => t.id === taskdocumentId);
    if (!task) {
      toast.error('Task not found.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    // Get selected tags (no need for tag names, only IDs)
    const selectedTags = taskTags[taskdocumentId] || [];

    const requestBody = {
      ...taskToSend,
      documentId: taskdocumentId,
      prospect_id: task.prospect_id,
      campaign_id: task.campaign_id,
      email,
      phone,
      selected_tag_ids: selectedTags.map(tag => tag.id), // Only send tag IDs
    };
    // console.log('Forwarding to client - request body:', requestBody);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/forward_to_client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to forward to client');

      setSentForwards(prev => new Set(prev).add(taskdocumentId));
      // Clear form data
      setForwardEmailInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setForwardPhoneInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setTagsInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setTaskTags(prev => ({ ...prev, [taskdocumentId]: [] })); // Clear selected tags
      toast.success('Forwarded to client successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (err) {
      console.error('Error forwarding to client:', err);
      toast.error('Failed to forward to client.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleBackinCampaign = async (taskdocumentId: string) => {
    const taskToSend = tasks.find(t => t.id === taskdocumentId);
    if (!taskToSend) return;

    const email = forwardEmailInputs[taskdocumentId] || '';
    const phone = forwardPhoneInputs[taskdocumentId] || '';
    const additionalTags = tagsInputs[taskdocumentId] || '';

    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      toast.error('No token found.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    const task = tasks.find(t => t.id === taskdocumentId);
    if (!task) {
      toast.error('Task not found.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    // Get selected tags (no need for tag names, only IDs)
    const selectedTags = taskTags[taskdocumentId] || [];

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/data-senders/back_campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...taskToSend,
          documentId: taskdocumentId,
          prospect_id: task.prospect_id,
          campaign_id: task.campaign_id,
          email,
          phone,
          selected_tag_ids: selectedTags.map(tag => tag.id), // Only send tag IDs
        }),
      });

      if (!response.ok) throw new Error('Failed to send back to campaign');

      setSentForwards(prev => new Set(prev).add(taskdocumentId));
      // Clear form data
      setTagsInputs(prev => ({ ...prev, [taskdocumentId]: '' }));
      setTaskTags(prev => ({ ...prev, [taskdocumentId]: [] })); // Clear selected tags
      toast.success('Sent back to campaign successfully!', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (err) {
      console.error('Error sending back to campaign:', err);
      toast.error('Failed to send back to campaign.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const handleDisconnect = async (taskdocumentId: string) => {
    const taskToSend = tasks.find(t => t.id === taskdocumentId);
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
        body: JSON.stringify({
          ...taskToSend,
          documentId: taskdocumentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect prospect');
      }

      setDisconnectedTasks(prev => new Set(prev).add(taskdocumentId));

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

  const handleViewChat = (profileId: string, prospectId: string, datasender: DataSenderTask) => {
    // Map DataSenderTask to the ChatPopUp Prospect interface
    const prospectForChat = {
      prospect_id: datasender.prospect_id,
      profile_id: datasender.profile_id,
      first_name: datasender.first_name,
      last_name: datasender.last_name,
    };
    setSelectedProspect(prospectForChat);
    setShowPopup(true);
  };

  const handleViewNote = (notes: Note[], title: string) => {
    // Filter out notes with undefined content and cast to LeadNote
    const filteredNotes: LeadNote[] = notes
      .filter(note => note.content !== undefined && note.date !== undefined && note.creator !== undefined)
      .map(note => ({
        content: note.content!,
        date: note.date!,
        creator: note.creator!
      }));
    setSelectedNote(filteredNotes);
    setSelectedNoteTitle(title);
    setShowNotePopup(true);
  };

  const handleShowCampaignContent = async (campaignName: string) => {
    const getCookie = (name: string): string | undefined => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    try {
      const token = getCookie('token');
      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/campaigns?filters[campaign_name][$eq]=${encodeURIComponent(campaignName)}&populate=Content`,
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch campaign content');
      const data = await response.json();
      // Strapi v5 returns data.data[0].Content
      const contentArr = (data.data && data.data[0] && data.data[0].Content) ? data.data[0].Content : [];
      setCampaignContentPopupContent(contentArr);
      setCampaignContentPopupTitle(campaignName);
      setCampaignContentPopupOpen(true);
    } catch (err) {
      setCampaignContentPopupContent([]);
      setCampaignContentPopupTitle(campaignName);
      setCampaignContentPopupOpen(true);
    }
  };

  // Component for tag management
  const TagManager = ({ taskdocumentId, task }: { taskdocumentId: string; task: DataSenderTask }) => {
    const currentTags = taskTags[taskdocumentId] || [];
    const profileId = task.campaign_prospect?.campaign?.profile?.id;
    const availableTagsForProfile = profileId ? (availableTags[profileId] || []) : [];
    const isShowingSelector = showTagSelector[taskdocumentId] || false;

    // Define color order for sorting
    const colorOrder = ['#018531', '#b8860b', '#960303'];

    // Filter available tags to exclude already selected ones
    const filteredTags = availableTagsForProfile.filter(
      availableTag => !currentTags.some(currentTag => currentTag.id === availableTag.id)
    );

    // Sort tags by color order
    const selectableTags = filteredTags.sort((a, b) => {
      const colorA = a.colour?.toLowerCase();
      const colorB = b.colour?.toLowerCase();
      
      const indexA = colorOrder.findIndex(color => color.toLowerCase() === colorA);
      const indexB = colorOrder.findIndex(color => color.toLowerCase() === colorB);
      
      // If both colors are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only A is in the order array, A comes first
      if (indexA !== -1 && indexB === -1) {
        return -1;
      }
      
      // If only B is in the order array, B comes first
      if (indexA === -1 && indexB !== -1) {
        return 1;
      }
      
      // If neither is in the order array, sort alphabetically by tag name
      return (a.tag_name || '').localeCompare(b.tag_name || '');
    });

    return (
      <div className="space-y-2">
        {/* Current Tags Display with inline Plus Button */}
        <div className="flex flex-wrap items-center gap-1">
          {currentTags.length > 0 ? (
            currentTags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.colour || '#6B7280' }}
              >
                {tag.tag_name}
                <button
                  onClick={() => removeTagFromTask(taskdocumentId, tag.id)}
                  className="hover:bg-black hover:bg-opacity-20 rounded-full p-0.5 ml-1"
                  title="Remove tag"
                  type="button"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 italic text-xs">No tag(s) selected</span>
          )}
          
          {/* Plus Button - inline with tags */}
          <button
            onClick={() => setShowTagSelector(prev => ({ ...prev, [taskdocumentId]: !isShowingSelector }))}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors"
            title={isShowingSelector ? 'Cancel' : 'Add Tag(s)'}
            type="button"
          >
            {isShowingSelector ? '×' : '+'}
          </button>
        </div>

        {/* Tag Selector - Show available tags as widgets */}
        {isShowingSelector && (
          <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
            {selectableTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectableTags.map(tag => (
                  <button
                    key={String(tag.id)}
                    onClick={() => addTagToTask(taskdocumentId, tag)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: tag.colour || '#6B7280' }}
                    title={`Add ${tag.tag_name}`}
                    type="button"
                  >
                    {tag.tag_name}
                    <span className="text-xs">+</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                {availableTagsForProfile.length === 0 
                  ? 'No tags available for this profile'
                  : 'No more tags available'
                }
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

return (
    <div className="min-h-screen bg-gray-50">
        {user && <Navigation user={user} onLogout={handleLogout} currentPage="Chatter Tasks" pageIcon={FaComments} />}

        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-start gap-4 w-full md:justify-end">
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
                    onExpandedChange={(isExpanded) => handleFilterExpandedChange('profiles', isExpanded)}
                  />
                </div>
                <div className="w-full md:w-56">
                  <MultiSelect
                    options={uniqueDataTypes.map(type => ({
                      value: type,
                      label: type
                    }))}
                    selectedValues={selectedDataTypes}
                    onChange={setSelectedDataTypes}
                    title="Type"
                    onExpandedChange={(isExpanded) => handleFilterExpandedChange('type', isExpanded)}
                  />
                </div>
                {/* Apply & Reset Filters Buttons */}
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

        <div className="overflow-x-auto bg-gray-50 shadow-lg rounded-lg pb-4 relative">
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
                {/* Table Header */}
                <div className="bg-white shadow-md rounded-t-lg border border-gray-200 overflow-x-auto">
                    <div className="grid grid-cols-12 gap-3 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm items-center">
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Name</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-1">Profile</div>
                        <div className="col-span-2">Due Date</div>
                        <div className="col-span-1 flex items-center justify-center">
                            <div className="p-1 cursor-default" title="Campaign">
                                <MdCampaign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                            <div className="p-1 cursor-default" title="LinkedIn URL">
                                <FaLinkedin className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>
                </div>

                {/* Task Cards */}
                <div className="space-y-6 bg-gray-50 rounded-b-lg">
                    {deduplicatedPaginatedTasks.map((task, idx) => (
                    <div key={task.id} className={`bg-white shadow-md rounded-lg border border-gray-200 mx-1 first:mt-4 last:mb-4 ${isInactivePeriod ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Main Task Row */}
                        <div className="grid grid-cols-12 gap-3 p-4 items-center">
                            <div className="col-span-2">
                                <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs">
                                    {task.data_type}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-700 font-medium text-sm">
                                    {`${task.first_name || ''} ${task.last_name || ''}`.trim() || 'Unknown'}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-600 text-xs px-1 py-0.5 bg-gray-50 rounded text-xs leading-tight">
                                    {task.prospect_status}
                                </span>
                            </div>
                            <div className="col-span-1">
                                <span className="text-gray-600 text-xs">
                                    {task.campaign_prospect?.campaign?.profile?.profile_name || '-'}
                                </span>
                            </div>
                            <div className="col-span-2">
                                {task.due_date ? (() => {
                                    const now = new Date();
                                    const dueDate = new Date(task.due_date);
                                    const diffMs = now.getTime() - dueDate.getTime();
            
                                    if (diffMs < 0) {
                                        return (
                                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                                                <FaRegClock className="inline-block text-sm" />
                                                {formatRelativeDueDate(task.due_date)}
                                            </span>
                                        );
                                    }
            
                                    if (diffMs > 24 * 60 * 60 * 1000) {
                                        return (
                                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                                                <FaExclamationCircle className="inline-block text-sm" />
                                                {formatRelativeDueDate(task.due_date)}
                                            </span>
                                        );
                                    }
            
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
                            <div className="col-span-1 flex justify-center">
                                {task.campaign_prospect?.campaign ? (
                                    <button
                                        onClick={() => {
                                            const campaignName = task.campaign_prospect?.campaign?.campaign_name || 
                                                                task.campaign_prospect?.campaign?.id || 
                                                                task.campaign_id || 
                                                                'Unknown Campaign';
                                            handleShowCampaignContent(campaignName);
                                        }}
                                        style={{ color: '#374570' }}
                                        className="hover:text-blue-700 p-1"
                                        title={`${task.campaign_prospect?.campaign?.campaign_name || task.campaign_id || 'Unknown Campaign'}`}
                                    >
                                        <MdCampaign className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                )}
                            </div>
                            <div className="col-span-1 flex justify-center">
                                {task.profile_url ? (
                                    <a
                                        href={task.profile_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                        title="View LinkedIn"
                                    >
                                        <FaLinkedin className="inline-block text-lg" />
                                    </a>
                                ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                )}
                            </div>
                            <div className="col-span-1">
                                <div className="flex items-center gap-2 justify-end">
                                    {task.chatter_notes && task.chatter_notes.length > 0 && (
                                        <button
                                            className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm font-semibold btn flex items-center gap-1 hover:bg-blue-200 transition-colors border border-blue-200"
                                            onClick={() => handleViewNote(task.chatter_notes || [], `Chatter Note History - ${task.first_name} ${task.last_name}`)}
                                            title="View Chatter Note History"
                                        >
                                            <CiStickyNote className="text-lg text-white" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-primary px-6 py-4 rounded text-xs font-semibold w-full flex items-center justify-center gap-2"
                                        onClick={() => handleViewChat(task.profile_id, task.prospect_id, task)}
                                    >
                                        <FaRegComments className="text-lg" />
                                        Chat
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Task Actions */}
                        <div className="p-4">
                            <div className="mt-4 space-y-3">
                                {/* Action Selection Dropdown */}
                                <div className="relative">
                                    <select
                                        onChange={(e) => {
                                            const selectedAction = e.target.value;
                                            setSelectedActions((prev) => ({
                                                ...prev,
                                                [task.id]: selectedAction,
                                            }));
                                        }}
                                        value={selectedActions[task.id] || ""}
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                                    >
                                        <option value="">-- Select Action --</option>
                                        <option value="send_message">Send Message</option>
                                        <option value="forward_client">Forward to Client</option>
                                        <option value="back_campaign">Back in Campaign</option>
                                        <option value="disconnect">Disconnect Prospect</option>
                                    </select>
                                </div>

                                {/* Send Message Section */}
                                {selectedActions[task.id] === "send_message" && (
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <form className="space-y-3" onSubmit={e => { e.preventDefault(); handleSendMessage(task.id); }}>
                                            {/* Message + Date Row */}
                                            <div className="flex flex-col md:flex-row gap-4 items-start mb-8">
                                                <textarea
                                                    value={messageInputs[task.id] || ""}
                                                    onChange={(e) =>
                                                        setMessageInputs((prev) => ({
                                                            ...prev,
                                                            [task.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="Message to send..."
                                                    className="w-full md:w-2/3 rounded-lg border border-gray-300 bg-white p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                                                    rows={3}
                                                />
                                                <input
                                                    type="date"
                                                    value={dateInputs[task.id] || ""}
                                                    onChange={(e) =>
                                                        setDateInputs((prev) => ({
                                                            ...prev,
                                                            [task.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full md:w-1/3 rounded-lg border border-gray-300 bg-white p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                                                />
                                            </div>
                                            {/* Tags Row */}
                                            <div className="flex flex-col gap-2 mb-8 w-full">
                                                <TagManager taskdocumentId={task.id} task={task} />
                                            </div>
                                            {/* Follow-up Row */}
                                            <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={followUpInputs[task.id] || false}
                                                        onChange={(e) =>
                                                            setFollowUpInputs((prev) => ({
                                                                ...prev,
                                                                [task.id]: e.target.checked,
                                                            }))
                                                        }
                                                        className="rounded border-gray-300 focus:ring-primary"
                                                    />
                                                    Follow-up needed
                                                </label>
                                                {followUpInputs[task.id] && (
                                                    <input
                                                        type="date"
                                                        value={followUpDateInputs[task.id] || ""}
                                                        onChange={(e) =>
                                                            setFollowUpDateInputs((prev) => ({
                                                                ...prev,
                                                                [task.id]: e.target.value,
                                                            }))
                                                        }
                                                        className="rounded-lg border border-gray-300 bg-white p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                                                    />
                                                )}
                                            </div>
                                            {/* Send Button Row */}
                                            <div className="flex justify-end w-full">
                                                <button
                                                    type="submit"
                                                    disabled={sentMessages.has(task.id)}
                                                    className={`btn px-4 py-2 rounded text-sm ${
                                                        sentMessages.has(task.id) ? "btn-secondary" : "btn-primary"
                                                    }`}
                                                >
                                                    {sentMessages.has(task.id) ? "Message Sent" : "Send Message"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Forward to client section */}
                                {selectedActions[task.id] === "forward_client" && (
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="space-y-3">
                                            {/* Email and Phone */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input
                                                    type="email"
                                                    placeholder="Prospect email"
                                                    value={forwardEmailInputs[task.id] || ""}
                                                    onChange={(e) =>
                                                        setForwardEmailInputs((prev) => ({
                                                            ...prev,
                                                            [task.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                                                />
                                                <input
                                                    type="tel"
                                                    placeholder="Prospect phone"
                                                    value={forwardPhoneInputs[task.id] || ""}
                                                    onChange={(e) =>
                                                        setForwardPhoneInputs((prev) => ({
                                                            ...prev,
                                                            [task.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                                                />
                                            </div>

                                            {/* Tags Section */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                                <TagManager taskdocumentId={task.id} task={task} />
                                            </div>

                                            {/* Forward button */}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleForwardToClient(task.id)}
                                                    disabled={sentForwards.has(task.id)}
                                                    className={`btn px-6 py-2 rounded-lg text-sm font-medium ${
                                                        sentForwards.has(task.id) ? "btn-secondary" : "btn-primary"
                                                    }`}
                                                >
                                                    {sentForwards.has(task.id) ? "Sent to Client" : "Forward to Client"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Back in campaign*/}
                                {selectedActions[task.id] === "back_campaign" && (
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="space-y-3">
                                            {/* Tags Section */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                                <TagManager taskdocumentId={task.id} task={task} />
                                            </div>
                                        
                                            {/* Back in campaign button */}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleBackinCampaign(task.id)}
                                                    disabled={sentForwards.has(task.id)}
                                                    className={`btn px-6 py-2 rounded-lg text-sm font-medium ${
                                                        sentForwards.has(task.id) ? "btn-secondary" : "btn-primary"
                                                    }`}
                                                >
                                                    {sentForwards.has(task.id) ? "Sent back to campaign" : "Send back to campaign"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Disconnect Prospect */}
                                {selectedActions[task.id] === "disconnect" && (
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-600">
                                                When a URL is not valid anymore or the prospect disconnected, you can use this action to disconnect the prospect from the campaign.
                                            </p>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleDisconnect(task.id)}
                                                    disabled={disconnectedTasks.has(task.id)}
                                                    className={`btn px-6 py-2 rounded-lg text-sm font-medium text-white ${
                                                        disconnectedTasks.has(task.id) ? "btn-secondary" : "btn-danger"
                                                    }`}
                                                >
                                                    {disconnectedTasks.has(task.id) ? "Disconnected" : "Disconnect"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
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

        {/* Chat Popup Component */}
        <ChatPopUp
            isOpen={showPopup}
            onClose={() => setShowPopup(false)}
            prospect={selectedProspect}
            userUuid={user?.uuid}
        />

        {showNotePopup && (
            <NoteHistoryPopup
                isOpen={showNotePopup}
                onClose={() => setShowNotePopup(false)}
                notes={selectedNote}
                title={selectedNoteTitle}
            />
        )}

        {/* Campaign Content Popup */}
        {campaignContentPopupOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                        <h2 className="text-lg font-bold text-gray-800">
                            Content for {campaignContentPopupTitle}
                        </h2>
                        <button onClick={() => setCampaignContentPopupOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
    
                    {/* Chat Body */}
                    <div className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50">
                        {campaignContentPopupContent.length === 0 ? (
                            <div className="flex justify-center items-center h-full">
                                <p className="text-gray-500">No content found for this campaign.</p>
                            </div>
                        ) : (
                            campaignContentPopupContent.map((msg: any, idx: number) => {
                                // All bubbles right-aligned
                                return (
                                    <div key={idx} className="flex w-full justify-end">
                                        <div className="px-4 py-2 rounded-xl max-w-lg bg-leadblocks-navy text-white rounded-br-none">
                                            <div className="text-sm whitespace-pre-line">{msg.message_content}</div>
                                            {msg.message_delay !== undefined && (
                                                <div className="text-xs mt-1 text-gray-200 text-right">
                                                    Delay: {msg.message_delay} days
                                                </div>
                                            )}
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
                            onClick={() => setCampaignContentPopupOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
}