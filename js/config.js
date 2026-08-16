/* config.js — app-wide constants, status/priority maps, sample seed data */

const CONFIG = {
  DB_NAME: 'ProjectFlowDB',
  DB_VERSION: 1,
  AUTOSAVE_DELAY: 1000,
  SEARCH_DELAY: 300,

  STATUSES: {
    todo:        { label: 'To Do',       color: '#6B7280', bg: '#F3F4F6' },
    in_progress: { label: 'In Progress', color: '#3B82F6', bg: '#EFF6FF' },
    review:      { label: 'In Review',   color: '#F59E0B', bg: '#FFFBEB' },
    done:        { label: 'Done',        color: '#10B981', bg: '#ECFDF5' },
    blocked:     { label: 'Blocked',     color: '#EF4444', bg: '#FEF2F2' }
  },

  PRIORITIES: {
    critical: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2' },
    high:     { label: 'High',     color: '#EA580C', bg: '#FFF7ED' },
    medium:   { label: 'Medium',   color: '#D97706', bg: '#FFFBEB' },
    low:      { label: 'Low',      color: '#65A30D', bg: '#F7FEE7' }
  },

  PROJECT_COLORS: [
    '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
    '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#82E0AA'
  ],

  KANBAN_COLUMNS: ['todo','in_progress','review','done','blocked'],

  VIEWS: {
    kanban:      'Kanban Board',
    gantt:       'Gantt Chart',
    calendar:    'Calendar',
    timeline:    'Timeline',
    eisenhower:  'Priority Matrix',
    dashboard:   'Dashboard'
  }
};

