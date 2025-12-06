
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, TaskStatus, TaskPriority, ProjectPlan, Attachment, Project, InboxAction, AgentRole, AgentResult, Document, Source, Client } from "../types";

// SAFELY ACCESS API KEY
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Error accessing process.env", e);
  }
  return undefined;
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });

const MODEL_NAME = "gemini-2.5-flash";

interface ChatParams {
    provider: 'gemini' | 'openrouter';
    apiKey?: string;
    model?: string;
    history: { role: string; parts: { text?: string; inlineData?: any }[] }[];
    message: string;
    attachments: Attachment[];
    systemContext?: string;
}

export interface VoiceIntent {
    type: 'create_task' | 'navigate' | 'create_note' | 'search' | 'unknown';
    data: any;
    feedback: string;
}

// REDEFINED: Daily Briefing Structure
export interface DailyBriefing {
    greeting: string;
    narrative: string; // "You have a heavy meeting day..."
    focusTask: {
        id: string;
        title: string;
        reason: string;
    } | null;
    vibe: 'Deep Work' | 'Meeting Heavy' | 'Admin & Cleanup' | 'Light';
    stats: {
        urgentCount: number;
        completedYesterday: number;
    }
}

// UNIVERSAL PROTOCOL FOR GLOBAL LLMS
const EXECUTIVE_ASSISTANT_PROTOCOL = `
### IDENTITY
You are **Aasani**, a Chief of Staff and Hyper-Intelligent Workspace OS. 
You do not just "chat"; you **orchestrate**. You analyze raw input, structure it, and execute system actions.

### OPERATIONAL DIRECTIVES
1.  **Radical Proactivity**: Don't wait for permission to think. If the user mentions a client, assume we need a CRM entry. If they mention a date, assume a deadline.
2.  **Context is King**: Always look at the "Current Focus" or "Selected Inbox Item" first. Your responses must be directly relevant to that data.
3.  **Structured Handoffs**: When you identify a clear action (Task, Project, CRM), you **MUST** propose it using the \`propose_import\` tool. Do not just describe the plan; build the JSON payload.
4.  **Universal Management**: If the user is discussing an existing Task, Document, or Client, use \`update_entity\` or \`delete_entity\` to modify it based on their request.

### DEEP REASONING
When analyzing input, engage in a silent "thought process" to:
- Identify implicit deadlines (e.g. "next Friday" -> Calculate ISO Date).
- Match fuzzy project names to the specific Project ID provided in context.
- Detect dependencies based on logical order of operations.

### TOOL USAGE
Use \`:::TOOL_CALL:::\` and \`:::END_TOOL_CALL:::\` to execute actions.
`;

const TOOL_INSTRUCTIONS = `
### TOOL USAGE (JSON MODE)
To execute an action, output a JSON block wrapped STRICTLY in \`:::TOOL_CALL:::\` and \`:::END_TOOL_CALL:::\`.

**Tool: propose_import** (For NEW items)
Use this to create Tasks, Documents, Projects, or CRM Clients.

**Schema:**
{
  "tool": "propose_import",
  "args": {
    "actionType": "create_task" | "create_document" | "create_project" | "create_client" | "mixed",
    "targetProjectId": "string (existing ID) OR 'default' OR 'NEW: <Title>'",
    "reasoning": "string",
    "data": { ... } // (Standard InboxAction data)
  }
}

**Tool: update_entity** (For EXISTING items)
Use this when the user wants to change the focused item (Task, Doc, etc).

**Schema:**
{
  "tool": "update_entity",
  "args": {
    "entityType": "task" | "document" | "client" | "project",
    "id": "string (The ID of the focused item)",
    "updates": {
       "title": "string",
       "status": "string",
       "priority": "string",
       "description": "string",
       "content": "string"
    },
    "reasoning": "string"
  }
}

**Tool: bundle_inbox** (For Stale Items)
Use this to group multiple small inbox items into one task.
{
  "tool": "bundle_inbox",
  "args": {
    "itemIds": ["string", "string"],
    "bundledTaskTitle": "string"
  }
}
`;

