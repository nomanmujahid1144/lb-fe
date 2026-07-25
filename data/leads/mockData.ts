export const leadsColumns = [
  {
    id: 'needs-review',
    title: 'Lead needs to be reviewed',
    count: 3,
    color: 'bg-yellow-100',
    isVertical: false,
    cards: [
      {
        id: '1',
        name: 'Koen Driessens',
        title: 'Chief Executive Officer',
        company: 'TM Induction Heating',
        chatterDate: 'N/A',
        internalDate: 'N/A',
        sentiment: 'POS maybe interested',
        lastLinkedinDate: '2025-03-13',
        // avatars: ['/leads/avatar-1.png', '/leads/avatar-2.png']
        linkedinUrl: 'https://linkedin.com/in/koendriessens'
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        title: 'Marketing Director',
        company: 'Digital Ventures',
        chatterDate: '2025-03-15',
        internalDate: '2026-03-06',
        sentiment: 'Neutral',
        lastLinkedinDate: '2026-03-05',
        // avatars: ['/leads/avatar-3.png'],
        linkedinUrl: 'https://linkedin.com/in/sarahjohnson'
      },
      {
        id: '3',
        name: 'Michael Chen',
        title: 'VP of Sales',
        company: 'Growth Solutions',
        chatterDate: '2025-03-15',
        internalDate: '2026-03-05',
        sentiment: 'POS interested',
        lastLinkedinDate: '2026-01-10',
        // avatars: ['/leads/avatar-1.png', '/leads/avatar-2.png']
        linkedinUrl: 'https://linkedin.com/in/michaelchen'
      }
    ]
  },
  {
    id: 'follow-up-myself',
    title: 'Will follow up myself',
    count: 1,
    color: 'bg-blue-100',
    isVertical: false,
    cards: [
      {
        id: '4',
        name: 'Arnoud van Lent',
        title: 'Enterprise Account Manager',
        company: 'Cohelity',
        chatterDate: '2025-03-15',
        internalDate: '2026-01-04',
        sentiment: 'Interested in follow-up',
        lastLinkedinDate: '2025-11-15',
        // avatars: ['/leads/avatar-3.png']
        linkedinUrl: 'https://linkedin.com/in/arnoudvanlent'
      }
    ]
  },
  {
    id: 'leadblocks-follow-up',
    title: 'LeadBlocks can follow up',
    count: 0,
    color: 'bg-neutral-100',
    isVertical: false,
    cards: [
      {
        id: '5',
        name: 'Emma Belean',
        title: 'Business Development Manager',
        company: 'b futurist',
        chatterDate: '2025-03-15',
        internalDate: '2026-01-04',
        sentiment: 'Neutral',
        lastLinkedinDate: '2025-08-01',
        // avatars: ['/leads/avatar-1.png', '/leads/avatar-2.png']
        linkedinUrl: 'https://linkedin.com/in/emmabelean'
      }
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    count: 1,
    color: 'bg-purple-100',
    isVertical: true,
    cards: []
  },
  {
    id: 'meeting-planned',
    title: 'Meeting planned',
    count: 1,
    color: 'bg-green-100',
    isVertical: true,
    cards: []
  },
  {
    id: 'archived',
    title: 'Archived',
    count: 7,
    color: 'bg-neutral-100',
    isVertical: true,
    cards: []
  }
];