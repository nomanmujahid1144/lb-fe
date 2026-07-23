'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Navigation from '@/components/layout/Navigation';
import ChatPopUp from '@/components/layout/ChatPopUp';
import { FaRegComments, FaEnvelope, FaPhoneAlt, FaFilter, FaUser, FaFileExcel } from 'react-icons/fa';
import { FaPersonCircleQuestion } from "react-icons/fa6";
import { RiResetLeftFill } from 'react-icons/ri';
import { MdCancel, MdTimer, MdOutlineConnectWithoutContact, MdBlock } from "react-icons/md";
import { TbCancel, TbMessageDown } from "react-icons/tb";
import { IoCheckmarkDoneSharp } from "react-icons/io5";
import { FcAlarmClock } from "react-icons/fc";
import { getCookie } from '@/lib/auth';
import { FiSend } from 'react-icons/fi';
import { FaPeopleGroup } from "react-icons/fa6";
import Pagination from '@/components/layout/Pagination';
import MultiSelect from '@/components/MultiSelect';
import { getBackendUrl } from '@/lib/api-config';
import toast from 'react-hot-toast';

interface Message {
  content: string;
  messageDate: string;
  senderId: string;
}

interface LeadNote {
  content: string;
  date: string;
  creator: string;
}

interface Tag {
  id: string;
  tag_name: string;
  colour: string;
  is_standard: boolean;
}

interface Prospect {
  id: string;
  profile_name: string;
  prospect_status: string;
  first_name: string;
  last_name: string;
  job_title: string;
  phone: string;
  email: string;
  linkedin_url: string;
  campaign_name: string;
  campaign_type?: string;
  prospect_id: string;
  profile_id: string;
  lead_note?: LeadNote;
  chatter_note: LeadNote[];
  lead_phase?: string;
  campaign_prospect_id: string;
  company_name?: string;
  tags_relation: Tag[];
  date_connection_requested?: string;
  date_connected?: string;
  date_replied?: string;
  date_positive_tag?: string;
  open_chatter_task_date?: string;
  blacklisted?: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  customers: any[];
  uuid: string;
  type: string;
}

// Component for displaying tags as colored widgets
const TagsDisplay = ({ tags }: { tags: Tag[] }) => {
    if (!tags || tags.length === 0) {
        return <span className="text-gray-400 italic text-xs">No tag(s) selected</span>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
                <span
                    key={tag.id}
                    className="inline-block px-2 py-1 rounded-full text-xs text-white font-medium"
                    style={{ backgroundColor: tag.colour }}
                >
                    {tag.tag_name}
                </span>
            ))}
        </div>
    );
};

