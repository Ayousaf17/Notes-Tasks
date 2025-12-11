
import { GoogleGenAI } from "@google/genai";
import { Task, TaskStatus, TaskPriority, ProjectPlan, Attachment, Project, InboxAction, AgentRole, AgentResult, Document, Source, Client, Goal, InboxItem } from "../types";
import { dataService } from "./dataService";

// Initialize AI Client with API Key from Environment
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-2.5-flash";

export const DOCUMENT_STYLE_GUIDE = `
STYLE GUIDE:
- Use concise, professional language.
- Use clear headings (H1, H2).
- Use bullet points for readability.
- Maintain a friendly but efficient tone.
`;

// THE "GOLDEN" PROPOSAL TEMPLATE BASED ON USER PDF
const PROPOSAL_TEMPLATE_STRUCTURE = `
FORMAT THE DOCUMENT EXACTLY LIKE THIS:

# [Project Title] Proposal

**Prepared for:** [Client Name]
**Prepared by:** Aasani Systems
**Date:** [Current Date]

---

## 1) Executive Summary
[Write a persuasive summary of the client's problem and our solution.]

## 2) Scope of Work
[List the specific deliverables or MVP features.]

## 3) Expected Outcomes
- **Efficiency:** [Outcome]
- **Speed:** [Outcome]
- **Accuracy:** [Outcome]
- **Visibility:** [Outcome]
- **Scalability:** [Outcome]

## 4) Phased Plan
### Phase 1 — Discovery and Design
[Details]
### Phase 2 — Build Core MVP Automation
[Details]
### Phase 3 — Testing and Quality Assurance
[Details]
### Phase 4 — Launch and Training
[Details]
### Phase 5 — Monthly Support Subscription
[Details]

## 5) Project Timeline
| Phase | Duration | Key Milestones | Expected Completion |
| :--- | :--- | :--- | :--- |
| Phase 1: Discovery | 1 week | Roadmap created | [Date] |
| Phase 2: Build | 4 weeks | MVP complete | [Date] |
| Phase 3: QA | 1-2 weeks | UAT signed off | [Date] |
| Phase 4: Launch | 1-2 weeks | Deployment | [Date] |
| Phase 5: Support | Ongoing | Support as needed | Ongoing |

## 6) Responsibilities
**Client Responsibilities:**
- [List items]
**Developer Responsibilities:**
- [List items]

## 7) Acceptance Criteria
- [List items]

## 8) Pricing and Payment
| Item | Price | Notes | Payment Due |
| :--- | :--- | :--- | :--- |
| Discovery Fee | $200 | One time | Proposal acceptance |
| Setup Fee | $1,500 | One time | After Phase 2 |
| AI Agent Dev | $1,500 | 2 tools | After Phase 2 |
| Quality Testing | $500 | | After Phase 3 |
| Launch Fee | $500 | | After Phase 4 |
| **Monthly Subscription** | **$100/mo** | **Monthly** | **Monthly** |

**Total (excluding subscription): $4,200**

## 9) Monthly Support Subscription Details
[Standard support terms]

## 10) SaaS Terms and Subscription Limitations
- **License Grant:** Non-exclusive, non-transferable.
- **Restrictions:** No resale or reverse engineering.
- **Hosting:** Managed by Aasani Systems.
- **Renewal:** Auto-renews monthly.

## 11) Warranty
7 day warranty applies after launch for correction of defects.

## 12) Change Management
All scope changes must be agreed upon in writing.

## 13) Governing Law and Dispute Resolution
Governed by the laws of the State of Texas.

## 14) Next Steps
- Approve and sign via Google Workspace.
- Pay Discovery Fee.
- Provide Access.

## 15) Authorized Signatures
[Create a placeholder signature block]
`;

export interface DailyBriefing {
    greeting: string;
    narrative: string;
    focusTask?: { id: string, title: string, reason: string };
    vibe: string;
    stats: any;
}

// Response type for reasoning engine
type ReasoningResponse = 
 | { type: 'clarification'; question: string }
 | { type: 'action'; action: InboxAction };

