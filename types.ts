

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
  CANVAS = 'CANVAS'
}

export interface Project {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  createdAt: Date;
}

export interface Document {
  id: string;
  projectId: string; // Relational Link
  title: string;
  content: string;
  updatedAt: Date;
  tags: string[];
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
  status: 'pending' | 'processed';
  createdAt: Date;
  processedResult?: InboxAction; 
}

export interface InboxAction {
  actionType: 'create_task' | 'create_document';
  targetProjectId: string;
  data: {
    title: string;
    description?: string; 
    content?: string;     
    priority?: TaskPriority;
  };
  reasoning: string;
}

export interface Source {
  id: string;
  title: string;
  type: 'document' | 'task';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: Attachment[];
  sources?: Source[];
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
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

export interface CanvasNode {
  id: string;
  type: 'note' | 'task';
  content: string;
  x: number;
  y: number;
  color?: string;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
}
