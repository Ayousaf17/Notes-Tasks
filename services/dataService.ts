
import { supabase } from './supabase';
import { Project, Task, Document, TaskStatus, TaskPriority, Client } from '../types';

export const dataService = {
  async fetchAll() {
    try {
        const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
        if (projectsError) console.warn("Supabase Projects Error:", projectsError);

        const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
        if (tasksError) console.warn("Supabase Tasks Error:", tasksError);

        const { data: documents, error: docsError } = await supabase.from('documents').select('*');
        if (docsError) console.warn("Supabase Documents Error:", docsError);
        
        // Mock Clients Data (since DB might not have table yet)
        const mockClients: Client[] = [
            { id: 'c1', name: 'Alice Corp', company: 'Alice Inc.', email: 'alice@corp.com', status: 'Active', value: 15000, lastContact: new Date(), tags: ['Tech'] },
            { id: 'c2', name: 'Bob Smith', company: 'Smith Designs', email: 'bob@smith.com', status: 'Lead', value: 5000, lastContact: new Date(Date.now() - 86400000 * 3), tags: ['Design'] }
        ];

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
            reminderTime: t.reminder_time ? new Date(t.reminder_time) : undefined,
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
          })) as Document[],

          clients: mockClients
        };
    } catch (e) {
        console.error("CRITICAL: Failed to fetch data from Supabase. Returning empty state to prevent crash.", e);
        return { projects: [], tasks: [], documents: [], clients: [] };
    }
  },

  async createProject(project: Project) {
    try {
        await supabase.from('projects').insert({
            id: project.id,
            title: project.title,
            icon: project.icon,
            created_at: project.createdAt.toISOString()
        });
    } catch (e) { console.error("Create Project Failed", e); }
  },

  async deleteProject(projectId: string) {
    try {
        await supabase.from('projects').delete().eq('id', projectId);
    } catch (e) { console.error("Delete Project Failed", e); }
  },

  async createTask(task: Task) {
    try {
        await supabase.from('tasks').insert({
            id: task.id,
            project_id: task.projectId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            due_date: task.dueDate?.toISOString(),
            reminder_time: task.reminderTime?.toISOString(),
            dependencies: task.dependencies,
            linked_document_id: task.linkedDocumentId,
            agent_status: task.agentStatus,
            agent_result: task.agentResult,
            created_at: task.createdAt.toISOString(),
            updated_at: task.updatedAt.toISOString()
        });
    } catch (e) { console.error("Create Task Failed", e); }
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    try {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
        if (updates.reminderTime !== undefined) dbUpdates.reminder_time = updates.reminderTime ? updates.reminderTime.toISOString() : null;
        if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;
        if (updates.linkedDocumentId !== undefined) dbUpdates.linked_document_id = updates.linkedDocumentId;
        if (updates.agentStatus !== undefined) dbUpdates.agent_status = updates.agentStatus;
        if (updates.agentResult !== undefined) dbUpdates.agent_result = updates.agentResult;

        await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
    } catch (e) { console.error("Update Task Failed", e); }
  },

  async deleteTask(taskId: string) {
    try {
        await supabase.from('tasks').delete().eq('id', taskId);
    } catch (e) { console.error("Delete Task Failed", e); }
  },

  async createDocument(doc: Document) {
    try {
        await supabase.from('documents').insert({
            id: doc.id,
            project_id: doc.projectId,
            title: doc.title,
            content: doc.content,
            tags: doc.tags,
            updated_at: doc.updatedAt.toISOString()
        });
    } catch (e) { console.error("Create Document Failed", e); }
  },

  async updateDocument(docId: string, updates: Partial<Document>) {
    try {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

        await supabase.from('documents').update(dbUpdates).eq('id', docId);
    } catch (e) { console.error("Update Document Failed", e); }
  },

  async deleteDocument(docId: string) {
    try {
        await supabase.from('documents').delete().eq('id', docId);
    } catch (e) { console.error("Delete Document Failed", e); }
  },

  async fetchGoogleEvents(): Promise<Task[]> {
    // Simulation
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const nextWeek = new Date(now.getTime() + 7 * 86400000);

    return [
        { 
            id: 'g_cal_1', 
            projectId: '', 
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
