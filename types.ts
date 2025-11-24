
export enum ViewMode {
  DOCUMENTS = 'DOCUMENTS',
  BOARD = 'BOARD',
  CALENDAR = 'CALENDAR',
  GRAPH = 'GRAPH', // NEW
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

export interface Task {
  id: string;
  projectId: string; // Relational Link
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  dependencies?: string[]; // IDs of tasks this task depends on
  linkedDocumentId?: string; // ID of the document this task has expanded into
}

export interface InboxItem {
  id: string;
  content: string;
  type: 'text' | 'audio';
  status: 'pending' | 'processed';
  createdAt: Date;
  processedResult?: InboxAction; // Store the AI suggestion
}

export interface InboxAction {
  actionType: 'create_task' | 'create_document';
  targetProjectId: string;
  data: {
    title: string;
    description?: string; // For Tasks
    content?: string;     // For Docs
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
