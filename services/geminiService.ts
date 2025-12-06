
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, TaskStatus, TaskPriority, ProjectPlan, Attachment, Project, InboxAction, AgentRole, AgentResult, Document, Source } from "../types";

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
   * Original Gemini Chat interaction
   */
  async chat(history: { role: string; parts: { text?: string; inlineData?: any }[] }[], message: string, attachments: Attachment[] = [], systemContext?: string): Promise<string> {
    if (!apiKey) return "Error: No API Key configured for Gemini. Please check your environment.";

    try {
      const chat = ai.chats.create({
        model: MODEL_NAME,
        history: history.map(h => ({ role: h.role, parts: h.parts })),
        config: { systemInstruction: systemContext || EXECUTIVE_ASSISTANT_PROTOCOL }
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
   * UPDATED: organizeInboxItem with Reality Check support
   */
  async organizeInboxItem(
      content: string, 
      projects: Project[], 
      scheduleContext: string, // NEW: String describing existing load on dates
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
      - Schedule Context (Reality Check):
      ${scheduleContext}
      - Available Projects: 
      ${projectContext}
      
      INPUT: "${content}"
      
      THINKING PROCESS:
      1. **Intent**: Task, Doc, or Lead?
      2. **Reality Check**: If a date is detected, check "Schedule Context". If that day has > 3 tasks/meetings, populate the "warning" field in JSON.
      3. **Structure**: Build the JSON.
      
      OUTPUT FORMAT: JSON ONLY.
      
      SCHEMA:
      {
        "actionType": "create_task" | "create_document" | "mixed" | "create_client",
        "targetProjectId": "string",
        "reasoning": "string",
        "warning": "string (Optional: '⚠️ 3 meetings already scheduled for Friday. Consider Monday?')",
        "data": {
          "title": "string",
          "description": "string",
          "priority": "High" | "Medium" | "Low",
          "dueDate": "ISO String",
          "content": "Markdown",
          "extractedTasks": [{ "title": "string", "priority": "Medium", "dueDate": "string" }],
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
                  config: { responseMimeType: "application/json" }
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
  async expandTaskToContent(taskTitle: string, taskDescription?: string): Promise<string> { return this.simpleGen(`Expand "${taskTitle} - ${taskDescription}" to markdown doc.`) || `# ${taskTitle}`; },
  
  async simpleGen(prompt: string): Promise<string> {
      if(!apiKey) return "";
      try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt }); return r.text || ""; } catch(e) { return ""; }
  },

  async generateDailyBriefing(userName: string, context: string): Promise<string> {
    if (!apiKey) return `Ready.`;
    try { 
        const r = await ai.models.generateContent({ 
            model: MODEL_NAME, 
            contents: `Role: EA. Task: Daily Pulse for ${userName}. Input: ${context}. Max 3 bullets. Direct. Markdown.` 
        }); 
        return r.text || "Schedule clear."; 
    } catch (e) { return "Error generating briefing."; }
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