/* ── Sample seed data loaded on first launch ─────────────── */
const SAMPLE_DATA = {
  version: '1.0',
  workspace: {
    id: 'ws_1',
    name: 'My Workspace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  teams: [
    { id: 'team_1', name: 'Engineering', description: 'Frontend & Backend', members: ['user_1','user_2','user_4'], color: '#4A90E2' },
    { id: 'team_2', name: 'Design',      description: 'UX & Visual design', members: ['user_3'],                  color: '#7B68EE' }
  ],
  users: [
    { id: 'user_1', name: 'Alice Chen',  email: 'alice@example.com', color: '#FF6B6B', role: 'Project Lead', teamId: 'team_1' },
    { id: 'user_2', name: 'Bob Smith',   email: 'bob@example.com',   color: '#4ECDC4', role: 'Developer',    teamId: 'team_1' },
    { id: 'user_3', name: 'Carol White', email: 'carol@example.com', color: '#45B7D1', role: 'Designer',     teamId: 'team_2' },
    { id: 'user_4', name: 'Dan Brown',   email: 'dan@example.com',   color: '#96CEB4', role: 'Developer',    teamId: 'team_1' }
  ],
  projects: [
    {
      id: 'proj_1', name: 'Website Redesign', description: 'Full overhaul of the company website',
      teamId: 'team_1', status: 'in_progress', startDate: '2026-01-01', endDate: '2026-06-30',
      owner: 'user_1', priority: 'high', color: '#FF6B6B',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'proj_2', name: 'Mobile App', description: 'iOS & Android application',
      teamId: 'team_2', status: 'planning', startDate: '2026-03-01', endDate: '2026-09-30',
      owner: 'user_3', priority: 'medium', color: '#4A90E2',
      createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z'
    },
    {
      id: 'proj_3', name: 'API Integration', description: 'Third-party API integrations',
      teamId: 'team_1', status: 'completed', startDate: '2025-10-01', endDate: '2026-02-28',
      owner: 'user_2', priority: 'low', color: '#7B68EE',
      createdAt: '2025-10-01T00:00:00Z', updatedAt: '2025-10-01T00:00:00Z'
    }
  ],
  tasks: [
    {
      id: 'task_1', projectId: 'proj_1',
      title: 'Design homepage wireframes',
      description: 'Create responsive wireframes for mobile, tablet, and desktop breakpoints. Focus on mobile-first.',
      status: 'in_progress', priority: 'high', assignedTo: ['user_1','user_3'],
      startDate: '2026-01-08', dueDate: '2026-05-25', estimatedHours: 16, completionPercentage: 60,
      labels: ['design','frontend'],
      subtasks: [
        { id: 'st_1', title: 'Mobile wireframe',  completed: true  },
        { id: 'st_2', title: 'Tablet wireframe',  completed: true  },
        { id: 'st_3', title: 'Desktop wireframe', completed: false }
      ],
      comments: [
        { id: 'c_1', author: 'user_1', text: 'Started with mobile-first approach', timestamp: '2026-01-10T14:30:00Z' }
      ],
      attachments: [],
      createdAt: '2026-01-01T00:00:00Z', createdBy: 'user_1',
      updatedAt: '2026-01-15T00:00:00Z', updatedBy: 'user_3'
    },
    {
      id: 'task_2', projectId: 'proj_1',
      title: 'Implement navigation component',
      description: 'Build responsive navigation with hamburger menu for mobile',
      status: 'todo', priority: 'high', assignedTo: ['user_2'],
      startDate: '2026-01-15', dueDate: '2026-05-15', estimatedHours: 8, completionPercentage: 0,
      labels: ['frontend','component'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2026-01-01T00:00:00Z', createdBy: 'user_1',
      updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'user_1'
    },
    {
      id: 'task_3', projectId: 'proj_1',
      title: 'User testing session',
      description: 'Conduct UX testing with 5 users and document findings',
      status: 'review', priority: 'medium', assignedTo: ['user_3'],
      startDate: '2026-01-20', dueDate: '2026-04-20', estimatedHours: 4, completionPercentage: 80,
      labels: ['ux','testing'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2026-01-01T00:00:00Z', createdBy: 'user_1',
      updatedAt: '2026-01-20T00:00:00Z', updatedBy: 'user_3'
    },
    {
      id: 'task_4', projectId: 'proj_1',
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: 'done', priority: 'low', assignedTo: ['user_2'],
      startDate: '2026-01-05', dueDate: '2026-01-20', estimatedHours: 6, completionPercentage: 100,
      labels: ['devops'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2026-01-01T00:00:00Z', createdBy: 'user_2',
      updatedAt: '2026-01-20T00:00:00Z', updatedBy: 'user_2'
    },
    {
      id: 'task_5', projectId: 'proj_2',
      title: 'App architecture planning',
      description: 'Define React Native architecture and state management strategy',
      status: 'todo', priority: 'critical', assignedTo: ['user_3','user_4'],
      startDate: '2026-03-01', dueDate: '2026-05-10', estimatedHours: 20, completionPercentage: 0,
      labels: ['architecture','planning'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2026-03-01T00:00:00Z', createdBy: 'user_3',
      updatedAt: '2026-03-01T00:00:00Z', updatedBy: 'user_3'
    },
    {
      id: 'task_6', projectId: 'proj_2',
      title: 'Design system setup',
      description: 'Create component library with design tokens and documentation',
      status: 'in_progress', priority: 'high', assignedTo: ['user_3'],
      startDate: '2026-03-05', dueDate: '2026-05-30', estimatedHours: 12, completionPercentage: 30,
      labels: ['design','frontend'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2026-03-01T00:00:00Z', createdBy: 'user_3',
      updatedAt: '2026-03-05T00:00:00Z', updatedBy: 'user_3'
    },
    {
      id: 'task_7', projectId: 'proj_3',
      title: 'OAuth2 integration',
      description: 'Implement OAuth2 authentication flow with major providers',
      status: 'done', priority: 'high', assignedTo: ['user_1','user_2'],
      startDate: '2025-10-01', dueDate: '2025-11-30', estimatedHours: 24, completionPercentage: 100,
      labels: ['backend','auth'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2025-10-01T00:00:00Z', createdBy: 'user_1',
      updatedAt: '2025-11-30T00:00:00Z', updatedBy: 'user_2'
    },
    {
      id: 'task_8', projectId: 'proj_3',
      title: 'Rate limiting middleware',
      description: 'Add API rate limiting to prevent abuse',
      status: 'blocked', priority: 'medium', assignedTo: ['user_2'],
      startDate: '2025-12-01', dueDate: '2026-04-20', estimatedHours: 8, completionPercentage: 50,
      labels: ['backend'],
      subtasks: [], comments: [], attachments: [],
      createdAt: '2025-12-01T00:00:00Z', createdBy: 'user_1',
      updatedAt: '2025-12-15T00:00:00Z', updatedBy: 'user_2'
    }
  ],
  settings: {
    autoSave: true,
    theme: 'light',
    defaultView: 'kanban',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  }
};
