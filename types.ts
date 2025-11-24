export enum ViewMode {
  DOCUMENTS = 'DOCUMENTS',
  BOARD = 'BOARD',
  CALENDAR = 'CALENDAR',
}

export interface Document {
  id: string;
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
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  dependencies?: string[]; // IDs of tasks this task depends on
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