export const geminiService = {
  async extractGoalsFromDoc(content: string): Promise<Partial<Goal>[]> {
      if (!apiKey) return [];
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `
              Analyze this document content:
              "${content.slice(0, 15000)}"
              
              Extract any high-level business objectives, KPIs, or OKRs mentioned or implied.
              Return a JSON Array of objects: 
              [{ "title": "Objective Name", "metric": "Key Result (e.g. $1M ARR)", "targetValue": number }]
              
              If no clear goals found, return empty array [].
              `,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "[]");
      } catch (e) {
          console.error("Goal extraction error", e);
          return [];
      }
  },

  async draftProposalFromContext(projectTitle: string, tasks: Task[], goals: Goal[], clientName: string): Promise<string> {
      if (!apiKey) return "# Error: No API Key";
      
      const taskList = tasks.map(t => `- ${t.title} (${t.description || 'No desc'})`).join('\n');
      const goalList = goals.map(g => `- ${g.title}: ${g.metric}`).join('\n');
      
      const prompt = `
      You are the Chief Sales Officer for Aasani Systems.
      Your task is to write a formal Statement of Work / Proposal for a client.
      
      CONTEXT:
      Project Title: ${projectTitle}
      Client: ${clientName}
      
      KNOWN TASKS (Scope):
      ${taskList}
      
      GOALS (Outcomes):
      ${goalList}
      
      INSTRUCTIONS:
      Fill out the specific template below using the context above. 
      Infer reasonable pricing, timeline dates (starting today), and details if not explicitly provided.
      
      ${PROPOSAL_TEMPLATE_STRUCTURE}
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt
          });
          return response.text || "";
      } catch (e) {
          return "Error generating proposal.";
      }
  },

  /**
   * Process Inbox Chat (Hybrid Chat + Capture + Update)
   */
  async processInboxChat(
      message: string, 
      history: Array<{role: 'user'|'model', text: string}>, 
      projects: Project[],
      pendingItems: InboxItem[] = []
  ): Promise<{ 
      response: string, 
      capturedItems: Array<{ content: string, type: 'text'|'file', fileName?: string }>,
      updatedItems: Array<{ id: string, updates: { title?: string, priority?: string, type?: string, project?: string } }>
  }> {
      if (!apiKey) return { response: "Please set your API Key.", capturedItems: [], updatedItems: [] };

      const projectContext = projects.map(p => `ID: ${p.id}, Title: ${p.title}`).join('\n');
      
      // Serialize pending items so AI knows what can be updated
      const pendingContext = pendingItems.map(item => {
          const draftTitle = item.processedResult?.data?.title || item.content;
          return `Item ID: "${item.id}" | Current Draft Title: "${draftTitle}" | Created: ${item.createdAt}`;
      }).join('\n');

      const historyStr = history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');

      const prompt = `
      You are Aasani, a helpful AI assistant inside a productivity app.
      
      CONTEXT:
      Available Projects:
      ${projectContext}
      
      CURRENT PENDING ITEMS (In Draft/Staging):
      ${pendingContext}
      
      Conversation History:
      ${historyStr}
      
      USER INPUT: "${message}"
      
      INSTRUCTIONS:
      1. Act like a chat assistant (like ChatGPT). Answer questions, be helpful, be conversational.
      2. INTELLIGENTLY DECIDE between CREATING a new item or UPDATING a pending one.
      3. **UPDATE Logic:** If the user's input seems to be refining, correcting, or adding details to one of the "Pending Items" listed above (e.g. "make it 2pm", "assign to project X", "change title to..."), return an update instruction for that ID.
      4. **CREATE Logic:** If it's a completely new thought, extract it as a captured item.
      5. **IMPORTANT:** When referring to a pending item in your 'response', **NEVER** use the ID. Refer to it by its title in quotes, e.g. "I've updated 'Meeting with Sam' for you." or "Regarding 'Project Alpha'...".
      
      RETURN JSON format:
      {
        "response": "Your conversational reply here. Remember: quote titles, hide IDs.",
        "capturedItems": [
           { "content": "The extracted task or note content", "type": "text" }
        ],
        "updatedItems": [
           { 
             "id": "ID of the pending item to update", 
             "updates": { 
                "title": "New Title (if changed)",
                "priority": "High" | "Medium" | "Low",
                "type": "task" | "document" | "project",
                "project": "project_id_or_name"
             } 
           }
        ]
      }
      
      If nothing needs to be captured or updated, return empty arrays.
      Prioritize UPDATING the most recent pending item if the context implies continuity.
      `;

      try {
          const result = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          const json = JSON.parse(result.text || "{}");
          return {
              response: json.response || "I heard you.",
              capturedItems: json.capturedItems || [],
              updatedItems: json.updatedItems || []
          };
      } catch (e) {
          return { response: "I'm having trouble connecting.", capturedItems: [], updatedItems: [] };
      }
  },

  async analyzeKickoffDoc(content: string): Promise<InboxAction | null> {
      if (!apiKey) return null;
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `
              Analyze this raw document (notes, email, or brain dump).
              Does it look like a new project request?
              
              If yes, extract:
              1. A Project Title
              2. Client Name (if any)
              3. List of Tasks (Scope)
              4. List of potential Goals/OKRs
              
              Input: "${content.slice(0, 10000)}"
              
              Return JSON:
              {
                "isProject": boolean,
                "projectTitle": string,
                "clientName": string,
                "extractedTasks": [{ "title": string, "priority": "High"|"Medium"|"Low", "description": string }],
                "extractedGoals": [{ "title": string, "metric": string }],
                "reasoning": string
              }
              `,
              config: { responseMimeType: "application/json" }
          });
          
          const result = JSON.parse(response.text || "{}");
          
          if (result.isProject) {
              return {
                  actionType: 'create_project',
                  targetProjectId: 'NEW:' + result.projectTitle,
                  reasoning: result.reasoning,
                  data: {
                      title: result.projectTitle,
                      clientData: result.clientName ? { name: 'Point of Contact', company: result.clientName } : undefined,
                      extractedTasks: result.extractedTasks,
                      // @ts-ignore
                      extractedGoals: result.extractedGoals 
                  }
              };
          }
          return null;
      } catch (e) {
          return null;
      }
  },

  async reasonAboutInboxItem(content: string, history: Array<{role: 'user'|'model', text: string}>, projects: Project[], scheduleContext: string): Promise<ReasoningResponse> {
      const projectContext = projects.map(p => `ID: ${p.id}, Title: ${p.title}`).join('\n');
      
      const chatHistoryStr = history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');

      const prompt = `
      ${getDynamicProtocol()}
      
      TASK: You are Aasani's "Inbox Architect". Your job is to process raw thoughts into structured actions (Tasks or Documents).
      
      CONTEXT:
      Available Projects:
      ${projectContext}
      
      Existing Schedule (Next 30 days):
      ${scheduleContext}
      
      CONVERSATION HISTORY:
      ${chatHistoryStr}
      
      CURRENT INPUT: "${content}"
      
      INSTRUCTIONS:
      1. Check for Ambiguity:
         - Time (e.g. "2" -> AM or PM? Timezone?)
         - Assignee (Who should do this?)
         - Project (Which project does this belong to?)
         - Type (Is this a task, a note, or a new project?)
      
      2. If Ambiguous:
         - Return JSON: { "type": "clarification", "question": "Your clarifying question here..." }
         - Be conversational and concise.
      
      3. If Clear:
         - Return JSON: { "type": "action", "action": { actionType, targetProjectId, reasoning, data: {...} } }
         - Action types: 'create_task', 'create_document', 'create_project'.
      `;

      try {
          if (!apiKey) return { type: 'clarification', question: "API Key missing." };
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          const result = JSON.parse(response.text || "{}");
          
          if (result.type === 'clarification') {
              return { type: 'clarification', question: result.question };
          } else if (result.type === 'action') {
              return { type: 'action', action: result.action };
          }
          
          return { type: 'clarification', question: "Could you clarify what you want me to do with this?" };
          
      } catch (error) {
          console.error(error);
          return { type: 'clarification', question: "I encountered an error. Could you rephrase?" };
      }
  },

  async organizeInboxItem(content: string, projects: Project[], scheduleContext: string, provider?: any, userApiKey?: string, model?: string, attachments: any[] = []): Promise<InboxAction | null> {
      const result = await this.reasonAboutInboxItem(content, [], projects, scheduleContext);
      if (result.type === 'action') return result.action;
      return null; 
  },

  async suggestBundle(items: any[]): Promise<any> {
      if (!apiKey || items.length < 3) return null;
      try {
          const itemList = items.map(i => `- ${i.content}`).join('\n');
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Bundle these? ${itemList}. JSON {title, reason} or null.`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "null");
      } catch (e) { return null; }
  },

  async smartBreakdown(taskTitle: string, taskDescription: string): Promise<any> {
      if (!apiKey) return [];
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Breakdown "${taskTitle}". JSON Array [{title, priority}]`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "[]");
      } catch (e) { return []; }
  },

  async enrichTask(taskTitle: string, taskDescription: string): Promise<any> {
      if (!apiKey) return { title: taskTitle, description: taskDescription };
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Enrich "${taskTitle}". JSON {title, description}`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}");
      } catch (e) { return { title: taskTitle, description: taskDescription }; }
  },

  async extractTasks(text: string): Promise<any> {
    if (!apiKey) return [];
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Extract tasks from "${text}". JSON array.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
  },
  
  async suggestTasksFromContext(context: string): Promise<any> {
    if (!apiKey) return [];
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Suggest tasks from context. JSON array.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
  },

  async generateDocumentContent(prompt: string, currentContent: string): Promise<string> {
    if (!apiKey) return "";
    try {
      const response = await ai.models.generateContent({ model: MODEL_NAME, contents: `Context: "${currentContent}". Prompt: "${prompt}".` });
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
              contents: `Suggest tags. JSON { tags: [] }`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}").tags || [];
      } catch (e) { return []; }
  },

  async improveWriting(text: string): Promise<string> { return this.simpleGen(`Improve: "${text}"`) || text; },
  async fixGrammar(text: string): Promise<string> { return this.simpleGen(`Fix grammar: "${text}"`) || text; },
  async shortenText(text: string): Promise<string> { return this.simpleGen(`Shorten: "${text}"`) || text; },
  async continueWriting(context: string): Promise<string> { return this.simpleGen(`Continue: "${context.slice(-2000)}"`) || ""; },
  
  async expandTaskToContent(taskTitle: string, taskDescription?: string): Promise<string> { 
      const prompt = `Expand "${taskTitle}" into document. ${DOCUMENT_STYLE_GUIDE}`;
      return this.simpleGen(prompt) || `# ${taskTitle}`; 
  },
  
  async simpleGen(prompt: string): Promise<string> {
      if(!apiKey) return "";
      try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt }); return r.text || ""; } catch(e) { return ""; }
  },

  async generateVerseOfTheDay(context: string): Promise<any> {
      if (!apiKey) return null;
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Verse for context. JSON { verse, reference, explanation }`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}");
      } catch (e) { return null; }
  },

  async performAgentTask(role: AgentRole, taskTitle: string, taskDescription?: string): Promise<AgentResult> {
      if (!apiKey) return { output: "Error", type: 'text', timestamp: new Date() };
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Act as ${role}. Task: ${taskTitle}.`
          });
          return { output: response.text || "No output.", type: 'text', timestamp: new Date() };
      } catch (error) { return { output: "Error.", type: 'text', timestamp: new Date() }; }
  },

  async analyzeStaleTask(taskTitle: string, daysStuck: number): Promise<string> {
      if (!apiKey) return "Review task.";
      try { const r = await ai.models.generateContent({ model: MODEL_NAME, contents: `Task "${taskTitle}" stuck.` }); return r.text || "Break it down."; } catch (e) { return "Review task."; }
  },

  async fetchOpenRouterModels(): Promise<{id: string, name: string}[]> {
      try {
          const response = await fetch("https://openrouter.ai/api/v1/models");
          const data = await response.json();
          return (data.data || []).map((m: any) => ({ id: m.id, name: m.name }));
      } catch (e) {
          return [];
      }
  },

  async chatWithProvider(params: {
      provider: 'gemini' | 'openrouter',
      apiKey?: string,
      model?: string,
      history: any[],
      message: string,
      attachments?: Attachment[],
      systemContext?: string
  }): Promise<string> {
      if (params.provider === 'openrouter' && params.apiKey) {
          // OpenRouter Implementation
          try {
              const messages = [
                  { role: 'system', content: params.systemContext || "You are a helpful assistant." },
                  ...params.history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts?.[0]?.text || h.text })),
                  { role: 'user', content: params.message }
              ];
              
              const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                      "Authorization": `Bearer ${params.apiKey}`,
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                      model: params.model || "openai/gpt-4o",
                      messages: messages
                  })
              });
              const data = await response.json();
              return data.choices?.[0]?.message?.content || "No response from OpenRouter.";
          } catch (e) {
              return "Error communicating with OpenRouter.";
          }
      } else {
          // Gemini Implementation
          try {
              if (!apiKey) return "API Key missing for Gemini.";
              
              const chatHistory = params.history.map(h => ({
                  role: h.role,
                  parts: h.parts || [{ text: h.text }]
              }));

              const chat = ai.chats.create({
                  model: MODEL_NAME,
                  config: { systemInstruction: params.systemContext },
                  history: chatHistory
              });

              // Construct content for sendMessage
              let messageContent: any = [{ text: params.message }];
              if (params.attachments && params.attachments.length > 0) {
                  params.attachments.forEach(att => {
                      messageContent.push({
                          inlineData: {
                              mimeType: att.mimeType,
                              data: att.data
                          }
                      });
                  });
              }
              
              const result = await chat.sendMessage({ message: messageContent });
              return result.text || "";
          } catch (e) {
              console.error(e);
              return "Error communicating with Gemini.";
          }
      }
  },

  async chat(history: any[], message: string, attachments: any[] = [], systemContext: string = ""): Promise<string> {
      return this.chatWithProvider({
          provider: 'gemini',
          history,
          message,
          attachments,
          systemContext
      });
  },

  async queryWorkspace(query: string, context: string): Promise<string> {
      if (!apiKey) return "API Key missing.";
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `
              CONTEXT:
              ${context}
              
              USER QUERY: "${query}"
              
              INSTRUCTIONS:
              Answer the user's query based strictly on the provided context. 
              If the answer is not in the context, say "I don't have that information."
              Be concise.
              `
          });
          return response.text || "No answer generated.";
      } catch (e) {
          return "Error querying workspace.";
      }
  },

  async parseVoiceCommand(transcript: string, projects: Project[]): Promise<{ type: string, data: any, feedback: string }> {
      if (!apiKey) return { type: 'unknown', data: {}, feedback: "API Key missing." };
      
      const projectList = projects.map(p => p.title).join(', ');
      
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `
              Parse this voice command: "${transcript}"
              
              Available Projects: ${projectList}
              
              Return JSON with:
              - type: 'create_task' | 'create_note' | 'navigate' | 'unknown'
              - data: object with extracted fields (title, projectId, priority, dueDate for tasks; content for notes; view for navigate)
              - feedback: Short confirmation text to show user (e.g. "Creating task...")
              
              For 'navigate', view can be 'HOME', 'INBOX', 'BOARD', 'CALENDAR', 'SETTINGS'.
              `,
              config: { responseMimeType: "application/json" }
          });
          
          return JSON.parse(response.text || '{ "type": "unknown", "feedback": "Could not parse." }');
      } catch (e) {
          return { type: 'unknown', data: {}, feedback: "Error parsing command." };
      }
  },

  async generateDailyBriefing(tasks: Task[], projects: Project[]): Promise<DailyBriefing> {
      if (!apiKey) return { greeting: "Hello", narrative: "Welcome back.", vibe: "Light", stats: {} };
      
      const taskSummary = tasks.slice(0, 20).map(t => `- ${t.title} (${t.status}, ${t.priority})`).join('\n');
      const projectSummary = projects.map(p => p.title).join(', ');
      
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `
              Generate a morning briefing JSON.
              
              Tasks:
              ${taskSummary}
              
              Projects:
              ${projectSummary}
              
              Return JSON:
              {
                  "greeting": "Good morning/afternoon",
                  "narrative": "A 2-sentence summary of what needs attention today.",
                  "focusTask": { "id": "task_id_if_any", "title": "Task Title", "reason": "Why this is important" },
                  "vibe": "Deep Work" | "Meeting Heavy" | "Admin & Cleanup" | "Light"
              }
              `,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}");
      } catch (e) {
          return { greeting: "Hello", narrative: "Ready to work?", vibe: "Light", stats: {} };
      }
  }
};

const getDynamicProtocol = (): string => {
    const ctx = dataService.getBusinessContext();
    return `Identity: Aasani. Context: ${ctx.companyName}.
    You are an intelligent internal system. When asked to draft proposals, strictly follow the Ironside Computers format.
    `;
};
