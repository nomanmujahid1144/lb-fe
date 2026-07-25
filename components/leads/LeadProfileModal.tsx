'use client';

import React, { useState } from 'react';
import Modal from '../Modal';
import { AddNoteIcon, AddTaskIcon, ArrowDownIcon, ArrowRightDirectionIcon, CalendarIcon, CancelIcon, FileIcon, LinkedinBoldIcon, MailBoxIcon, OpenIcon, PhaseChangeIcon, PhoneIcon, PlusIcon, ReplyIcon, SendCRMIcon, SinglePersonIcon, TickCorrectBoxIcon, ViewConversationIcon, PencilEditIcon } from '../Icons';
import LeadPhaseTimelineHeader from './components/LeadPhaseTimelineHeader';
import ActionsDropdown from '../ActionsDropdown';
import AddNoteModal from './AddNoteModal';
import AddTaskModal from './AddTaskModal';
import LeadPhaseDropdown from './LeadPhaseDropdown';
import SentimentDropdown from './SentimentDropdown';
import EditNoteModal from './EditNoteModal';
import DeleteNoteModal from './DeleteNoteModal';
import { toast } from '@/lib/toast';

interface LeadProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: {
        id: string;
        name: string;
        title: string;
        company: string;
        email?: string;
        phone?: string;
        chatterDate?: string;
        internalDate?: string;
        phase: string;
        phaseColor: string;
        sentiment: string;
        crmStatus?: string;
        linkedinUrl?: string;
    } | null;
    allPhases: { id: string; title: string; color: string }[];
    onAddPhaseClick: () => void;
    onPhaseChange: (leadId: string, newPhase: string, newPhaseColor: string) => void;
    onSentimentChange: (leadId: string, newSentiment: string) => void;
    initialTab?: string;
}

// Timeline item type
interface TimelineItem {
    id: string;
    type: 'linkedin-sent' | 'linkedin-received' | 'phase-change' | 'task-chatter' | 'task-internal' | 'note' | 'system-update';
    date: string;
    message?: string;
    oldPhase?: string;
    newPhase?: string;
    newPhaseColor?: string;
    title?: string;
    description?: string;
    dueDate?: string;
    status?: string;
    author?: string;
    content?: string;
    assignedTo?: string;
}

// Initial mock timeline data
const initialMockTimelineData: TimelineItem[] = [
    {
        id: '1',
        type: 'linkedin-sent',
        date: '13 Mar 2025 - 10:55',
        message: 'Dag Ivo, Wij helpen bedrijven zoals jullie om structureel meer kwalitatieve leads te genereren via een doordachte leadgeneratie strategie die echt aansluit bij jullie doelgroep en salesproces.'
    },
    {
        id: '2',
        type: 'linkedin-received',
        date: '13 Mar 2025 - 10:02',
        message: 'Anna, bedankt. Wat kan je voor ons betekenen qua lead generatie? Wij zijn een importeur en distributeur van Huawei solar products and solutions. Gr. Ivo'
    },
    {
        id: '3',
        type: 'phase-change',
        date: '13 Mar 2025 - 10:02',
        oldPhase: 'New Lead',
        newPhase: 'Lead needs to be reviewed',
        newPhaseColor: '#FFECB6'
    },
    {
        id: '4',
        type: 'task-chatter',
        date: '13 Mar 2025 - 10:02',
        title: 'Task chatter submitted',
        description: 'Research their B2B focus and target segments before follow-up.',
        dueDate: '15 Mar 2025',
        status: 'open'
    },
    {
        id: '5',
        type: 'note',
        date: '13 Mar 2025 - 10:02',
        author: 'Anna',
        content: 'Lead seems interested in B2B lead generation. Good fit for our enterprise solution.'
    }
];


// Add above the component (or reuse — same function)
const formatDate = (date: string | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
};

