'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Navigation from '../../../components/layout/Navigation';
import { getCookie, clearAuthCookie } from '../../../lib/auth';
import { safeLocalStorage } from '../../../lib/storage';
import { GiBrain } from 'react-icons/gi';
import { IoIosInformationCircleOutline, IoIosAddCircleOutline, IoIosCloseCircleOutline } from "react-icons/io";
import { CiCircleCheck, CiWarning } from "react-icons/ci";
import { getBackendUrl } from '../../../lib/api-config';
import { estimateAnalysisCost, formatCountdown, formatUsd } from '../../../lib/aiAnalysisCost';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';

// Keep in sync with MAX_AI_ANALYSIS_COMPANIES in the backend
// all-companies controller — the API rejects larger batches.
const MAX_AI_ANALYSIS_COMPANIES = 50000;

interface User {
  id: number;
  username: string;
  email: string;
  customers: any[];
  uuid: string;
  type: string;
}

interface AIPrompt {
  id: number;
  documentId: string;
  prompt_name: string;
  prompt_description: string;
  prompt_text: string;
  version: string;
  active: boolean;
  output_structure: any;
  deprecated_prompt?: any;
  company_analyses?: any[];
}

export default function AnalyzeCompaniesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    clearAuthCookie();
    safeLocalStorage.removeItem('user');
    router.push('/auth/login');
  };

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [selectedPromptForDetails, setSelectedPromptForDetails] = useState<AIPrompt | null>(null);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [creatingPrompt, setCreatingPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    prompt_name: '',
    prompt_description: '',
    prompt_text: '',
    version: '1.0',
    output_structure: '{}',
    active: true
  });
  const [editedPrompt, setEditedPrompt] = useState<AIPrompt | null>(null);
  const [companyAttributes, setCompanyAttributes] = useState<string[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [processedCompanies, setProcessedCompanies] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>('pending');
  const [analysisErrors, setAnalysisErrors] = useState<any[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [deepseekBalance, setDeepseekBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  // Which model the *backend* queue will call — the portal has no say in it.
  const [analysisConfig, setAnalysisConfig] = useState<{ model: string; thinking: string } | null>(null);
  const [loadingAnalysisConfig, setLoadingAnalysisConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Ticks so the peak-rate warning and its countdown stay current while the
  // summary is open. Starts null to keep the server render and the first client
  // render identical.
  const [now, setNow] = useState<Date | null>(null);

  // Function to get the authentication token from cookies
  const getCookie = (name: string): string | undefined => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };

  // Keep the peak-rate countdown ticking while step 3 is open.
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Debug logging for progress bar visibility
  useEffect(() => {
    const shouldShowProgress = analyzing || analysisId;
    // console.log('👁️ Progress bar visibility check:', {
    //   analyzing,
    //   analysisId,
    //   shouldShowProgress,
    //   analysisStatus,
    //   progressPercentage
    // });
  }, [analyzing, analysisId, analysisStatus, progressPercentage]);

  // Fetch DeepSeek balance when reaching step 3
  useEffect(() => {
    const fetchDeepSeekBalance = async () => {
      if (currentStep === 3 && !analyzing && !analysisId) {
        setLoadingBalance(true);
        try {
          const response = await fetch('/api/deepseek-balance');
          if (response.ok) {
            const data = await response.json();
            // DeepSeek API returns balance in credits, which are in USD
            const balanceInUSD = data.balance_infos?.[0]?.total_balance || 0;
            setDeepseekBalance(balanceInUSD);
          } else {
            console.error('Failed to fetch DeepSeek balance');
            setDeepseekBalance(null);
          }
        } catch (error) {
          console.error('Error fetching DeepSeek balance:', error);
          setDeepseekBalance(null);
        } finally {
          setLoadingBalance(false);
        }
      }
    };

    fetchDeepSeekBalance();
  }, [currentStep, analyzing, analysisId]);

  // Fetch the model the analysis queue is configured with, alongside the balance
  useEffect(() => {
    if (currentStep !== 3 || analyzing || analysisId) return;

    const controller = new AbortController();

    const fetchAnalysisConfig = async () => {
      setLoadingAnalysisConfig(true);
      try {
        const token = getCookie('token');
        const response = await fetch(`${getBackendUrl()}/api/all-companies/ai-analysis/config`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          console.error('Failed to fetch AI analysis config:', response.status);
          setAnalysisConfig(null);
          return;
        }
        setAnalysisConfig(await response.json());
      } catch (error) {
        // An aborted request is the effect cleaning up, not a failure.
        if ((error as Error)?.name === 'AbortError') return;
        console.error('Error fetching AI analysis config:', error);
        setAnalysisConfig(null);
      } finally {
        if (!controller.signal.aborted) setLoadingAnalysisConfig(false);
      }
    };

    fetchAnalysisConfig();
    return () => controller.abort();
  }, [currentStep, analyzing, analysisId]);

  // Initialize user data and get selected company IDs
  useEffect(() => {
    const token = getCookie('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/auth/login');
      return;
    }

    const parsedUser: User = JSON.parse(storedUser);
    setUser(parsedUser);

    // Get selected company IDs from localStorage
    const storedIds = localStorage.getItem('selectedCompanyIds');
    if (storedIds) {
      try {
        const ids = JSON.parse(storedIds);
        setSelectedCompanyIds(ids);
      } catch (error) {
        console.error('Error parsing selected company IDs:', error);
      }
    }
  }, [router]);

  // Fetch company attributes for placeholders
  useEffect(() => {
    const fetchCompanyAttributes = async () => {
      try {
        // Using the specified company attributes for placeholders
        const attributes = [
          'name', 'description', 'city', 'size', 'industry_company'
        ];
        setCompanyAttributes(attributes);
      } catch (error) {
        console.error('Error fetching company attributes:', error);
        // Fallback to basic attributes
        setCompanyAttributes(['name', 'description', 'city', 'size']);
      }
    };

    fetchCompanyAttributes();
  }, []);

  // Fetch AI prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      const token = getCookie('token');
      if (!token) return;

      try {
        const backendUrl = getBackendUrl();
        let allPrompts: any[] = [];
        let page = 1;
        const pageSize = 100; // Fetch up to 100 prompts per page
        let total = 0;

        while (true) {
          const queryUrl = new URL(`${backendUrl}/api/ai-prompts`);
          queryUrl.searchParams.append("pagination[page]", page.toString());
          queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

          const response = await fetch(queryUrl.toString(), {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (!response.ok) throw new Error(`Failed to fetch prompts: ${response.status} - ${await response.text()}`);

          const result = await response.json();
          const fetchedPrompts = result.data || [];
          allPrompts = allPrompts.concat(fetchedPrompts);
          total = result.meta?.pagination?.total || 0;

          if (allPrompts.length >= total) break;
          page += 1;
        }

        setPrompts(allPrompts);
      } catch (error) {
        console.error('Error fetching prompts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPrompts();
    }
  }, [user]);

  // Start AI analysis
  const startAnalysis = async () => {
    if (!selectedPrompt) {
      toast.error('Please select an AI prompt first');
      return;
    }

    if (selectedCompanyIds.length > MAX_AI_ANALYSIS_COMPANIES) {
      toast.error(`Maximum ${MAX_AI_ANALYSIS_COMPANIES.toLocaleString()} companies per AI analysis (${selectedCompanyIds.length.toLocaleString()} selected)`);
      return;
    }

    //console.log('🚀 Starting AI analysis...');
    setAnalyzing(true);
    const token = getCookie('token');
    const backendUrl = getBackendUrl();

    try {
      const response = await fetch(`${backendUrl}/api/all-companies/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          companyIds: selectedCompanyIds,
          promptId: selectedPrompt.id,
          userUuid: user?.uuid
        })
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('🔍 Full API response data:', JSON.stringify(data, null, 2));
        const id = data.data?.id || data.data?.documentId || data.id || data.documentId || data.analysisId || data.dataReceiverUniqueId || data.data?.dataReceiverUniqueId; // Handle various possible id field names
        // console.log('✅ API response received:', { data, extractedId: id });
        setAnalysisId(id);
        setTotalCompanies(selectedCompanyIds.length);
        setAnalyzing(false);
        // console.log('📊 Analysis state after API success:', { analysisId: id, analyzing: false, totalCompanies: selectedCompanyIds.length });
        toast.success('AI analysis started successfully!', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('❌ Error starting analysis:', error);
      toast.error('Failed to start AI analysis. Please try again.', {
        duration: 3000,
        position: 'top-center',
      });
      setAnalyzing(false);
    }
  };

  const openPromptDetails = (prompt: AIPrompt) => {
    setSelectedPromptForDetails(prompt);
    setEditedPrompt({...prompt});
    setEditingPrompt(false);
    setHasChanges(false);
    setShowPromptDetails(true);
  };

  const closePromptDetails = () => {
    setShowPromptDetails(false);
    setSelectedPromptForDetails(null);
    setEditedPrompt(null);
    setEditingPrompt(false);
    setHasChanges(false);
    setShowDeleteConfirm(false);
  };

  const startEditing = () => {
    setEditingPrompt(true);
  };

  const cancelEditing = () => {
    if (selectedPromptForDetails) {
      setEditedPrompt({...selectedPromptForDetails});
    }
    setEditingPrompt(false);
    setHasChanges(false);
  };

  const updateEditedPrompt = (field: string, value: any) => {
    if (!editedPrompt) return;
    
    const updated = {...editedPrompt, [field]: value};
    setEditedPrompt(updated);
    
    // Check if there are changes
    const hasChanged = selectedPromptForDetails && (
      updated.prompt_name !== selectedPromptForDetails.prompt_name ||
      updated.prompt_description !== selectedPromptForDetails.prompt_description ||
      updated.prompt_text !== selectedPromptForDetails.prompt_text ||
      updated.version !== selectedPromptForDetails.version ||
      JSON.stringify(updated.output_structure) !== JSON.stringify(selectedPromptForDetails.output_structure) ||
      updated.active !== selectedPromptForDetails.active
    );
    setHasChanges(!!hasChanged);
  };

  const saveEditedPrompt = async () => {
    if (!editedPrompt || !hasChanges) return;

    const token = getCookie('token');
    const backendUrl = getBackendUrl();

    try {
      const response = await fetch(`${backendUrl}/api/ai-prompts/${editedPrompt.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            prompt_name: editedPrompt.prompt_name,
            prompt_description: editedPrompt.prompt_description,
            prompt_text: editedPrompt.prompt_text,
            version: editedPrompt.version,
            output_structure: editedPrompt.output_structure,
            active: editedPrompt.active
          }
        })
      });

      if (response.ok) {
        toast.success('AI prompt updated successfully!', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
        setEditingPrompt(false);
        setHasChanges(false);
        // Refresh prompts list
        const refreshPrompts = async () => {
          const token = getCookie('token');
          let allPrompts: any[] = [];
          let page = 1;
          const pageSize = 100;
          let total = 0;

          while (true) {
            const queryUrl = new URL(`${backendUrl}/api/ai-prompts`);
            queryUrl.searchParams.append("pagination[page]", page.toString());
            queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

            const refreshResponse = await fetch(queryUrl.toString(), {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });

            if (!refreshResponse.ok) break;

            const result = await refreshResponse.json();
            const fetchedPrompts = result.data || [];
            allPrompts = allPrompts.concat(fetchedPrompts);
            total = result.meta?.pagination?.total || 0;

            if (allPrompts.length >= total) break;
            page += 1;
          }

          setPrompts(allPrompts);
        };

        await refreshPrompts();
      } else {
        throw new Error('Failed to update prompt');
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update AI prompt. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const deletePrompt = async () => {
    if (!selectedPromptForDetails) return;

    const token = getCookie('token');
    const backendUrl = getBackendUrl();

    try {
      const response = await fetch(`${backendUrl}/api/ai-prompts/${selectedPromptForDetails.documentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('AI prompt deleted successfully!', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
        
        // Immediately remove from local state
        setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== selectedPromptForDetails.id));
        
        closePromptDetails();
        
        // Refresh prompts list to ensure consistency
        const refreshPrompts = async () => {
          const token = getCookie('token');
          let allPrompts: any[] = [];
          let page = 1;
          const pageSize = 100;
          let total = 0;

          while (true) {
            const queryUrl = new URL(`${backendUrl}/api/ai-prompts`);
            queryUrl.searchParams.append("pagination[page]", page.toString());
            queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

            const refreshResponse = await fetch(queryUrl.toString(), {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });

            if (!refreshResponse.ok) break;

            const result = await refreshResponse.json();
            const fetchedPrompts = result.data || [];
            allPrompts = allPrompts.concat(fetchedPrompts);
            total = result.meta?.pagination?.total || 0;

            if (allPrompts.length >= total) break;
            page += 1;
          }

          setPrompts(allPrompts);
        };

        await refreshPrompts();
      } else {
        throw new Error('Failed to delete prompt');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete AI prompt. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    }
  };

  const openCreatePrompt = () => {
    setShowCreatePrompt(true);
  };

  const closeCreatePrompt = () => {
    setShowCreatePrompt(false);
    setCreatingPrompt(false);
    setNewPrompt({
      prompt_name: '',
      prompt_description: '',
      prompt_text: '',
      version: '1.0',
      output_structure: '{}',
      active: true
    });
  };

  const resetAnalysis = () => {
    // console.log('🔄 Resetting analysis state');
    // Close any existing SSE connection
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setAnalysisId(null);
    setProgressPercentage(0);
    setProcessedCompanies(0);
    setTotalCompanies(0);
    setAnalysisStatus('pending');
    setAnalysisErrors([]);
    setAnalyzing(false);
    // console.log('📊 Analysis state reset to initial values');
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('prompt-text') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + `{{${placeholder}}}` + after;
    setNewPrompt({...newPrompt, prompt_text: newText});

    // Set cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length + 4, start + placeholder.length + 4);
    }, 0);
  };

  const createNewPrompt = async () => {
    if (!newPrompt.prompt_name.trim() || !newPrompt.prompt_text.trim()) {
      toast.error('Prompt name and text are required');
      return;
    }

    setCreatingPrompt(true);
    const token = getCookie('token');
    const backendUrl = getBackendUrl();

    try {
      let outputStructure;
      try {
        outputStructure = JSON.parse(newPrompt.output_structure);
      } catch (error) {
        toast.error('Invalid JSON in output structure');
        return;
      }

      const response = await fetch(`${backendUrl}/api/ai-prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            prompt_name: newPrompt.prompt_name,
            prompt_description: newPrompt.prompt_description,
            prompt_text: newPrompt.prompt_text,
            version: newPrompt.version,
            output_structure: outputStructure,
            active: newPrompt.active
          }
        })
      });

      if (response.ok) {
        toast.success('AI prompt created successfully!', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
        closeCreatePrompt();
        // Refresh prompts list
        const refreshPrompts = async () => {
          const token = getCookie('token');
          let allPrompts: any[] = [];
          let page = 1;
          const pageSize = 100;
          let total = 0;

          while (true) {
            const queryUrl = new URL(`${backendUrl}/api/ai-prompts`);
            queryUrl.searchParams.append("pagination[page]", page.toString());
            queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

            const refreshResponse = await fetch(queryUrl.toString(), {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });

            if (!refreshResponse.ok) break;

            const result = await refreshResponse.json();
            const fetchedPrompts = result.data || [];
            allPrompts = allPrompts.concat(fetchedPrompts);
            total = result.meta?.pagination?.total || 0;

            if (allPrompts.length >= total) break;
            page += 1;
          }

          setPrompts(allPrompts);
        };

        await refreshPrompts();
      } else {
        throw new Error('Failed to create prompt');
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create AI prompt. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setCreatingPrompt(false);
    }
  };

  // Redirect non-admins to the dashboard
  useEffect(() => {
    if (user && user.type !== 'Admin') {
      toast.error('Access denied. Admin privileges required.', {
        duration: 4000,
        position: 'top-center',
      });
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user?.type !== 'Admin') return null; // Prevents rendering if redirecting

  // Before the first tick `now` is null; fall back to the off-peak rate so the
  // server render never claims a peak surcharge it cannot verify yet.
  const costEstimate = estimateAnalysisCost(selectedCompanyIds.length, now ?? new Date(0));

  const steps = [
    { number: 1, title: 'Review Selection', description: 'Confirm selected companies' },
    { number: 2, title: 'Choose Prompt', description: 'Select AI analysis type' },
    { number: 3, title: 'Start Analysis', description: 'Begin AI processing' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navigation user={user} onLogout={handleLogout} currentPage="AI Company Analysis" pageIcon={GiBrain} />}
      
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#364570] rounded-full mb-6 shadow-lg">
              <GiBrain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-[#364570] mb-3">
              AI Company Analysis
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Analyze selected companies using advanced AI prompts to gain deep insights and actionable intelligence
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-[#364570] rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-[#47577d] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#364570] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number 
                    ? 'bg-[#364570] border-[#364570] text-white' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <CiCircleCheck className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <div className="ml-4 mr-8">
                  <h3 className={`text-sm font-medium ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-xs ${currentStep >= step.number ? 'text-gray-600' : 'text-gray-400'}`}>
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 ${currentStep > step.number ? 'bg-[#364570]' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Step 1: Review Selection */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-[#364570] bg-opacity-10 rounded-full mr-3">
                  <span className="text-[#364570] font-semibold text-sm">1</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Review Selected Companies</h2>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Selected Companies</h3>
                    <p className="text-gray-600">{selectedCompanyIds.length} companies ready for analysis</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#364570]">{selectedCompanyIds.length}</div>
                    <div className="text-sm text-gray-500">companies</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => router.push('/dashboard/master_database')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Back to Master Database
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-[#364570] text-white font-medium rounded-lg hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 transition-colors duration-200"
                >
                  Continue to Prompt Selection
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Prompt */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-[#364570] bg-opacity-10 rounded-full mr-3">
                  <span className="text-[#364570] font-semibold text-sm">2</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Choose AI Analysis Prompt</h2>
              </div>

              <div className="mb-6 flex items-center space-x-4">
                <button
                  onClick={openCreatePrompt}
                  className="flex items-center px-4 py-2 bg-[#364570] text-white font-medium rounded-lg hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 transition-colors duration-200"
                >
                  <IoIosAddCircleOutline className="w-5 h-5 mr-2" />
                  Create New Prompt
                </button>

                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search prompts by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-transparent"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <ClipLoader size={32} color="#364570" />
                  <span className="ml-3 text-gray-600">Loading AI prompts...</span>
                </div>
              ) : (
                <div className="grid gap-4 mb-6">
                  {prompts.filter(prompt => prompt.prompt_name.toLowerCase().includes(searchTerm.toLowerCase())).map((prompt) => (
                    <div
                      key={prompt.id}
                      onClick={() => setSelectedPrompt(prompt)}
                      className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                        selectedPrompt?.id === prompt.id
                          ? 'border-[#364570] bg-[#364570] bg-opacity-5 ring-2 ring-[#364570] ring-opacity-20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{prompt.prompt_name}</h3>
                          <p className="text-gray-600 mb-3">{prompt.prompt_description}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                              Version {prompt.version}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPromptDetails(prompt);
                              }}
                              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                              title="View prompt details"
                            >
                              <IoIosInformationCircleOutline className="w-7 h-7" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center ml-4">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                            selectedPrompt?.id === prompt.id 
                              ? 'border-[#364570] bg-[#364570]' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            <CiCircleCheck className={`w-5 h-5 ${
                              selectedPrompt?.id === prompt.id 
                                ? 'text-white' 
                                : 'text-gray-300'
                            }`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!selectedPrompt}
                  className="px-6 py-3 bg-[#364570] text-white font-medium rounded-lg hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Continue to Analysis
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Start Analysis or Show Progress */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-[#364570] bg-opacity-10 rounded-full mr-3">
                  <span className="text-[#364570] font-semibold text-sm">3</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {analyzing || analysisId ? 'AI Analysis Started' : 'Start AI Analysis'}
                </h2>
              </div>

              {analyzing || analysisId ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <GiBrain className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Analysis Started</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Your AI analysis has been initiated. You can check the progress and results in the main dashboard menu.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        localStorage.removeItem('selectedCompanyIds');
                        router.push('/dashboard');
                      }}
                      className="px-6 py-3 bg-[#364570] text-white font-medium rounded-lg hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 transition-colors duration-200"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Companies to analyze:</span>
                        <span className="font-medium">{selectedCompanyIds.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selected prompt:</span>
                        <span className="font-medium">{selectedPrompt?.prompt_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prompt version:</span>
                        <span className="font-medium">{selectedPrompt?.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium">
                          {loadingAnalysisConfig ? (
                            <ClipLoader size={16} color="#364570" />
                          ) : analysisConfig ? (
                            <>
                              {analysisConfig.model}
                              {analysisConfig.thinking === 'enabled' && (
                                <span className="text-amber-600 font-normal"> (thinking on)</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated cost:</span>
                          <span className="font-medium text-[#364570]">
                            {formatUsd(costEstimate.costUsd)} USD
                            {costEstimate.peak && <span className="text-amber-600 font-normal"> (peak rate)</span>}
                          </span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-gray-600">Current DeepSeek balance:</span>
                          <span className="font-medium">
                            {loadingBalance ? (
                              <ClipLoader size={16} color="#364570" />
                            ) : deepseekBalance !== null ? (
                              <span className={Number(deepseekBalance) >= costEstimate.costUsd ? 'text-green-600' : 'text-red-600'}>
                                ${(Math.round(Number(deepseekBalance) * 100) / 100).toFixed(2)} USD
                              </span>
                            ) : (
                              <span className="text-gray-400">Unable to fetch</span>
                            )}
                          </span>
                        </div>
                        {costEstimate.peak && costEstimate.offPeakStartsAt && costEstimate.msUntilOffPeak !== null && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <div className="flex gap-2">
                              <CiWarning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-medium text-amber-900">
                                  DeepSeek peak rate — running now costs twice as much
                                </p>
                                <p className="text-amber-800 mt-1">
                                  Off-peak starts at{' '}
                                  <span className="font-medium">
                                    {costEstimate.offPeakStartsAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>{' '}
                                  ({formatCountdown(costEstimate.msUntilOffPeak)} from now). Starting the
                                  analysis then costs{' '}
                                  <span className="font-medium">{formatUsd(costEstimate.offPeakCostUsd)}</span> instead of{' '}
                                  <span className="font-medium">{formatUsd(costEstimate.costUsd)}</span> — a saving of{' '}
                                  <span className="font-medium">{formatUsd(costEstimate.savingsUsd)}</span> on{' '}
                                  {selectedCompanyIds.length} companies.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CiWarning className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Analysis Notice</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>This will start AI analysis for {selectedCompanyIds.length} companies using the "{selectedPrompt?.prompt_name}" prompt. The process may take several minutes to complete.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={analyzing}
                      className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={startAnalysis}
                      disabled={analyzing}
                      className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
                    >
                      {analyzing ? (
                        <>
                          <ClipLoader size={20} color="#ffffff" className="mr-2" />
                          Starting Analysis...
                        </>
                      ) : (
                        <>
                          <GiBrain className="w-5 h-5 mr-2" />
                          Start AI Analysis
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Details Modal */}
      {showPromptDetails && selectedPromptForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingPrompt ? 'Edit AI Prompt' : 'AI Prompt Details'}
                </h2>
                <div className="flex items-center space-x-2">
                  {!editingPrompt && (
                    <>
                      <button
                        onClick={startEditing}
                        className="px-3 py-1 bg-[#364570] text-white text-sm rounded-lg hover:bg-[#2a3654] transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={closePromptDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <IoIosCloseCircleOutline className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  {editingPrompt ? (
                    <input
                      type="text"
                      value={editedPrompt?.prompt_name || ''}
                      onChange={(e) => updateEditedPrompt('prompt_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570]"
                    />
                  ) : (
                    <div className="text-gray-900">{selectedPromptForDetails.prompt_name}</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  {editingPrompt ? (
                    <textarea
                      value={editedPrompt?.prompt_description || ''}
                      onChange={(e) => updateEditedPrompt('prompt_description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570] h-20"
                    />
                  ) : (
                    <div className="text-gray-900">{selectedPromptForDetails.prompt_description}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  {editingPrompt ? (
                    <input
                      type="text"
                      value={editedPrompt?.version || ''}
                      onChange={(e) => updateEditedPrompt('version', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570]"
                    />
                  ) : (
                    <div className="text-gray-900">{selectedPromptForDetails.version}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active</label>
                  {editingPrompt ? (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editedPrompt?.active || false}
                        onChange={(e) => updateEditedPrompt('active', e.target.checked)}
                        className="h-4 w-4 text-[#364570] focus:ring-[#364570] border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        {editedPrompt?.active ? 'Yes' : 'No'}
                      </label>
                    </div>
                  ) : (
                    <div className="text-gray-900">{selectedPromptForDetails.active ? 'Yes' : 'No'}</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Text</label>
                  {editingPrompt ? (
                    <textarea
                      value={editedPrompt?.prompt_text || ''}
                      onChange={(e) => updateEditedPrompt('prompt_text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570] h-40 font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-gray-900 whitespace-pre-wrap font-mono text-sm">
                      {selectedPromptForDetails.prompt_text}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    <strong>Available placeholders:</strong> {companyAttributes.join(', ')}, website_content
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Structure</label>
                  {editingPrompt ? (
                    <textarea
                      value={JSON.stringify(editedPrompt?.output_structure, null, 2) || ''}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateEditedPrompt('output_structure', parsed);
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570] h-32 font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-gray-900 whitespace-pre-wrap font-mono text-sm">
                      {JSON.stringify(selectedPromptForDetails.output_structure, null, 2)}
                    </div>
                  )}
                </div>
                {selectedPromptForDetails.deprecated_prompt && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deprecated Prompt</label>
                    <div className="bg-gray-50 p-4 rounded-lg text-gray-900 whitespace-pre-wrap font-mono text-sm">
                      {JSON.stringify(selectedPromptForDetails.deprecated_prompt, null, 2)}
                    </div>
                  </div>
                )}
                {selectedPromptForDetails.company_analyses && selectedPromptForDetails.company_analyses.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Analyses ({selectedPromptForDetails.company_analyses.length})</label>
                    <div className="bg-gray-50 p-4 rounded-lg text-gray-900 whitespace-pre-wrap font-mono text-sm max-h-60 overflow-y-auto">
                      {JSON.stringify(selectedPromptForDetails.company_analyses, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {editingPrompt ? (
                <>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedPrompt}
                    disabled={!hasChanges}
                    className="px-4 py-2 bg-[#364570] text-white rounded-lg hover:bg-[#2a3654] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={closePromptDetails}
                  className="px-4 py-2 bg-[#364570] text-white rounded-lg hover:bg-[#2a3654] transition-colors duration-200"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <CiWarning className="h-6 w-6 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Delete AI Prompt</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the prompt "{selectedPromptForDetails?.prompt_name}"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={deletePrompt}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Prompt Modal */}
      {showCreatePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New AI Prompt</h2>
                <button
                  onClick={closeCreatePrompt}
                  className="text-[#364570] hover:text-[#2a3654]"
                >
                  <IoIosCloseCircleOutline className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Name *</label>
                  <input
                    type="text"
                    value={newPrompt.prompt_name}
                    onChange={(e) => setNewPrompt({...newPrompt, prompt_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570]"
                    placeholder="Enter prompt name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={newPrompt.version}
                    onChange={(e) => setNewPrompt({...newPrompt, version: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570]"
                    placeholder="1.0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newPrompt.prompt_description}
                    onChange={(e) => setNewPrompt({...newPrompt, prompt_description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570] h-20"
                    placeholder="Describe what this prompt does"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Text *</label>
                  
                  {/* Placeholder Buttons */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Insert placeholders:</p>
                    <div className="flex flex-wrap gap-2">
                      {/* Company Attributes */}
                      <div className="text-xs text-gray-600 font-medium">Company:</div>
                      {companyAttributes.map(attr => (
                        <button
                          key={attr}
                          type="button"
                          onClick={() => insertPlaceholder(attr)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border transition-colors duration-200"
                          title={"Insert {{" + attr + "}} placeholder"}
                        >
                          {attr}
                        </button>
                      ))}
                      
                      {/* Website Content */}
                      <div className="text-xs text-gray-600 font-medium ml-4">Content:</div>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('website_content')}
                        className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded border transition-colors duration-200"
                        title="Insert {{website_content}} placeholder"
                      >
                        website_content
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    id="prompt-text"
                    value={newPrompt.prompt_text}
                    onChange={(e) => setNewPrompt({...newPrompt, prompt_text: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570] h-40 font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Placeholders like name or description will be replaced with actual company data during analysis.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Structure (JSON)</label>
                  <textarea
                    value={newPrompt.output_structure}
                    onChange={(e) => setNewPrompt({...newPrompt, output_structure: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#364570] focus:border-[#364570] h-32 font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={newPrompt.active}
                    onChange={(e) => setNewPrompt({...newPrompt, active: e.target.checked})}
                    className="h-4 w-4 text-[#364570] focus:ring-[#364570] border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeCreatePrompt}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={createNewPrompt}
                disabled={creatingPrompt}
                className="px-4 py-2 bg-[#364570] text-white rounded-lg hover:bg-[#2a3654] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
              >
                {creatingPrompt ? (
                  <>
                    <ClipLoader size={16} color="#ffffff" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Prompt'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
