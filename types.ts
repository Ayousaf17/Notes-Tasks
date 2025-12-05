
export enum ViewMode {
  HOME = 'HOME', 
  DOCUMENTS = 'DOCUMENTS',
  BOARD = 'BOARD',
  CALENDAR = 'CALENDAR',
  GRAPH = 'GRAPH',
  INBOX = 'INBOX',
  REVIEW = 'REVIEW',
  SETTINGS = 'SETTINGS',
  GLOBAL_BOARD = 'GLOBAL_BOARD',
  GLOBAL_CALENDAR = 'GLOBAL_CALENDAR',
  PROJECT_OVERVIEW = 'PROJECT_OVERVIEW',
  CLIENTS = 'CLIENTS' 
}

export interface Project {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  clientId?: string; 
  createdAt: Date;
}

export interface ClientActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  content: string;
  timestamp: Date;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: 'Lead' | 'Negotiation' | 'Active' | 'Churned';
  value: number; 
  lastContact: Date;
  tags: string[];
  activities?: ClientActivity[];
  notes?: string;
  googleDriveFolder?: string; 
}

export interface Document {
  id: string;
  projectId: string; 
  title: string;
  content: string;
  updatedAt: Date;
  tags: string[];
  lastSyncedAt?: Date; 
}

export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum AgentRole {
  RESEARCHER = 'AI_RESEARCHER',
  WRITER = 'AI_WRITER',
  PLANNER = 'AI_PLANNER',
}

export interface AgentResult {
  output: string;
  type: 'text' | 'checklist';
  timestamp: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  dueDate?: Date;
  reminderTime?: Date;
  priority?: TaskPriority;
  dependencies?: string[]; 
  linkedDocumentId?: string;
  
  createdAt: Date;
  updatedAt: Date;

  agentStatus?: 'idle' | 'working' | 'completed' | 'failed';
  agentResult?: AgentResult;

  externalType?: 'GOOGLE_CALENDAR';
}

export interface InboxItem {
  id: string;
  content: string;
  type: 'text' | 'audio' | 'file';
  fileName?: string;
  attachments?: Attachment[]; // Added for deep analysis
  status: 'pending' | 'processed';
  createdAt: Date;
  processedResult?: InboxAction; 
}

export interface InboxAction {
  actionType: 'create_task' | 'create_document' | 'create_project' | 'mixed';
  targetProjectId: string;
  data: {
    title: string;
    description?: string; 
    content?: string;     
    priority?: TaskPriority;
    // Smart features
    tags?: string[];
    extractedTasks?: Array<{
        title: string;
        description?: string;
        priority: TaskPriority;
        assignee?: string;
        dueDate?: string;
    }>;
  };
  projectPlan?: ProjectPlan; 
  reasoning: string;
}

export interface Source {
  id: string;
  title: string;
  type: 'document' | 'task';
}

// NEW: ActionProposal for HITL (Human-in-the-loop) flows
export interface ActionProposal {
  type: 'create_task';
  data: Partial<Task>;
  status: 'proposed' | 'confirmed' | 'cancelled';
  originalToolCall: string; // To keep track
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: Attachment[];
  sources?: Source[];
  planProposal?: ProjectPlan; 
  actionProposal?: ActionProposal; // NEW field for UI widgets
}

export interface Attachment {
  mimeType: string;
  data: string; 
  name?: string;
}

export interface ProjectPlan {
  projectTitle: string;
  overviewContent: string;
  tasks: Array<Partial<Task> & { dueDate?: string }>;
}

export interface UserContext {
  googleConnected: boolean;
  userName: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'task' | 'command' | 'project';
  subtitle?: string;
  action?: () => void;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  connected: boolean;
  category: 'Cloud' | 'AI' | 'Productivity';
  config?: {
    apiKey?: string;
    requiresAuth?: boolean;
  };
  status?: 'idle' | 'connecting' | 'connected';
}