const LeadProfileModal: React.FC<LeadProfileModalProps> = ({
    isOpen,
    onClose,
    lead,
    allPhases,
    onAddPhaseClick,
    onPhaseChange,
    onSentimentChange,
    initialTab = 'All'
}) => {
    const [activeTab, setActiveTab] = useState('All');
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [currentPhase, setCurrentPhase] = useState(lead?.phase || '');
    const [currentPhaseColor, setCurrentPhaseColor] = useState(lead?.phaseColor || '');
    const [currentSentiment, setCurrentSentiment] = useState(lead?.sentiment || '');
    const [currentCrmStatus, setCurrentCrmStatus] = useState(lead?.crmStatus || 'Not yet');
    const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
    const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

    // Add timeline state
    const [timelineData, setTimelineData] = useState<TimelineItem[]>(initialMockTimelineData);

    // Track current lead ID to detect when switching between different leads
    const [currentLeadId, setCurrentLeadId] = React.useState<string | null>(null);

    // Initialize state when lead changes
    React.useEffect(() => {
        if (lead) {
            console.log(lead, 'lead.crmStatus')
            // Only reset timeline if we're opening a DIFFERENT lead
            if (lead.id !== currentLeadId) {
                setTimelineData(initialMockTimelineData);
                setCurrentLeadId(lead.id);
            }

            // Always update to match current lead data
            setCurrentPhase(lead.phase);
            setCurrentPhaseColor(lead.phaseColor);
            setCurrentSentiment(lead.sentiment);
            setCurrentCrmStatus(lead.crmStatus || 'Not yet');
            setActiveTab(initialTab);
        }
    }, [lead, currentLeadId]);

    // NOW the early return is safe (after all hooks)
    if (!lead) return null;

    const handlePhaseChange = (newPhase: string, newPhaseColor: string) => {
        if (!lead) return;

        const oldPhase = currentPhase;

        setCurrentPhase(newPhase);
        setCurrentPhaseColor(newPhaseColor);

        // Call parent handler to update the lead in columns
        onPhaseChange(lead.id, newPhase, newPhaseColor);

        // Add phase change to timeline
        const now = new Date();
        const formattedDate = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()} - ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

        const phaseChangeEntry: TimelineItem = {
            id: `phase-change-${Date.now()}`,
            type: 'phase-change',
            date: formattedDate,
            oldPhase: oldPhase,
            newPhase: newPhase,
            newPhaseColor: newPhaseColor
        };

        // Add to beginning of timeline - use functional update
        setTimelineData(prevTimeline => [phaseChangeEntry, ...prevTimeline]);

        // Switch to "All" tab to show the change
        setActiveTab('All');

        // Show success toast
        toast.success('Lead phase updated');
    };

    const handleSentimentChange = (newSentiment: string) => {
        if (!lead) return;

        const oldSentiment = currentSentiment;

        setCurrentSentiment(newSentiment);

        // Call parent handler to update the lead in columns
        onSentimentChange(lead.id, newSentiment);

        // Add sentiment change to timeline
        const now = new Date();
        const formattedDate = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()} - ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

        const sentimentChangeEntry: TimelineItem = {
            id: `sentiment-change-${Date.now()}`,
            type: 'system-update',
            date: formattedDate,
            title: 'Sentiment Changed',
            content: `Sentiment changed from "${oldSentiment}" to "${newSentiment}"`
        };

        // Add to beginning of timeline - use functional update
        setTimelineData(prevTimeline => [sentimentChangeEntry, ...prevTimeline]);

        // Switch to "All" tab to show the change
        setActiveTab('All');

        // Show success toast
        toast.success('Sentiment updated');
    };

    // Handler for adding a note
    const handleAddNote = (noteContent: string) => {
        const now = new Date();
        const formattedDate = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()} - ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

        const newNote: TimelineItem = {
            id: `note-${Date.now()}`,
            type: 'note',
            date: formattedDate,
            author: 'You',
            content: noteContent
        };

        // Add to beginning of timeline (most recent first)
        setTimelineData([newNote, ...timelineData]);

        // Switch to "All" or "Notes" tab to show the new note
        if (activeTab !== 'All' && activeTab !== 'Notes') {
            setActiveTab('All');
        }
    };

    // Handle Edit a note
    const handleEditNote = (content: string) => {
        setTimelineData(prev => prev.map(i =>
            i.id === activeNoteId ? { ...i, content } : i
        ));
        setActiveNoteId(null);
    };

    // Delete a Note
    const handleDeleteNote = () => {
        setTimelineData(prev => prev.filter(i => i.id !== activeNoteId));
        setIsDeleteNoteModalOpen(false);
        setActiveNoteId(null);
        toast.success('Note deleted');
    };

    // Handler for adding a task
    const handleAddTask = (task: { title: string; note: string; dueDate: string; assignTo: string }) => {
        const now = new Date();
        const formattedDate = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()} - ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

        // Determine task type based on assignTo field (simple logic)
        const taskType: 'task-chatter' | 'task-internal' = task.assignTo === 'internal' ? 'task-internal' : 'task-chatter';

        const newTask: TimelineItem = {
            id: `task-${Date.now()}`,
            type: taskType,
            date: formattedDate,
            title: task.title,
            description: task.note || undefined,
            dueDate: task.dueDate || undefined,
            status: 'open',
            assignedTo: task.assignTo || undefined
        };

        // Add to beginning of timeline (most recent first)
        setTimelineData([newTask, ...timelineData]);

        // Switch to appropriate tab
        if (activeTab !== 'All' && activeTab !== 'Chatter Tasks') {
            setActiveTab('All');
        }
    };

    // Handle Cancel Tasks
    const handleCancelTask = (taskId: string, taskType: string) => {
        // Show confirmation before deleting
        const confirmed = window.confirm(
            `Are you sure you want to cancel this ${taskType === 'task-chatter' ? 'chatter' : 'internal'} task?`
        );

        if (confirmed) {
            // Remove task from timeline
            setTimelineData(prevTimeline => prevTimeline.filter(item => item.id !== taskId));

            // Show success toast
            toast.success('Task cancelled successfully');
        }
    };

    // Helper function to get initials
    const getInitials = (name: string): string => {
        const words = name.trim().split(' ');
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    const tabs = ['All', 'Notes', 'LinkedIn Messages', 'Chatter Tasks', 'Internal Tasks'];

    // Filter timeline based on active tab
    const filteredTimeline = timelineData.filter(item => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Notes' && item.type === 'note') return true;
        if (activeTab === 'LinkedIn Messages' && (item.type === 'linkedin-sent' || item.type === 'linkedin-received')) return true;
        if (activeTab === 'Chatter Tasks' && item.type === 'task-chatter') return true;
        if (activeTab === 'Internal Tasks' && item.type === 'task-internal') return true;
        return false;
    });

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                maxWidth="3xl"
                showCloseButton={true}
                zIndex={50}
            >
                {/* Lead Header */}
                <div className="mb-6 -mt-4 border border-stroke rounded-xl p-3 md:p-5">
                    {/* Avatar + Name + Title + Company */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary-button/10 border-2 border-stroke/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg md:text-xl font-semibold text-primary-button">
                                {getInitials(lead.name)}
                            </span>
                        </div>

                        {/* Name, Title, Company */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-lg md:text-xl font-semibold text-text-heading break-words">{lead.name}</h3>
                                <a
                                    href={lead.linkedinUrl || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <LinkedinBoldIcon size={16} className="text-calendar-picker flex-shrink-0" />
                                </a>

                            </div>
                            <p className="text-xs md:text-sm text-neutral-600 break-words">
                                {lead.title} at <span className="font-medium">{lead.company}</span>
                            </p>
                            {/* Contact Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs md:text-sm text-neutral-600 mt-3">
                                {lead.phone && (
                                    <div className="flex items-center gap-2">
                                        <PhoneIcon size={14} />
                                        <span className="break-all">{lead.phone}</span>
                                    </div>
                                )}
                                {lead.email && (
                                    <div className="flex items-center gap-2">
                                        <MailBoxIcon size={14} />
                                        <span className="break-all">{lead.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-row sm:items-center gap-3 sm:gap-6 text-xs text-neutral-600 mb-4">
                        {lead.chatterDate && (
                            <div className="flex items-center gap-1 border border-stroke py-1.5 px-2.5 rounded-full w-fit">
                                <TickCorrectBoxIcon size={12} className="hidden sm:inline-block" />
                                <span>Chatter: {formatDate(lead.chatterDate)}</span>
                            </div>
                        )}
                        {lead.internalDate && (
                            <div className="flex items-center gap-1 border border-stroke py-1.5 px-2.5 rounded-full w-fit">
                                <TickCorrectBoxIcon size={12} className="hidden sm:inline-block" />
                                <span>Internal: {formatDate(lead.internalDate)}</span>
                            </div>
                        )}
                    </div>

                    <hr className='w-full my-4 border-stroke' />

                    {/* Dropdowns - Lead Phase, Sentiment, CRM */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Lead Phase Dropdown - Takes full width on mobile */}
                        <div className="w-full md:w-auto">
                            <LeadPhaseDropdown
                                currentPhase={currentPhase}
                                currentPhaseColor={currentPhaseColor}
                                allPhases={allPhases}
                                onPhaseChange={handlePhaseChange}
                                onAddPhaseClick={() => {
                                    onClose();
                                    onAddPhaseClick();
                                }}
                            />
                        </div>

                        {/* Sentiment Dropdown - Shares row with CRM on mobile */}
                        <div className="flex-1 md:flex-none md:w-auto">
                            <SentimentDropdown
                                currentSentiment={currentSentiment}
                                onSentimentChange={handleSentimentChange}
                            />
                        </div>

                        {/* CRM Status - Shares row with Sentiment on mobile */}
                        <span className="px-3 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap">
                            CRM: {currentCrmStatus}
                        </span>
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="border-t border-stroke pt-4 md:pt-6">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h4 className="text-xs md:text-sm font-semibold text-text/80 uppercase tracking-wide">
                            Activity Timeline
                        </h4>
                        <ActionsDropdown
                            trigger={
                                <button className="w-8 h-8 flex items-center justify-center rounded-full border border-stroke bg-neutral-50 hover:bg-neutral-100 cursor-pointer transition-colors">
                                    <PlusIcon size={14} />
                                </button>
                            }
                            actions={[
                                {
                                    id: 'add-note',
                                    label: 'Add a note',
                                    icon: <AddNoteIcon size={18} />,
                                    onClick: () => {
                                        setIsAddNoteModalOpen(true);
                                    }
                                },
                                {
                                    id: 'add-task',
                                    label: 'Add a task',
                                    icon: <AddTaskIcon size={18} />,
                                    onClick: () => {
                                        setIsAddTaskModalOpen(true);
                                    }
                                },
                                {
                                    id: 'send-to-crm',
                                    label: 'Send to CRM',
                                    icon: <SendCRMIcon size={18} />,
                                    onClick: () => {
                                        setCurrentCrmStatus('Sent');
                                        toast.success('Lead sent to CRM');
                                    }
                                }
                            ]}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-4 md:mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === tab
                                    ? 'bg-icon-linkedin text-white'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Timeline Content */}
                    <div className="space-y-4 md:space-y-6 pr-1 md:pr-2 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                        {filteredTimeline.length > 0 ? (
                            filteredTimeline.map((item, index) => (
                                <div key={item.id} className="flex gap-3 md:gap-4 relative">
                                    {/* Vertical Line - connects icons */}
                                    {index !== filteredTimeline.length - 1 && (
                                        <div className="absolute left-3 md:left-4 top-9 bottom-0 w-0.5 bg-stroke -mb-4 md:-mb-6" />
                                    )}

                                    {/* Icon */}
                                    <div className="flex-shrink-0 relative z-10">
                                        {item.type === 'linkedin-sent' || item.type === 'linkedin-received' ? (
                                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white/90 bg-icon-linkedin flex items-center justify-center">
                                                <LinkedinBoldIcon size={14} className="text-white md:w-4 md:h-4" />
                                            </div>
                                        ) : item.type === 'phase-change' ? (
                                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white/90 bg-icon-linkedin flex items-center justify-center">
                                                <PhaseChangeIcon size={14} className="text-white md:w-4 md:h-4" />
                                            </div>
                                        ) : item.type === 'task-chatter' || item.type === 'task-internal' ? (
                                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white/90 bg-icon-linkedin flex items-center justify-center">
                                                <TickCorrectBoxIcon size={14} className="text-white md:w-4 md:h-4" />
                                            </div>
                                        ) : (
                                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white/90 bg-icon-linkedin flex items-center justify-center">
                                                <FileIcon size={14} className="text-white md:w-4 md:h-4" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Date */}
                                        <p className="text-2xs md:text-xs font-medium text-text mb-2">{item.date}</p>

                                        {/* LinkedIn Message Sent */}
                                        {item.type === 'linkedin-sent' && (
                                            <LeadPhaseTimelineHeader title="LinkedIn Message Sent">
                                                <div className='px-3 md:px-4 pb-3 md:pb-4'>
                                                    <div className="flex justify-end">
                                                        <div className="bg-primary-button w-full sm:w-11/12 text-white rounded-2xl rounded-br-md p-3 md:p-4 mb-2">
                                                            <p className="text-xs md:text-sm break-words">{item.message}</p>
                                                        </div>
                                                    </div>
                                                    {/* <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs md:text-sm font-medium pt-2 md:pt-3">
                                                        <button
                                                            onClick={() => toast.info('Opening LinkedIn reply...')}
                                                            className="flex items-center gap-2 text-primary-button cursor-pointer w-fit">
                                                            <ReplyIcon size={14} />
                                                            Reply to LinkedIn
                                                        </button>
                                                        <button
                                                            onClick={() => toast.info('Opening conversation...')}
                                                            className="flex items-center gap-2 text-neutral-600 hover:underline w-fit">
                                                            <ViewConversationIcon size={14} />
                                                            View conversation
                                                        </button>
                                                    </div> */}
                                                </div>
                                            </LeadPhaseTimelineHeader>
                                        )}

                                        {/* LinkedIn Message Received */}
                                        {item.type === 'linkedin-received' && (
                                            <LeadPhaseTimelineHeader title="LinkedIn Message Received">
                                                <div className='px-3 md:px-4 pb-3 md:pb-4'>
                                                    <div className="flex justify-start">
                                                        <div className="bg-neutral-100 w-full sm:w-11/12 text-text-heading rounded-2xl rounded-bl-md p-3 md:p-4 mb-2">
                                                            <p className="text-xs md:text-sm break-words">{item.message}</p>
                                                        </div>
                                                    </div>
                                                    {/* <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs md:text-sm font-medium pt-2 md:pt-3">
                                                        <button
                                                            onClick={() => toast.info('Opening LinkedIn reply...')}
                                                            className="flex items-center gap-2 text-primary-button cursor-pointer w-fit">
                                                            <ReplyIcon size={14} />
                                                            Reply to LinkedIn
                                                        </button>
                                                        <button
                                                            onClick={() => toast.info('Opening conversation...')}
                                                            className="flex items-center gap-2 text-neutral-600 hover:underline w-fit">
                                                            <ViewConversationIcon size={14} />
                                                            View conversation
                                                        </button>
                                                    </div> */}
                                                </div>
                                            </LeadPhaseTimelineHeader>
                                        )}

                                        {/* Phase Change */}
                                        {item.type === 'phase-change' && (
                                            <LeadPhaseTimelineHeader title="Phase Change">
                                                <div className='px-3 md:px-4 pb-3 md:pb-4'>
                                                    <div className="flex flex-wrap sm:items-center gap-2 sm:gap-3">
                                                        <span className="px-3 py-1.5 text-text border border-stroke text-2xs md:text-xs font-medium rounded-full w-fit">
                                                            {item.oldPhase}
                                                        </span>
                                                        <ArrowRightDirectionIcon className='text-neutral-700 hidden sm:block' size={10} />
                                                        <span className="px-3 py-1.5 border border-phase-green-dark/20 bg-phase-green-dark/20 text-phase-green-dark text-2xs md:text-xs font-medium rounded-full w-fit">
                                                            {item.newPhase}
                                                        </span>
                                                    </div>
                                                </div>
                                            </LeadPhaseTimelineHeader>
                                        )}

                                        {/* Task Chatter or Internal */}
                                        {(item.type === 'task-chatter' || item.type === 'task-internal') && (
                                            <LeadPhaseTimelineHeader
                                                title={item.title || (item.type === 'task-chatter' ? 'Chatter Task' : 'Internal Task')}
                                                headerActions={
                                                    <div className="flex flex-row gap-2 sm:gap-3">
                                                        <button
                                                            onClick={() => handleCancelTask(item.id, item.type)}
                                                            className="text-2xs md:text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1 cursor-pointer w-fit">
                                                            <CancelIcon size={12} />
                                                            Cancel {item.type === 'task-chatter' ? 'chatter' : 'internal'} task
                                                        </button>
                                                        {/* <button
                                                            onClick={() => toast.info('Opening task details...')}
                                                            className="text-2xs md:text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1 cursor-pointer w-fit">
                                                            <OpenIcon size={12} />
                                                            Open
                                                        </button> */}
                                                    </div>
                                                }
                                            >
                                                <div className='px-3 md:px-4 pb-3 md:pb-4'>
                                                    {item.description && (
                                                        <p className="text-xs md:text-sm text-neutral-600 mb-2 break-words">{item.description}</p>
                                                    )}
                                                    {item.assignedTo && (
                                                        <p className="text-2xs md:text-xs text-neutral-500 mb-2">
                                                            Assigned to: <span className="font-medium">{item.assignedTo}</span>
                                                        </p>
                                                    )}
                                                    {item.dueDate && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-2xs md:text-xs font-medium rounded-full">
                                                            <CalendarIcon size={12} className='text-red-600' />
                                                            due: {formatDate(item.dueDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeadPhaseTimelineHeader>
                                        )}

                                        {/* System Update */}
                                        {item.type === 'system-update' && (
                                            <LeadPhaseTimelineHeader
                                                title={item.title || 'System Update'}
                                                headerActions={
                                                    <span className="text-2xs md:text-xs text-neutral-500 flex items-center gap-1">
                                                        <SinglePersonIcon size={12} />
                                                        System
                                                    </span>
                                                }
                                            >
                                                <div className='px-3 md:px-4 pb-3 md:pb-4'>
                                                    <p className="text-xs md:text-sm text-neutral-600 mb-2 break-words">{item.content}</p>
                                                </div>
                                            </LeadPhaseTimelineHeader>
                                        )}

                                        {/* Note - ONLY for human-added notes */}
                                        {item.type === 'note' && (
                                            <LeadPhaseTimelineHeader
                                                title={'Note'}
                                                headerActions={
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xs md:text-xs text-neutral-500 flex items-center gap-1">
                                                            <SinglePersonIcon size={12} />
                                                            {item.author}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setActiveNoteId(item.id);
                                                                setIsEditNoteModalOpen(true);
                                                            }}
                                                            className="text-2xs md:text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1 cursor-pointer transition-colors"
                                                        >
                                                            <PencilEditIcon size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActiveNoteId(item.id);
                                                                setIsDeleteNoteModalOpen(true);
                                                            }}
                                                            className="text-2xs md:text-xs text-neutral-500 hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                                                        >
                                                            <CancelIcon size={12} />
                                                        </button>
                                                    </div>
                                                }
                                            >
                                                <div className='px-3 md:px-4 pb-3 md:pb-4'>
                                                    <p className="text-xs md:text-sm text-neutral-600 mb-2 break-words">{item.content}</p>
                                                </div>
                                            </LeadPhaseTimelineHeader>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs md:text-sm text-neutral-400 text-center py-8">
                                No {activeTab.toLowerCase()} found
                            </p>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Add Note Modal */}
            <AddNoteModal
                isOpen={isAddNoteModalOpen}
                onClose={() => setIsAddNoteModalOpen(false)}
                onSubmit={handleAddNote}
            />

            {/* Add Task Modal */}
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onSubmit={handleAddTask}
            />

            <EditNoteModal
                isOpen={isEditNoteModalOpen}
                onClose={() => { setIsEditNoteModalOpen(false); setActiveNoteId(null); }}
                initialContent={timelineData.find(i => i.id === activeNoteId)?.content || ''}
                onSubmit={handleEditNote}
            />

            <DeleteNoteModal
                isOpen={isDeleteNoteModalOpen}
                onClose={() => { setIsDeleteNoteModalOpen(false); setActiveNoteId(null); }}
                onConfirm={handleDeleteNote}
            />
        </>
    );
};

export default LeadProfileModal;