
import { supabase } from './supabase';
import { Project, Task, Document, TaskStatus, TaskPriority } from '../types';

export const dataService = {
  async fetchAll() {
    const { data: projects } = await supabase.from('projects').select('*');
    const { data: tasks } = await supabase.from('tasks').select('*');
    const { data: documents } = await supabase.from('documents').select('*');
    
    return {
      projects: (projects || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        createdAt: p.created_at ? new Date(p.created_at) : new Date()
      })) as Project[],
      
      tasks: (tasks || []).map((t: any) => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        assignee: t.assignee,
        dueDate: t.due_date ? new Date(t.due_date) : undefined,
        dependencies: t.dependencies || [],
        linkedDocumentId: t.linked_document_id,
        agentStatus: t.agent_status,
        agentResult: t.agent_result,
        createdAt: t.created_at ? new Date(t.created_at) : new Date(),
        updatedAt: t.updated_at ? new Date(t.updated_at) : new Date()
      })) as Task[],
      
      documents: (documents || []).map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        title: d.title,
        content: d.content,
        tags: d.tags || [],
        updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
      })) as Document[]
    };
  },

  async createProject(project: Project) {
    await supabase.from('projects').insert({
      id: project.id,
      title: project.title,
      icon: project.icon,
      created_at: project.createdAt.toISOString()
    });
  },

  async createTask(task: Task) {
    await supabase.from('tasks').insert({
      id: task.id,
      project_id: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      due_date: task.dueDate?.toISOString(),
      dependencies: task.dependencies,
      linked_document_id: task.linkedDocumentId,
      agent_status: task.agentStatus,
      agent_result: task.agentResult,
      created_at: task.createdAt.toISOString(),
      updated_at: task.updatedAt.toISOString()
    });
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    // Map app types to DB types
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
    if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;
    if (updates.linkedDocumentId !== undefined) dbUpdates.linked_document_id = updates.linkedDocumentId;
    if (updates.agentStatus !== undefined) dbUpdates.agent_status = updates.agentStatus;
    if (updates.agentResult !== undefined) dbUpdates.agent_result = updates.agentResult;

    await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
  },

  async deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId);
  },

  async createDocument(doc: Document) {
    await supabase.from('documents').insert({
      id: doc.id,
      project_id: doc.projectId,
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      updated_at: doc.updatedAt.toISOString()
    });
  },

  async updateDocument(docId: string, updates: Partial<Document>) {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

    await supabase.from('documents').update(dbUpdates).eq('id', docId);
  },

  async fetchGoogleEvents(): Promise<Task[]> {
    // Simulation: In a real app, this would call Google Calendar API via a secure backend proxy
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const nextWeek = new Date(now.getTime() + 7 * 86400000);

    return [
        { 
            id: 'g_cal_1', 
            projectId: '', // External items don't belong to an internal project 
            title: 'Client Meeting: Q3 Review', 
            status: TaskStatus.TODO, 
            priority: TaskPriority.HIGH, 
            dueDate: now, 
            assignee: 'Google Calendar', 
            externalType: 'GOOGLE_CALENDAR',
            createdAt: now, 
            updatedAt: now 
        },
        { 
            id: 'g_cal_2', 
            projectId: '', 
            title: 'Team Sync', 
            status: TaskStatus.TODO, 
            priority: TaskPriority.MEDIUM, 
            dueDate: tomorrow, 
            assignee: 'Google Calendar', 
            externalType: 'GOOGLE_CALENDAR',
            createdAt: now, 
            updatedAt: now 
        },
        { 
            id: 'g_cal_3', 
            projectId: '', 
            title: 'Product Demo', 
            status: TaskStatus.TODO, 
            priority: TaskPriority.HIGH, 
            dueDate: nextWeek, 
            assignee: 'Google Calendar', 
            externalType: 'GOOGLE_CALENDAR',
            createdAt: now, 
            updatedAt: now 
        }
    ];
  }
};