export const geminiService = {
  /**
   * Unified Chat interaction handling multiple providers
   */
  async chatWithProvider(params: ChatParams): Promise<string> {
      const { provider, apiKey: userKey, model, history, message, attachments, systemContext } = params;

      // Inject the Universal Protocol into the system context
      const fullSystemContext = `${EXECUTIVE_ASSISTANT_PROTOCOL}\n\n${systemContext || ''}\n\n${TOOL_INSTRUCTIONS}`;

      // 1. GEMINI (Default)
      if (provider === 'gemini') {
          return this.chat(history, message, attachments, fullSystemContext);
      }

      // 2. CHECK API KEY
      if (!userKey) {
          return `Error: Missing API Key for ${provider}. Please configure it in Settings.`;
      }

      // 3. OPENROUTER
      if (provider === 'openrouter') {
          return this.callOpenRouter(userKey, model || 'openai/gpt-4o', history, message, fullSystemContext);
      }

      return "Provider not supported.";
  },

  /**
   * OpenRouter Implementation
   */
  async callOpenRouter(key: string, model: string, history: any[], message: string, systemContext?: string): Promise<string> {
      const messages = [];
      messages.push({ role: "system", content: systemContext || EXECUTIVE_ASSISTANT_PROTOCOL });
      history.forEach(h => {
          messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0]?.text || '' });
      });
      messages.push({ role: "user", content: message });

      try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "HTTP-Referer": window.location.origin, "X-Title": "Aasani OS" },
              body: JSON.stringify({ model: model, messages: messages })
          });
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "No response.";
      } catch (error: any) { return `Connection Error: ${error.message}`; }
  },

  /**
   * Fetch Available Models from OpenRouter
   */
  async fetchOpenRouterModels(): Promise<{id: string, name: string}[]> {
      try {
          const response = await fetch("https://openrouter.ai/api/v1/models");
          const data = await response.json();
          return (data.data || []).map((m: any) => ({ id: m.id, name: m.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
      } catch (e) {
          console.error("Failed to fetch OpenRouter models", e);
          return [];
      }
  },

  /**
   * Original Gemini Chat interaction with Thinking enabled
   */
  async chat(history: { role: string; parts: { text?: string; inlineData?: any }[] }[], message: string, attachments: Attachment[] = [], systemContext?: string): Promise<string> {
    if (!apiKey) return "Error: No API Key configured for Gemini. Please check your environment.";

    try {
      const chat = ai.chats.create({
        model: MODEL_NAME,
        history: history.map(h => ({ role: h.role, parts: h.parts })),
        config: { 
            systemInstruction: systemContext || EXECUTIVE_ASSISTANT_PROTOCOL,
            thinkingConfig: { thinkingBudget: 2048 } 
        }
      });

      const contentParts: any[] = [];
      if (attachments && attachments.length > 0) {
        attachments.forEach(att => contentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
      }
      if (message) contentParts.push({ text: message });

      const result = await chat.sendMessage({ message: contentParts });
      return result.text || "I processed that, but have no response.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  },

  // ... (Other functions findRelevantContext, queryWorkspace remain same) ...
  async findRelevantContext(query: string, documents: Document[], tasks: Task[]): Promise<{ text: string, sources: Source[] }> {
    // (Implementation unchanged)
    if (!apiKey) return { text: "", sources: [] };
    const docIndex = documents.map(d => `DOC_ID: ${d.id}, TITLE: ${d.title}`).join('\n');
    const taskIndex = tasks.map(t => `TASK_ID: ${t.id}, TITLE: ${t.title}`).join('\n');
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Query: "${query}". Return relevant IDs from: \n${docIndex}\n${taskIndex}. JSON { documentIds: [], taskIds: [] }`,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text || "{}");
      let contextBuilder = "";
      const sources: Source[] = [];
      documents.filter(d => (result.documentIds || []).includes(d.id)).forEach(d => {
        contextBuilder += `DOCUMENT: ${d.title}\n${d.content}\n\n`;
        sources.push({ id: d.id, title: d.title, type: 'document' });
      });
      tasks.filter(t => (result.taskIds || []).includes(t.id)).forEach(t => {
        contextBuilder += `TASK: ${t.title} (${t.status})\n${t.description || ''}\n\n`;
        sources.push({ id: t.id, title: t.title, type: 'task' });
      });
      return { text: contextBuilder, sources };
    } catch (e) { return { text: "", sources: [] }; }
  },

  async queryWorkspace(query: string, contextSummary: string): Promise<string> {
      // (Implementation unchanged)
      if (!apiKey) return "Error: No API Key.";
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `User Query: "${query}"\nContext:\n${contextSummary}\nAnswer concisely.`
          });
          return response.text || "No answer found.";
      } catch (error) { return "Error querying workspace."; }
  },

  /**
   * VOICE COMMAND PARSER
   */
  async parseVoiceCommand(transcript: string, projects: Project[]): Promise<VoiceIntent> {
      if (!apiKey) return { type: 'unknown', data: {}, feedback: "API Key missing." };
      
      const projectList = projects.map(p => p.title).join(', ');
      
      const prompt = `
      Act as an Intent Parser for a Workspace OS.
      User said: "${transcript}"
      Available Projects: ${projectList}
      
      Classify into one of these intents and return JSON:
      1. 'create_task': User wants to add a task. Extract title, priority (High/Medium/Low), project (match closely or use 'default'), and dueDate (ISO string if mentioned).
      2. 'create_note': User wants to save a thought/note/idea to Inbox.
      3. 'navigate': User wants to go to a view (Inbox, CRM, Calendar, Settings, Home, Projects).
      
      Format:
      {
        "type": "create_task" | "create_note" | "navigate" | "unknown",
        "data": { ...specific fields... },
        "feedback": "Spoken confirmation message for the user"
      }
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{\"type\":\"unknown\"}");
      } catch (e) {
          console.error("Voice parse error", e);
          return { type: 'unknown', data: {}, feedback: "I couldn't understand that command." };
      }
  },

  /**
   * GENERATE DASHBOARD INSIGHTS (PROACTIVE INTELLIGENCE) - REFACTORED FOR DAILY BRIEFING
   */
  async generateDailyBriefing(tasks: Task[], projects: Project[]): Promise<DailyBriefing | null> {
      if (!apiKey) return null;
      
      const urgentTasks = tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE);
      const todayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
      
      const context = `
      Current Time: ${new Date().toLocaleTimeString()}
      Total Tasks: ${tasks.length}
      High Priority Pending: ${urgentTasks.length}
      Tasks Due Today: ${todayTasks.length}
      Sample Urgent Tasks: ${urgentTasks.slice(0,3).map(t => t.title).join(', ')}
      Projects: ${projects.map(p => p.title).join(', ')}
      `;

      const prompt = `
      You are Aasani, a high-end Chief of Staff. Generate a "Daily Briefing".
      
      Context:
      ${context}
      
      Instructions:
      1. Narrative: A 2-sentence summary of the day's "vibe" (e.g., "Heavy administrative load today," or "Clear skies for deep work."). Be creative but professional.
      2. Focus Task: Pick ONE task that is the most critical "Keystone" to complete today. If none, suggest "Review Plan".
      3. Vibe: Categorize the day into one of: 'Deep Work', 'Meeting Heavy', 'Admin & Cleanup', 'Light'.
      
      Return JSON conforming to the DailyBriefing interface.
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "null");
      } catch (e) {
          return null;
      }
  },

  /**
   * GENERATE MASCOT WHISPER (Context-Aware Suggestion)
   */
  async generateMascotWhisper(tasks: Task[], projects: Project[]): Promise<string> {
      if (!apiKey) return "I'm ready to help!";
      
      const context = `
      Open Projects: ${projects.length}
      Pending Tasks: ${tasks.filter(t => t.status !== TaskStatus.DONE).length}
      Overdue: ${tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length}
      `;

      const prompt = `
      Generate a short, snappy 1-sentence "whisper" from a helpful mascot.
      It should suggest a specific action based on the context (e.g. "You have 3 overdue tasks, want to tackle them?" or "Inbox looks clear, good job!").
      Context: ${context}
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
          });
          return response.text?.trim() || "How can I help you today?";
      } catch (e) {
          return "How can I help?";
      }
  },

  /**
   * UPDATED: organizeInboxItem with Reality Check support & Deep Reasoning & Auto-Assignment
   */
  async organizeInboxItem(
      content: string, 
      projects: Project[], 
      scheduleContext: string, 
      provider?: 'gemini' | 'openrouter', 
      apiKey?: string, 
      model?: string, 
      attachments: Attachment[] = []
  ): Promise<InboxAction | null> {
      const projectContext = projects.map(p => `ID: ${p.id}, Title: ${p.title}`).join('\n');
      const currentDate = new Date().toISOString();
      const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      const prompt = `
      ROLE: You are Aasani, Chief of Staff.
      TASK: Perform a deep analysis of this inbox item and structure it.
      
      CONTEXT:
      - Current Time: ${currentDate} (${currentDay})
      - Schedule Context (Reality Check Data):
      ${scheduleContext}
      - Available Projects: 
      ${projectContext}
      
      INPUT: "${content}"
      
      THINKING PROCESS (DEEP REASONING):
      1. **Intent**: Task, Doc, or Lead?
      2. **Enrichment**: Calculate precise ISO dates from relative terms ("next friday"). Associate vague project names to IDs.
      3. **Reality Check**: 
         - If a target date is identified, cross-reference with 'Schedule Context'.
         - If the date already has > 2 existing tasks/meetings, populate "warning" with: "⚠️ Conflict on [Date]: [Count] existing items. Suggest moving to [Alternative Date]."
         - If no specific date is mentioned but user implies urgency ("ASAP"), check today/tomorrow load.
      4. **Role Assignment**: If the task involves research, analysis, or data gathering, assign to 'AI_RESEARCHER'. If it involves writing, drafting, or editing, assign to 'AI_WRITER'. If it involves planning, scheduling, or strategy, assign to 'AI_PLANNER'. Otherwise, leave assignee undefined (or 'Unassigned').
      5. **Structure**: Build the JSON.
      
      OUTPUT FORMAT: JSON ONLY.
      
      SCHEMA:
      {
        "actionType": "create_task" | "create_document" | "mixed" | "create_client",
        "targetProjectId": "string",
        "reasoning": "string",
        "warning": "string (Optional warning message about scheduling conflicts)",
        "data": {
          "title": "string",
          "description": "string",
          "priority": "High" | "Medium" | "Low",
          "assignee": "AI_RESEARCHER" | "AI_WRITER" | "AI_PLANNER" | "Unassigned",
          "dueDate": "ISO String",
          "content": "Markdown",
          "extractedTasks": [{ "title": "string", "priority": "Medium", "dueDate": "string", "assignee": "string" }],
          "clientData": { "name": "string", "company": "string", "email": "string", "value": number, "status": "Lead" }
        }
      }
      `;

      try {
          let responseText = "";
          if (provider === 'openrouter' && apiKey) {
              responseText = await this.callOpenRouter(apiKey, model || 'openai/gpt-4o', [], prompt, "You are a JSON-only API.");
          } else {
              if (!getApiKey()) return null;
              const contentParts: any[] = [];
              if (attachments && attachments.length > 0) {
                  attachments.forEach(att => contentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
              }
              contentParts.push({ text: prompt });
              const geminiResponse = await ai.models.generateContent({
                  model: MODEL_NAME,
                  contents: { parts: contentParts },
                  config: { 
                      responseMimeType: "application/json",
                      thinkingConfig: { thinkingBudget: 2048 } 
                  }
              });
              responseText = geminiResponse.text || "{}";
          }
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          if (!cleanJson) return null;
          return JSON.parse(cleanJson) as InboxAction;
      } catch (error) {
          console.error("Inbox Sort Error:", error);
          return null;
      }
  },

  /**
   * NEW: Analyze stale inbox items for bundling
   */
  async suggestBundle(items: {id: string, content: string}[]): Promise<{ title: string, reason: string } | null> {
      if (!apiKey || items.length < 3) return null;
      try {
          const itemList = items.map(i => `- ${i.content}`).join('\n');
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Analyze these stale inbox items:\n${itemList}\n\nCan they be bundled into a single task? (e.g. "Admin Block", "Correspondence"). If yes, return JSON { "title": "...", "reason": "..." }. If no, return null.`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "null");
      } catch (e) { return null; }
  },

  async smartBreakdown(taskTitle: string, taskDescription: string): Promise<{ title: string, priority: TaskPriority }[]> {
      // (Implementation unchanged)
      if (!apiKey) return [];
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Breakdown task "${taskTitle} - ${taskDescription}" into 3-5 subtasks. JSON Array [{title, priority}]`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "[]");
      } catch (e) { return []; }
  },

  async enrichTask(taskTitle: string, taskDescription: string): Promise<{ title: string, description: string }> {
      // (Implementation unchanged)
      if (!apiKey) return { title: taskTitle, description: taskDescription };
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Enrich task "${taskTitle}". Expand desc. JSON {title, description}`,
              config: { responseMimeType: "application/json" }
          });
          const data = JSON.parse(response.text || "{}");
          return { title: data.title || taskTitle, description: data.description || taskDescription };
      } catch (e) { return { title: taskTitle, description: taskDescription }; }
  },

  // ... (Rest of methods generateProjectPlan, extractTasks, etc. are largely utility, kept same)
  async extractTasks(text: string): Promise<Partial<Task>[]> {
    if (!apiKey) return [];
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Extract tasks from: "${text}". JSON array.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
  },
  
  async suggestTasksFromContext(context: string): Promise<Partial<Task>[]> {
    if (!apiKey) return [];
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Suggest 3-5 tasks based on: "${context.slice(0, 10000)}". JSON array.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
  },

  async generateDocumentContent(prompt: string, currentContent: string): Promise<string> {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({ model: MODEL_NAME, contents: `Context: "${currentContent}". Prompt: "${prompt}". Markdown.` });
      return response.text || "";
    } catch (e) { return ""; }
  },

  async summarizeDocument(text: string): Promise<string> {
    if (!apiKey) return "Error.";
    try {
      const response = await ai.models.generateContent({ model: MODEL_NAME, contents: `Summarize: "${text}"` });
      return response.text || "Error.";
    } catch (e) { return "Error."; }
  },

  async suggestTags(text: string): Promise<string[]> {
      if (!apiKey) return [];
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Suggest 3-5 tags for: "${text.slice(0, 5000)}". JSON { tags: [] }`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}").tags || [];
      } catch (e) { return []; }
  },

  async improveWriting(text: string): Promise<string> { return this.simpleGen(`Improve: "${text}"`) || text; },
  async fixGrammar(text: string): Promise<string> { return this.simpleGen(`Fix grammar: "${text}"`) || text; },
  async shortenText(text: string): Promise<string> { return this.simpleGen(`Shorten: "${text}"`) || text; },
  async continueWriting(context: string): Promise<string> { return this.simpleGen(`Continue: "${context.slice(-2000)}"`) || ""; },
  
  // UPDATED: Document Generation Prompt to match "Austin Wealth Weekly" style
  async expandTaskToContent(taskTitle: string, taskDescription?: string): Promise<string> { 
      const prompt = `
      Expand the task "${taskTitle}" into a professional, article-style document.
      Description Context: "${taskDescription || ''}"
      
      Format Requirements (Markdown):
      1. **Title**: Bold, clear header.
      2. **Subtitle/Meta**: Include a hypothetical issue number or date line (e.g., "Strategic Brief | October 2025").
      3. **Hook**: An italicized introductory paragraph setting the context.
      4. **Body**: Use numbered sections with bold headers (e.g., "1. The Context").
      5. **Tables**: If data comparison is relevant, include a Markdown table.
      6. **Action Plan**: A bulleted list of next steps.
      
      Make it professional, insightful, and well-structured.
      `;
      return this.simpleGen(prompt) || `# ${taskTitle}`; 
  },
  
  async simpleGen(prompt: string): Promise<string> {
      if(!apiKey) return "";
      try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt }); return r.text || ""; } catch(e) { return ""; }
  },

  async generateVerseOfTheDay(context: string): Promise<{ verse: string, reference: string, explanation: string } | null> {
      if (!apiKey) return null;
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Role: Pastor. Context: ${context.slice(0,1000)}. Task: 1 ESV Verse for encouragement. JSON { verse, reference, explanation }`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}");
      } catch (e) { return null; }
  },

  async performAgentTask(role: AgentRole, taskTitle: string, taskDescription?: string): Promise<AgentResult> {
      if (!apiKey) return { output: "Error: No API Key", type: 'text', timestamp: new Date() };
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Act as ${role}. Task: ${taskTitle}. Desc: ${taskDescription}. Return markdown.`
          });
          return { output: response.text || "No output.", type: 'text', timestamp: new Date() };
      } catch (error) { return { output: "Error.", type: 'text', timestamp: new Date() }; }
  },

  async analyzeStaleTask(taskTitle: string, daysStuck: number): Promise<string> {
      if (!apiKey) return "Review this task.";
      try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Task "${taskTitle}" stuck ${daysStuck} days. Suggest action.` }); return r.text || "Break it down."; } catch (e) { return "Review task."; }
  }
};
