
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
// Updated to hide JSON tools and be conversational
const EXECUTIVE_ASSISTANT_PROTOCOL = `
### ROLE
You are Aasani, a Hyper-Intelligent Executive Assistant & Workspace OS.
You ANALYZE, ENRICH, and STRATEGICALLY ORGANIZE information.

### CORE BEHAVIORS
1. **Be Conversational**: If details are missing (e.g., creating a client without a name), ASK the user naturally. Do not output JSON until you have enough info or are confident in the action.
2. **Hidden Tool Usage**: When you decide to perform a system action (create task, save doc, add client), you MUST wrap the JSON in special tags: \`:::TOOL_CALL:::\` and \`:::END_TOOL_CALL:::\`.
3. **No Raw JSON**: Never show raw JSON to the user outside of these tags.

### CORE CAPABILITIES
1. **Enrichment**: Never leave data bare. If a user says "meeting", infer it needs a time, an agenda, and a document.
2. **Orchestration**: You determine where data lives (Board, Calendar, Document, CRM).
3. **Proactivity**: Suggest next steps, break down complex tasks, and flag risks.
`;

const TOOL_INSTRUCTIONS = `
### TOOL USAGE (JSON MODE)
To execute an action, output a JSON block wrapped STRICTLY in \`:::TOOL_CALL:::\` and \`:::END_TOOL_CALL:::\`.

**Tool: propose_import**
Use this to create Tasks, Documents, Projects, or CRM Clients.

**Schema:**
{
  "tool": "propose_import",
  "args": {
    "actionType": "create_task" | "create_document" | "create_project" | "create_client" | "mixed",
    "targetProjectId": "string (existing ID) OR 'default' OR 'NEW: <Title>'",
    "reasoning": "string (Briefly explain logic)",
    "data": {
      "title": "string (Required)",
      "description": "string (Optional)",
      "priority": "High" | "Medium" | "Low",
      "assignee": "string (Optional)",
      "dueDate": "string (ISO Date)",
      "content": "string (Markdown)",
      "tags": ["string"],
      "extractedTasks": [
         { "title": "string", "priority": "Medium", "assignee": "string", "dueDate": "string", "description": "string" }
      ],
      "clientData": {
         "name": "string", "company": "string", "email": "string", "value": number, "status": "Lead"
      }
    }
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
      
      // System Prompt
      messages.push({
          role: "system",
          content: systemContext || EXECUTIVE_ASSISTANT_PROTOCOL
      });

      // History
      history.forEach(h => {
          messages.push({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.parts[0]?.text || ''
          });
      });

      // Current Message
      messages.push({ role: "user", content: message });

      try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${key}`,
                  "HTTP-Referer": window.location.origin, 
                  "X-Title": "Aasani OS"
              },
              body: JSON.stringify({
                  model: model,
                  messages: messages
                  // removed response_format: { type: "json_object" } to allow natural text mixed with tools
              })
          });

          // Defensive: Check content type before parsing JSON
          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
              const text = await response.text();
              return `OpenRouter Error (${response.status}): Received non-JSON response. ${text.slice(0, 100)}`;
          }

          const data = await response.json();
          
          if (data.error) {
              console.error("OpenRouter Error Data:", data.error);
              return `OpenRouter Error: ${JSON.stringify(data.error)}`;
          }
          
          return data.choices?.[0]?.message?.content || "No response from OpenRouter.";
      } catch (error: any) {
          console.error("OpenRouter Exception:", error);
          return `Connection Error: ${error.message}`;
      }
  },

  /**
   * Original Gemini Chat interaction
   */
  async chat(history: { role: string; parts: { text?: string; inlineData?: any }[] }[], message: string, attachments: Attachment[] = [], systemContext?: string): Promise<string> {
    if (!apiKey) return "Error: No API Key configured for Gemini. Please check your environment.";

    try {
      const chat = ai.chats.create({
        model: MODEL_NAME,
        history: history.map(h => ({
            role: h.role,
            parts: h.parts
        })),
        config: {
          systemInstruction: systemContext || EXECUTIVE_ASSISTANT_PROTOCOL,
        }
      });

      const contentParts: any[] = [];
      
      // Add attachments first
      if (attachments && attachments.length > 0) {
        attachments.forEach(att => {
          contentParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          });
        });
      }

      // Add text message
      if (message) {
        contentParts.push({ text: message });
      }

      const result = await chat.sendMessage({ 
        message: contentParts
      });
      
      return result.text || "I processed that, but have no response.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  },

  // ... (Other functions like findRelevantContext, queryWorkspace remain same) ...
  async findRelevantContext(query: string, documents: Document[], tasks: Task[]): Promise<{ text: string, sources: Source[] }> {
    if (!apiKey) return { text: "", sources: [] };
    if (documents.length === 0 && tasks.length === 0) return { text: "", sources: [] };

    // 1. Create a lightweight index of available data
    const docIndex = documents.map(d => `DOC_ID: ${d.id}, TITLE: ${d.title}, TAGS: ${d.tags.join(',')}`).join('\n');
    const taskIndex = tasks.map(t => `TASK_ID: ${t.id}, TITLE: ${t.title}, STATUS: ${t.status}, ASSIGNEE: ${t.assignee || 'Unassigned'}`).join('\n');

    try {
      // 2. Ask Gemini to pick relevant IDs
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `I have a user query: "${query}"
        
        Available Documents:
        ${docIndex}
        
        Available Tasks:
        ${taskIndex}
        
        Identify up to 3 Documents and 5 Tasks that are most likely relevant to answering this query.
        Return a JSON object with arrays of IDs.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              taskIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      const relevantDocIds = result.documentIds || [];
      const relevantTaskIds = result.taskIds || [];

      // 3. Construct the full context string and source list
      let contextBuilder = "Here is the retrieved context from the workspace:\n\n";
      const sources: Source[] = [];

      documents.filter(d => relevantDocIds.includes(d.id)).forEach(d => {
        contextBuilder += `--- DOCUMENT: ${d.title} ---\n${d.content}\n----------------\n\n`;
        sources.push({ id: d.id, title: d.title, type: 'document' });
      });

      const relevantTasks = tasks.filter(t => relevantTaskIds.includes(t.id));
      if (relevantTasks.length > 0) {
        contextBuilder += `--- RELEVANT TASKS ---\n`;
        relevantTasks.forEach(t => {
          contextBuilder += `- [${t.status}] ${t.title} (Assignee: ${t.assignee || 'Unassigned'}, Due: ${t.dueDate || 'None'})\n`;
          sources.push({ id: t.id, title: t.title, type: 'task' });
        });
        contextBuilder += `----------------------\n`;
      }

      return { text: contextBuilder, sources };

    } catch (error) {
      console.error("Context Retrieval Error:", error);
      return { text: "", sources: [] };
    }
  },

  async queryWorkspace(query: string, contextSummary: string): Promise<string> {
      if (!apiKey) return "Error: No API Key.";

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `You are the Aasani OS Intelligence.
              User Query: "${query}"
              
              Workspace Context (All Projects, Documents & Tasks):
              ${contextSummary}
              
              Answer the user's question based strictly on the provided workspace context. If the information isn't there, say so. Be concise.`
          });
          return response.text || "No answer found.";
      } catch (error) {
          console.error("Gemini Workspace Query Error:", error);
          return "Error querying workspace.";
      }
  },

  /**
   * Analyzes an Inbox Item and decides where it goes.
   * UPDATED: Supports Provider Routing & Attachments & Universal Protocol
   */
  async organizeInboxItem(content: string, projects: Project[], provider?: 'gemini' | 'openrouter', apiKey?: string, model?: string, attachments: Attachment[] = []): Promise<InboxAction | null> {
      const projectContext = projects.map(p => `ID: ${p.id}, Title: ${p.title}`).join('\n');
      const currentDate = new Date().toISOString();
      const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      const prompt = `
      ROLE: You are Aasani, an elite Executive Assistant and Project Manager.
      OBJECTIVE: Organize and enrich the user's raw input into structured workspace actions.
      
      CONTEXT:
      - Current Time: ${currentDate} (${currentDay})
      - Available Projects: 
      ${projectContext}
      
      INPUT: "${content}"
      
      INSTRUCTIONS:
      1. **Analyze the intent**. Is it a task, a meeting, a project idea, or a CRM lead?
      2. **Enrich the data**. 
         - If "tomorrow", calculate the date.
         - If "Meeting", infer time (default 9AM next weekday if unspecified) and create BOTH a task/event AND a document if agenda is needed.
         - If vague (e.g., "Fix site"), rename to "Resolve Website Critical Issues" and suggest priority.
      3. **VISIBILITY RULES**:
         - Tasks assigned to a project appear on Project Board AND Global Board.
         - Events with a date appear on Global Calendar AND Project Calendar.
      
      OUTPUT FORMAT: JSON ONLY.
      
      SCHEMA:
      {
        "actionType": "create_task" | "create_document" | "mixed" | "create_client",
        "targetProjectId": "string (Project ID, 'default', or 'NEW: Title')",
        "reasoning": "string (Your internal monologue)",
        "data": {
          "title": "string (Enriched Title)",
          "description": "string (Enriched details)",
          "priority": "High" | "Medium" | "Low",
          "dueDate": "ISO String (if date inferred)",
          "content": "Markdown content (for docs)",
          "extractedTasks": [
             { "title": "string", "priority": "Medium", "dueDate": "string" }
          ],
          "clientData": {
             "name": "string", "company": "string", "email": "string", "value": number, "status": "Lead"
          }
        }
      }
      `;

      try {
          let responseText = "";

          // ROUTING LOGIC
          if (provider === 'openrouter' && apiKey) {
              const openRouterResponse = await this.callOpenRouter(apiKey, model || 'openai/gpt-4o', [], prompt, "You are a JSON-only API.");
              responseText = openRouterResponse;
          } else {
              // Default Gemini (Supports Attachments)
              if (!getApiKey()) return null;
              
              const contentParts: any[] = [];
              if (attachments && attachments.length > 0) {
                  attachments.forEach(att => {
                      contentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
                  });
              }
              contentParts.push({ text: prompt });

              const geminiResponse = await ai.models.generateContent({
                  model: MODEL_NAME,
                  contents: { parts: contentParts },
                  config: { responseMimeType: "application/json" }
              });
              responseText = geminiResponse.text || "{}";
          }

          // Clean up potential markdown wrapping
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          if (!cleanJson) return null;
          return JSON.parse(cleanJson) as InboxAction;

      } catch (error) {
          console.error("Inbox Sort Error:", error);
          return null;
      }
  },

  /**
   * SMART BREAKDOWN: Breaks a vague task into actionable sub-steps.
   */
  async smartBreakdown(taskTitle: string, taskDescription: string): Promise<{ title: string, priority: TaskPriority }[]> {
      if (!apiKey) return [];
      
      const prompt = `
      TASK: "${taskTitle}"
      CONTEXT: "${taskDescription || 'No description provided'}"
      
      ACT AS: Expert Project Manager.
      GOAL: Break this task down into 3-5 concrete, actionable sub-steps.
      OUTPUT: JSON Array only. [{ "title": "...", "priority": "High" | "Medium" | "Low" }]
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "[]");
      } catch (e) {
          console.error("Smart Breakdown Error", e);
          return [];
      }
  },

  /**
   * SMART ENRICH: Expands a task with professional details and checklist.
   */
  async enrichTask(taskTitle: string, taskDescription: string): Promise<{ title: string, description: string }> {
      if (!apiKey) return { title: taskTitle, description: taskDescription };

      const prompt = `
      TASK: "${taskTitle}"
      DESC: "${taskDescription}"
      
      ACT AS: Executive Assistant.
      GOAL: Rewrite the title to be more professional and clear. Expand the description with a likely checklist of what needs to be done.
      OUTPUT: JSON { "title": "...", "description": "..." }
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          const data = JSON.parse(response.text || "{}");
          return { title: data.title || taskTitle, description: data.description || taskDescription };
      } catch (e) {
          return { title: taskTitle, description: taskDescription };
      }
  },

  // ... (Rest of the service methods)
  async generateProjectPlan(prompt: string, attachments: Attachment[] = []): Promise<ProjectPlan | null> {
    if (!apiKey) return null;

    try {
      const contentParts: any[] = [];
      
      attachments.forEach(att => {
        contentParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });

      contentParts.push({ 
        text: `Analyze the provided Project Proposal/Document and the request: "${prompt}". 
               
               1. **Project Title**: Extract the exact project name.
               2. **Overview Document**: Create a comprehensive Markdown document.
               3. **Tasks**: Extract every actionable step.
               
               Return JSON.` 
      });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: contentParts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    projectTitle: { type: Type.STRING },
                    overviewContent: { type: Type.STRING },
                    tasks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                status: { type: Type.STRING, enum: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE] },
                                priority: { type: Type.STRING, enum: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW] },
                                assignee: { type: Type.STRING },
                                dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                                dueDate: { type: Type.STRING }
                            },
                            required: ["title", "status"]
                        }
                    }
                },
                required: ["projectTitle", "overviewContent", "tasks"]
            }
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) return null;
      
      return JSON.parse(jsonStr) as ProjectPlan;
    } catch (error) {
      console.error("Gemini Project Plan Error:", error);
      return null;
    }
  },

  async extractTasks(text: string): Promise<Partial<Task>[]> {
    if (!apiKey) return [];
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Extract actionable tasks from this text: "${text}". Return JSON array.`,
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
        contents: `Suggest 3-5 next steps based on this context: "${context.substring(0, 15000)}". Return JSON array.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
  },

  async generateDocumentContent(prompt: string, currentContent: string): Promise<string> {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({ model: MODEL_NAME, contents: `Context: "${currentContent}". Request: "${prompt}". Generate markdown content.` });
      return response.text || "";
    } catch (e) { return ""; }
  },

  async summarizeDocument(text: string): Promise<string> {
    if (!apiKey) return "Error: No API Key.";
    try {
      const response = await ai.models.generateContent({ model: MODEL_NAME, contents: `Summarize: "${text}"` });
      return response.text || "Could not generate summary.";
    } catch (e) { return "Error generating summary."; }
  },

  async suggestTags(text: string): Promise<string[]> {
      if (!apiKey) return [];
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Suggest 3-5 tags for: "${text.substring(0, 5000)}". JSON { tags: [] }`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}").tags || [];
      } catch (e) { return []; }
  },

  async improveWriting(text: string): Promise<string> {
    if (!apiKey) return text;
    try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Improve writing: "${text}"` }); return r.text || text; } catch (e) { return text; }
  },

  async fixGrammar(text: string): Promise<string> {
    if (!apiKey) return text;
    try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Fix grammar: "${text}"` }); return r.text || text; } catch (e) { return text; }
  },

  async shortenText(text: string): Promise<string> {
    if (!apiKey) return text;
    try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Shorten: "${text}"` }); return r.text || text; } catch (e) { return text; }
  },

  async continueWriting(context: string): Promise<string> {
    if (!apiKey) return "";
    try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Continue writing: "${context.slice(-2000)}"` }); return r.text?.trim() || ""; } catch (e) { return ""; }
  },

  async expandTaskToContent(taskTitle: string, taskDescription?: string): Promise<string> {
    if (!apiKey) return `# ${taskTitle}\n\n`;
    try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Expand task "${taskTitle} - ${taskDescription}" into a markdown document.` }); return r.text || `# ${taskTitle}\n\n`; } catch (e) { return `# ${taskTitle}\n\n`; }
  },

  async generateDailyBriefing(userName: string, context: string): Promise<string> {
    if (!apiKey) return `Good morning, ${userName}.`;
    try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Daily briefing for ${userName} based on: ${context}` }); return r.text || "Ready to start."; } catch (e) { return "Unable to generate."; }
  },

  async performAgentTask(role: AgentRole, taskTitle: string, taskDescription?: string): Promise<AgentResult> {
      if (!apiKey) return { output: "Error: No API Key", type: 'text', timestamp: new Date() };
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Act as ${role}. Task: ${taskTitle}. Desc: ${taskDescription}. Return markdown output.`
          });
          return { output: response.text || "No output.", type: 'text', timestamp: new Date() };
      } catch (error) { return { output: "Error.", type: 'text', timestamp: new Date() }; }
  },

  async analyzeStaleTask(taskTitle: string, daysStuck: number): Promise<string> {
      if (!apiKey) return "Review this task.";
      try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Task "${taskTitle}" stuck for ${daysStuck} days. Suggest action.` }); return r.text || "Break it down."; } catch (e) { return "Review task."; }
  }
};
