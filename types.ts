
export enum ViewMode {
  HOME = 'HOME', 
  DOCUMENTS = 'DOCUMENTS',
  BOARD = 'BOARD',
  CALENDAR = 'CALENDAR',
  GRAPH = 'GRAPH',
  INBOX = 'INBOX',
}

export interface Project {
  id: string;
  title: string;
  icon?: string; // e.g. "🚀"
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

// NEW: Agent Roles
export enum AgentRole {
  RESEARCHER = 'AI_RESEARCHER', // Finds info, summarizes
  WRITER = 'AI_WRITER',         // Drafts content
  PLANNER = 'AI_PLANNER',       // Breaks down into subtasks
}

export interface AgentResult {
  output: string;
  type: 'text' | 'checklist';
  timestamp: Date;
}

export interface Task {
  id: string;
  projectId: string; // Relational Link
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string; // Can be 'Me', 'Alice', or 'AI_RESEARCHER', etc.
  dueDate?: Date;
  priority?: TaskPriority;
  dependencies?: string[]; 
  linkedDocumentId?: string;
  
  // NEW: Agent State
  agentStatus?: 'idle' | 'working' | 'completed' | 'failed';
  agentResult?: AgentResult;
}

export interface InboxItem {
  id: string;
  content: string;
  type: 'text' | 'audio';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  name?: string;
}

export interface ProjectPlan {
  projectTitle: string;
  overviewContent: string;
  tasks: Partial<Task>[];
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