export default function AllProspectsPage() {
  const [allProspects, setAllProspects] = useState<Prospect[]>([]); // Keep for backward compatibility with filter options
  const [prospects, setProspects] = useState<Prospect[]>([]); // Store paginated prospects for display
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [searchLinkedInUrl, setSearchLinkedInUrl] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedReplied, setSelectedReplied] = useState<string[]>(['true', 'false']);
  const [selectedBlacklisted, setSelectedBlacklisted] = useState<string[]>(['Yes', 'No']);
  const [selectedPositiveTag, setSelectedPositiveTag] = useState<string[]>(['true', 'false']);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalProspects, setTotalProspects] = useState(0);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [hasAutoSelectedProfile, setHasAutoSelectedProfile] = useState(false);
  const [hasAutoSelectedCampaign, setHasAutoSelectedCampaign] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Export states
  const [showExportSection, setShowExportSection] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // CRM state
  const [sentToCrmProspects, setSentToCrmProspects] = useState<Set<string>>(new Set());

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

  // Statuses to exclude
  const excludedStatuses = [
    'Unknown',
    'First connection',
  ];

  // Fetch filter options (profiles only) - lightweight call
  const fetchFilterOptions = async (userUuid: string, token: string) => {
    const backendUrl = getBackendUrl();
    try {
      const params = new URLSearchParams({
        'populate[profile]': 'true',
        'populate[customers][populate][profiles][fields][0]': 'profile_name',
        'populate[customers][populate][profiles][populate][start_end]': 'true',
      });

      const response = await fetch(
        `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch filter options');

      const userData = await response.json();
      const customers = userData.customers || [];
      
      // Extract unique profiles (exclude inactive profiles where end_date is in the past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const profileSet = new Set<string>();
      customers.forEach(customer =>
        customer.profiles?.forEach(profile => {
          if (profile.start_end?.end_date) {
            const endDate = new Date(profile.start_end.end_date);
            endDate.setHours(0, 0, 0, 0);
            if (endDate < today) return;
          }
          profileSet.add(profile.profile_name);
        })
      );

      setProfiles(Array.from(profileSet));
      
      // Static status list - no need to fetch from API
      const statusOrder = [
        'Connection requested',
        'Connected',
        'First follow-up sent',
        'Second follow-up sent',
        'Third follow-up sent',
        'Fourth follow-up sent',
        'First messenger follow-up sent',
        'Second messenger follow-up sent',
        'Third messenger follow-up sent',
        'Fourth messenger follow-up sent',
        'Awaiting reply',
        'Check',
        'Checked',
        'Completed',
        'Bounced',
        'Revoked'
      ];
      
      const sortedStatuses = statusOrder;
      setStatuses(sortedStatuses);

      // Initialize selectedStatuses to all statuses (since initially all are included)
      setSelectedStatuses(sortedStatuses);

      // Check if user has a connected profile
      const profile = userData.profile;
      if (profile) {
        setUserProfile(profile);
        setHasProfile(true);
        setSelectedProfiles([profile.profile_name]);
        setHasAutoSelectedProfile(true);
      } else {
        setHasProfile(false);
        setUserProfile(null);
        // Auto-select first profile (only if no profile is currently selected and we haven't auto-selected before)
        const firstProfile = Array.from(profileSet)[0];
        if (firstProfile && selectedProfiles.length === 0 && !hasAutoSelectedProfile && profileSet.size > 0) {
          setSelectedProfiles([firstProfile]);
          setHasAutoSelectedProfile(true);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      setLoading(false);
    }
  };

  // Fetch campaigns for selected profiles
  const fetchCampaignsForProfiles = async (userUuid: string, token: string, profileNames: string[]) => {
    const backendUrl = getBackendUrl();
    try {
      const params = new URLSearchParams({
        'populate[customers][populate][profiles][fields][0]': 'profile_name',
        'populate[customers][populate][profiles][populate][campaigns][fields][0]': 'campaign_name',
        'populate[customers][populate][profiles][populate][campaigns][fields][1]': 'campaign_type',
      });

      // Filter by selected profiles
      if (profileNames.length === 1) {
        params.append('populate[customers][populate][profiles][filters][profile_name][$eq]', profileNames[0]);
      } else if (profileNames.length > 1) {
        profileNames.forEach(profileName => {
          params.append('populate[customers][populate][profiles][filters][profile_name][$in]', profileName);
        });
      }

      const response = await fetch(
        `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch campaigns for profiles');

      const userData = await response.json();
      const customers = userData.customers || [];
      
      // Extract campaigns for the selected profiles
      const campaignSet = new Set<string>();
      customers.forEach(customer =>
        customer.profiles?.forEach(profile => {
          if (profileNames.includes(profile.profile_name)) {
            profile.campaigns?.forEach(campaign => {
              // Exclude campaigns with type "First Connections"
              if (campaign.campaign_type !== 'First Connections') {
                campaignSet.add(campaign.campaign_name);
              }
            });
          }
        })
      );

      // Sort campaigns with Live campaigns first
      const sortedCampaigns = Array.from(campaignSet).sort((a, b) => {
        const aIsLive = a.toLowerCase().includes('live');
        const bIsLive = b.toLowerCase().includes('live');
        if (aIsLive && !bIsLive) return -1;
        if (!aIsLive && bIsLive) return 1;
        return a.localeCompare(b);
      });

      setCampaigns(sortedCampaigns);

      // Auto-select all campaigns (only if no campaign selected and we haven't auto-selected before)
      if (selectedCampaigns.length === 0 && !hasAutoSelectedCampaign && sortedCampaigns.length > 0) {
        setSelectedCampaigns(sortedCampaigns);
        setHasAutoSelectedCampaign(true);
      } else if (!sortedCampaigns.length) {
        setSelectedCampaigns([]); // Reset if no campaigns found
      }

    } catch (error) {
      console.error('Error fetching campaigns for profiles:', error);
      setCampaigns([]);
      setSelectedCampaigns([]);
    }
  };

  const fetchProspects = async (userUuid: string, token: string, page: number = 1, pageSize: number = 10) => {
    if (selectedProfiles.length === 0) return;
    
    setApplying(true);
    const backendUrl = getBackendUrl();
    try {
      // Build filters object for POST request
      const filters = {
        profiles: selectedProfiles,
        campaigns: selectedCampaigns,
        prospectStatuses: selectedStatuses,
        replied: selectedReplied,
        positiveTag: selectedPositiveTag.length === 2 ? [] : selectedPositiveTag,
        linkedinUrl: searchLinkedInUrl,
        excludedStatuses: excludedStatuses,
        blacklisted: selectedBlacklisted.length === 2 ? [] : selectedBlacklisted,
      };

      const response = await fetch(`${backendUrl}/api/all-prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userUuid,
          filters,
          page,
          pageSize,
          source: 'all_prospects'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prospects: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      const prospectsData = data.data || [];

      setProspects(prospectsData);
      setTotalProspects(data.meta?.total || prospectsData.length);

    } catch (error) {
      console.error('Error fetching prospects:', error);
      setProspects([]);
      setTotalProspects(0);
    } finally {
      setApplying(false);
      setHasAppliedFilters(true);
    }
  };

  const handleExportProspects = async () => {
    const token = getCookie('token');
    if (!token) {
      toast.error('Authentication token is missing. Please log in again.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    if (!user?.uuid) {
      toast.error('User UUID is missing. Please log in again.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    if (totalProspects === 0) {
      toast.error('No prospects to export.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    // Show warning if there are more than 5000 prospects
    if (totalProspects > 5000) {
      toast(`Only the first 5000 of ${totalProspects} prospects will be exported.`, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#F59E0B',
          color: '#fff',
        },
      });
    }

    setIsExporting(true);
    try {
      const backendUrl = getBackendUrl();

      // First, fetch ALL campaign prospect IDs matching current filters
      const allIds: string[] = [];
      const totalPagesToFetch = Math.ceil(Math.min(totalProspects, 5000) / 1000); // Fetch in batches of 1000

      for (let page = 1; page <= totalPagesToFetch; page++) {
        const filters = {
          profiles: selectedProfiles,
          campaigns: selectedCampaigns,
          prospectStatuses: selectedStatuses,
          replied: selectedReplied,
          positiveTag: selectedPositiveTag.length === 2 ? [] : selectedPositiveTag,
          linkedinUrl: searchLinkedInUrl,
          excludedStatuses: excludedStatuses
        };

        const response = await fetch(`${backendUrl}/api/all-prospects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userUuid: user.uuid,
            filters,
            page,
            pageSize: 1000, // Fetch 1000 at a time
            source: 'all_prospects'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch prospect IDs for page ${page}`);
        }

        const data = await response.json();
        const pageIds = data.data.map((p: Prospect) => p.campaign_prospect_id).filter((id: string) => id != null);
        allIds.push(...pageIds);
      }

      // Now export with all IDs
      const requestBody = {
        campaignProspectIds: allIds.slice(0, 5000), // Still limit to 5000 for safety
        userUuid: user.uuid,
        format: 'excel'
      };

      const response = await fetch(`${backendUrl}/api/export-prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error response body:', errorText);
        throw new Error(`Failed to export prospects: ${response.status} - ${errorText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Set appropriate filename based on format
      const extension = 'xlsx';
      a.download = `all_prospects_export_${new Date().toISOString().split('T')[0]}.${extension}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Export completed! ${Math.min(allIds.length, 5000)} prospects exported.`, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error exporting prospects:', error);
      toast.error('There was an error exporting the prospects. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      const token = getCookie('token');
      const storedUser = localStorage.getItem('user');
      if (!token || !storedUser) return;
      
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Load filter options (profiles only)
      await fetchFilterOptions(parsedUser.uuid, token);
    };

    initializeData();
  }, []); // Empty dependency array - only run once

  // Fetch campaigns when profile changes
  useEffect(() => {
    // Only fetch campaigns if we have valid profile names and user
    if (selectedProfiles.length > 0 && user) {
      const token = getCookie('token');
      if (token) {
        fetchCampaignsForProfiles(user.uuid, token, selectedProfiles);
      }
    }
  }, [selectedProfiles, user]);

  // Auto-load prospects on initial load only
  useEffect(() => {
    // Only auto-load on initial load when we have the auto-selected filters
    if (isInitialLoad && selectedProfiles.length > 0 && selectedReplied.length > 0 && user && !hasAppliedFilters) {
      const token = getCookie('token');
      if (token) {
        setIsAutoLoading(true);
        fetchProspects(user.uuid, token, 1, pageSize).then(() => {
          setIsAutoLoading(false);
          setIsInitialLoad(false);
        });
      }
    }
  }, [selectedProfiles, selectedCampaigns, selectedReplied, user, hasAppliedFilters, isInitialLoad]);

  // Apply filters function
  const applyFilters = () => {
    if (selectedProfiles.length > 0 && selectedReplied.length > 0 && user) {
      const token = getCookie('token');
      if (token) {
        fetchProspects(user.uuid, token, 1, pageSize);
      }
    }
  };

  // Check if any filter differs from default state
  const isResetNeeded = 
    selectedProfiles.length !== 1 ||
    (profiles.length > 0 && selectedProfiles[0] !== profiles[0]) ||
    selectedCampaigns.length !== campaigns.length ||
    selectedStatuses.length !== statuses.length ||
    selectedReplied.length !== 2 ||
    selectedPositiveTag.length !== 2 ||
    selectedBlacklisted.length !== 2 ||
    searchLinkedInUrl.trim() !== '' ||
    hasAppliedFilters;

  // Reset filters to defaults
  const resetFilters = () => {
    // Reset to first profile
    const firstProfile = profiles[0];
    setSelectedProfiles(firstProfile ? [firstProfile] : []);
    setSelectedCampaigns([]);
    setHasAutoSelectedCampaign(false);
    setSelectedStatuses([...statuses]);
    setSelectedReplied(['true', 'false']);
    setSelectedPositiveTag(['true', 'false']);
    setSelectedBlacklisted(['Yes', 'No']);
    setSearchLinkedInUrl('');
    setCurrentPage(1);
    setProspects([]);
    setTotalProspects(0);
    setHasAppliedFilters(false);
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalProspects / pageSize);

  // Pagination handlers
  const handlePrevPage = () => {
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    if (hasAppliedFilters && user) {
      const token = getCookie('token');
      if (token) {
        fetchProspects(user.uuid, token, newPage, pageSize);
      }
    }
  };
  
  const handleNextPage = () => {
    const newPage = Math.min(currentPage + 1, totalPages);
    setCurrentPage(newPage);
    if (hasAppliedFilters && user) {
      const token = getCookie('token');
      if (token) {
        fetchProspects(user.uuid, token, newPage, pageSize);
      }
    }
  };

  // Function to handle opening chat popup
  const handleViewChat = (profileId: string, prospectId: string, prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowPopup(true);
  };

  const CRMUsers = ['Luuk_Admin', 'Luuk_Admin_Test', 'laura', 'Jessy', 'Jean_Jiggr', 'Alan', 'Jerome_DeSpeld', 'Melle_DeSpeld',
                    'Manager_DeSpeld', 'Rob_PostNL', 'Sigrid_PostNL', 'Thomas_PostNL', 'Johan_PostNL', 'Manager_PostNL', 'Manager_Jiggr',
                    'Nicolas_HealthyMind', 'Manager_HealthyMind', 'Eelco_RolanRobotics', 'Manager_RolanRobotics', 'Laura_Demo',
                    'Reinier_Natwerk', 'Coen_Natwerk', 'Manager_Natwerk', 'Hanneke_Natwerk', 'Daan_Lumiq', 'Manager_Lumiq', 'Joop_Healzzy2GO',
                    'Manager_Healzzy2GO', 'Karin_YourGift', 'Manager_YourGift',
                    'Manager_RoutiGo', 'Patrick_RoutiGo', 'Huub_RoutiGo', 'Anick_RoutiGo'];

  const handleTriggerZap = async (prospect: Prospect) => {
    const token = getCookie('token');
    if (!token) {
      toast.error('Authentication token is missing. Please log in again.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/trigger-zap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prospect),
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger Zap: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSentToCrmProspects(prev => new Set(prev).add(prospect.prospect_id));
        toast.success('Prospect sent to CRM successfully!', {
          duration: 3000,
          position: 'top-center',
          style: { background: '#10B981', color: '#fff' },
        });
      } else {
        throw new Error(result.message || 'Failed to send to Zapier');
      }
    } catch (error) {
      toast.error('Failed to send prospect to CRM. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  // Function to format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  // Map backend status names to display names
  const statusDisplayMap: Record<string, string> = {
    'Awaiting reply': 'Chatter Task'
  };

  // Function to get status icon and styling
  const getStatusDisplay = (status: string) => {
    const displayName = statusDisplayMap[status] || status;
    switch (status) {
      case 'Revoked':
        return {
          icon: <MdCancel className="w-6 h-6" />,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          displayName
        };
      case 'First follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-gray-600">1</span>,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          displayName
        };
      case 'Second follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-gray-600">2</span>,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          displayName
        };
      case 'Third follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-gray-600">3</span>,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          displayName
        };
      case 'Fourth follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-gray-600">4</span>,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          displayName
        };
      case 'First messenger follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-green-600">M1</span>,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          displayName
        };
      case 'Second messenger follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-green-600">M2</span>,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          displayName
        };
      case 'Third messenger follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-green-600">M3</span>,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          displayName
        };
      case 'Fourth messenger follow-up sent':
        return {
          icon: <span className="font-bold text-xl text-green-600">M4</span>,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          displayName
        };
      case 'Bounced':
        return {
          icon: <TbCancel className="w-6 h-6" />,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          displayName
        };
      case 'Connection requested':
        return {
          icon: <MdTimer className="w-6 h-6" />,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          displayName
        };
      case 'Connected':
        return {
          icon: <MdOutlineConnectWithoutContact className="w-6 h-6" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          displayName
        };
      case 'Messenger sent':
        return {
          icon: <TbMessageDown className="w-6 h-6" />,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          displayName
        };
      case 'Completed':
        return {
          icon: <IoCheckmarkDoneSharp className="w-6 h-6" />,
          bgColor: 'bg-emerald-100',
          textColor: 'text-emerald-800',
          displayName
        };
      case 'Check':
        return {
          icon: <FaPersonCircleQuestion className="w-6 h-6" />,
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-800',
          displayName
        };
      case 'Checked':
        return {
          icon: <IoCheckmarkDoneSharp className="w-6 h-6" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          displayName
        };
      case 'Awaiting reply':
        return {
          icon: <FcAlarmClock className="w-6 h-6" />,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          displayName
        };
      default:
        return {
          icon: null,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          displayName
        };
    }
  };

  return (
    <div className="min-h-screen bg-gray-0">
      {user && <Navigation user={user} onLogout={() => {}} currentPage="All Prospects" pageIcon={FaPeopleGroup} />}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        {/* Filter Bar */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col gap-4">
          <div className={`flex flex-col md:flex-row ${expandedFilters.size > 0 ? 'md:items-start' : 'md:items-center'} gap-4 w-full md:justify-end`}>
            {/* Profile Filter */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={profiles.map(profile => ({ value: profile, label: profile }))}
                selectedValues={selectedProfiles}
                onChange={(values) => {
                  setSelectedProfiles(values);
                  // Reset campaign selection when profile changes
                  setSelectedCampaigns([]);
                  setHasAutoSelectedCampaign(false);
                }}
                title="Profiles"
                onExpandedChange={(isExpanded) => handleFilterExpandedChange('profiles', isExpanded)}
              />
            </div>
            {/* Status Filter */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={statuses.map(status => ({ value: status, label: status }))}
                selectedValues={selectedStatuses}
                onChange={(values) => {
                  setSelectedStatuses(values);
                }}
                title="Statuses"
                onExpandedChange={(isExpanded) => handleFilterExpandedChange('statuses', isExpanded)}
              />
            </div>
            {/* Campaign Filter */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={campaigns.map(campaign => ({ value: campaign, label: campaign }))}
                selectedValues={selectedCampaigns}
                onChange={(values) => {
                  setSelectedCampaigns(values);
                }}
                title="Campaigns"
                onExpandedChange={(isExpanded) => handleFilterExpandedChange('campaigns', isExpanded)}
              />
            </div>
            {/* Replied Filter */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={[
                  { value: 'true', label: 'Replied' },
                  { value: 'false', label: 'Not Replied' }
                ]}
                selectedValues={selectedReplied}
                onChange={(values) => {
                  setSelectedReplied(values);
                }}
                title="Replied"
                onExpandedChange={(isExpanded) => handleFilterExpandedChange('replied', isExpanded)}
              />
            </div>
            {/* Positive Tag Filter */}
            <div className="w-full md:w-56">
              <MultiSelect
                options={[
                  { value: 'true', label: 'Positive' },
                  { value: 'false', label: 'Not Positive' }
                ]}
                selectedValues={selectedPositiveTag}
                onChange={(values) => {
                  setSelectedPositiveTag(values);
                }}
                title="Positive"
                onExpandedChange={(isExpanded) => handleFilterExpandedChange('positiveTag', isExpanded)}
              />
            </div>
            {/* Blacklisted Filter */}
            <div className="w-full md:w-44">
              <MultiSelect
                options={[
                  { value: 'Yes', label: 'Blacklisted' },
                  { value: 'No', label: 'Not Blacklisted' }
                ]}
                selectedValues={selectedBlacklisted}
                onChange={(values) => {
                  setSelectedBlacklisted(values);
                }}
                title="Blacklisted"
                onExpandedChange={(isExpanded) => handleFilterExpandedChange('blacklisted', isExpanded)}
              />
            </div>
            {/* Profile URL Search */}
            <div className="w-full md:w-56">
              <input
                id="profileUrlSearch"
                type="text"
                placeholder="Search LinkedIn URL..."
                value={searchLinkedInUrl}
                onChange={(e) => setSearchLinkedInUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedProfiles.length > 0 && selectedReplied.length > 0 && !applying) applyFilters(); }}
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder:text-xs focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {/* Apply & Reset Filters Buttons */}
            <div className="w-full md:w-auto flex gap-2">
              <button
                onClick={applyFilters}
                disabled={selectedProfiles.length === 0 || selectedReplied.length === 0 || applying}
                className="h-[38px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
                title="Apply Filters"
              >
                {applying ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <FaFilter className="w-4 h-4" />
                )}
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

          {totalProspects > 0 && (
            <div className="flex justify-start">
              <button
                onClick={() => setShowExportSection(!showExportSection)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 transition-colors duration-200"
              >
                <span>Export</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showExportSection ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
          )}

          {showExportSection && totalProspects > 0 && (
            <div className={`flex flex-col gap-4 w-full border-t border-gray-200 pt-4`}>
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Export {Math.min(totalProspects, 5000)} Prospect{Math.min(totalProspects, 5000) === 1 ? '' : 's'}:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportProspects()}
                    disabled={isExporting}
                    className="h-[38px] px-3 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
                    title="Export as Excel file"
                  >
                    {isExporting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <FaFileExcel className="w-4 h-4" />
                    )}
                    Excel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Prospects List */}
        <div className="overflow-hidden">
          {loading || isAutoLoading ? (
            <p className="text-gray-600 text-lg">Loading prospects...</p>
          ) : !hasAppliedFilters ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Click the Filter button to load prospects.</p>
            </div>
          ) : applying ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading prospects...</p>
            </div>
          ) : prospects.length === 0 ? (
            <p className="text-gray-600 text-lg">No prospects found with the current filters.</p>
          ) : (
            <>
              {/* Header row */}
              <div className="hidden md:grid grid-cols-[140px_1fr_192px_200px] gap-4 items-center px-4 py-2 mb-2 bg-gray-100 rounded-t-lg shadow-sm font-semibold text-gray-600 text-sm">
                <div className="text-center">Status</div>
                <div className="text-left">Prospect</div>
                <div className="text-left">Dates</div>
                <div className="text-left">Primary Action</div>
              </div>
              <div className="flex flex-col gap-4">
                {prospects.map((prospect, index) => {
                  const statusDisplay = getStatusDisplay(prospect.prospect_status);
                  return (
                  <div
                    key={prospect.id}
                    className="bg-white shadow-lg rounded-lg p-4 w-[99%] mx-auto grid md:grid-cols-[140px_1fr_192px_200px] gap-4 items-start hover:scale-[1.005] transition-all duration-200 cursor-pointer"
                  >
                    {/* Status Column */}
                    <div className="flex items-start justify-center pt-2">
                      <div className="flex flex-col items-center gap-1">
                        {statusDisplay.icon && (
                          <div className="text-2xl flex-shrink-0">
                            {statusDisplay.icon}
                          </div>
                        )}
                        <span className={`text-xs font-semibold text-center px-2 py-1 rounded-md w-28 ${statusDisplay.bgColor} ${statusDisplay.textColor}`}>{statusDisplay.displayName}</span>
                        {prospect.blacklisted && (
                          <span className="text-xs font-semibold text-center px-2 py-1 rounded-md w-28 bg-red-600 text-white flex items-center justify-center gap-1 mt-1">
                            <MdBlock className="text-sm" /> Blacklisted
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Prospect Info Column */}
                    <div className="min-w-0">
                      <h2 className="text-lg text-gray-900 mb-2">
                        <a
                          href={prospect.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-md"
                        >
                          {prospect.first_name} {prospect.last_name}
                        </a>
                        <span className="ml-3 inline-block bg-blue-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                          <FaUser className="inline-block text-sm mr-1" /> {prospect.profile_name}
                        </span>
                      </h2>
                      <p className="text-md text-gray-700 truncate" title={prospect.company_name ? `${prospect.job_title} at ${prospect.company_name}` : prospect.job_title}>
                        {prospect.job_title}
                        {prospect.company_name ? ` at ${prospect.company_name}` : ''}
                      </p>
                      <p className="text-gray-500 text-sm truncate mt-2" title={`Campaign name: ${prospect.campaign_name}`}>
                        Campaign: {prospect.campaign_name}
                      </p>
                      <div className="text-sm text-gray-500 mt-2">
                        <TagsDisplay tags={prospect.tags_relation} />
                      </div>
                    </div>
                    
                    {/* Dates Column */}
                    <div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {prospect.campaign_type !== 'Messenger' && formatDate(prospect.date_connection_requested) && (
                          <div><span className="font-medium">Requested:</span> {formatDate(prospect.date_connection_requested)}</div>
                        )}
                        {prospect.campaign_type !== 'Messenger' && formatDate(prospect.date_connected) && (
                          <div><span className="font-medium">Connected:</span> {formatDate(prospect.date_connected)}</div>
                        )}
                        {formatDate(prospect.date_replied) && (
                          <div><span className="font-medium">Replied:</span> {formatDate(prospect.date_replied)}</div>
                        )}
                        {formatDate(prospect.date_positive_tag) && (
                          <div><span className="font-medium">Positive:</span> {formatDate(prospect.date_positive_tag)}</div>
                        )}
                        {formatDate(prospect.open_chatter_task_date) && (
                          <div><span className="font-medium">Chatter Task Date:</span> {formatDate(prospect.open_chatter_task_date)}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Primary Actions Column */}
                    <div className="flex flex-col justify-start items-start gap-4">
                      <button
                        className="btn btn-primary px-6 py-4 rounded text-xs font-semibold w-full flex items-center justify-center gap-2"
                        onClick={() => handleViewChat(prospect.profile_id, prospect.prospect_id, prospect)}
                      >
                        <FaRegComments className="text-lg" />
                        View Chat
                      </button>
                      {CRMUsers.includes(user?.username || '') && (
                        <button
                          className={`btn btn-secondary px-6 py-4 rounded text-xs font-semibold w-full flex items-center justify-center gap-2 ${
                            sentToCrmProspects.has(prospect.prospect_id) ? 'opacity-75 cursor-not-allowed' : ''
                          }`}
                          onClick={() => handleTriggerZap(prospect)}
                          disabled={sentToCrmProspects.has(prospect.prospect_id)}
                          title={sentToCrmProspects.has(prospect.prospect_id) ? 'Sent to CRM' : undefined}
                        >
                          <FiSend className="text-lg" />
                          Send to CRM
                        </button>
                      )}
                      <div className="w-full flex flex-col gap-1">
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <FaPhoneAlt />
                          {prospect.phone && prospect.phone !== '.' ? (
                            <span>{prospect.phone}</span>
                          ) : (
                            <span className="text-gray-300 italic">not available</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <FaEnvelope />
                          {prospect.email && prospect.email !== '.' ? (
                            <span>{prospect.email}</span>
                          ) : (
                            <span className="text-gray-300 italic">not available</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              {/* Pagination */}
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalProspects}
                  itemsPerPage={pageSize}
                  onNext={handleNextPage}
                  onPrev={handlePrevPage}
                  isCountLimited={false}
                />
              </div>
            </>
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
