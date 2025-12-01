import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, TaskStatus, TaskPriority, ProjectPlan, Attachment, Project, InboxAction, AgentRole, AgentResult, Document, Source } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });

const MODEL_NAME = "gemini-2.5-flash";

export const geminiService = {
  /**
   * Multimodal Chat interaction
   */
  async chat(history: { role: string; parts: { text?: string; inlineData?: any }[] }[], message: string, attachments: Attachment[] = [], systemContext?: string): Promise<string> {
    if (!apiKey) return "Error: No API Key configured.";

    try {
      const chat = ai.chats.create({
        model: MODEL_NAME,
        history: history.map(h => ({
            role: h.role,
            parts: h.parts
        })),
        config: {
          systemInstruction: `You are Aasani, the AI system core for Aasani OS. You are an intelligent operating partner. 
          
          ${systemContext ? `CURRENT WORKSPACE CONTEXT (Use this to answer): \n${systemContext}\n` : ''}
          
          Guidelines:
          - You help organize projects, simplify workflows, and connect information. 
          - You are concise, proactive, and structured.
          - If the user asks about a specific document or task mentioned in the context, use that info.
          - If you use information from the context, you don't need to explicitly say "According to the document...", just answer naturally.`,
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

  /**
   * RAG-lite: Selects relevant documents based on the query and returns context + source metadata
   */
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

  /**
   * Queries the entire workspace context
   */
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
   * Analyzes an Inbox Item and decides where it goes
   */
  async organizeInboxItem(content: string, projects: Project[]): Promise<InboxAction | null> {
      if (!apiKey) return null;

      const projectContext = projects.map(p => `ID: ${p.id}, Title: ${p.title}`).join('\n');

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `You are an Expert Technical Project Manager and Technical Writer. Use the following user note to perform an action.
              
              **User Note**: "${content}"
              
              **Decision Logic**:
              1. **CREATE_PROJECT**: If the note contains a detailed list of features, progress updates (like "1. Feature A", "2. Backend"), or a summary of work done -> Action: 'create_project'.
              2. **CREATE_TASK/DOC**: If it's a single item.

              **IF 'create_project' (CRITICAL INSTRUCTIONS):**
              - **Project Title**: Extract the name (e.g., "Ironside AI", "V2 Launch").
              - **Overview Document**: Create a **CLEAN, HIGHLY STRUCTURED** Markdown document.
                - **CRITICAL FORMATTING RULE**: If the input has numbered items (e.g., "1. Backend", "2. Frontend"), YOU MUST convert these into **H2 Headers** (e.g., "## 1. Backend"). 
                - **DO NOT** lump them into a single paragraph.
                - Use **Bullet Points** for the details under each header.
                - Use **Bold** for key technologies or metrics.
                - Ensure there is spacing between sections.
                - Structure it like a professional engineering release note or status update.
              - **Tasks**: Extract EVERY substantive bullet point as a task.
                - **Status Mapping (BE STRICT)**:
                  - Past tense verbs ("Built", "Shipped", "Fixed", "Implemented", "Created", "Delivered", "Completed", "Done", "Sent", "Responded") -> **'Done'**
                  - Present continuous ("Working on", "In progress", "Refining", "Building") -> **'In Progress'**
                  - Future/Pending ("Need to", "Plan to", "Waiting for", "Next steps", "To do", "If X wants") -> **'To Do'**
                - **Priority**: Mark 'High' for "Critical", "Blocker", "Core", or "Phase 1". Default to 'Medium'.

              **Available Projects**:
              ${projectContext}
              
              Return JSON matching the schema.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          actionType: { type: Type.STRING, enum: ['create_task', 'create_document', 'create_project'] },
                          targetProjectId: { type: Type.STRING, description: "The ID of the project or NEW:Name" },
                          reasoning: { type: Type.STRING },
                          data: {
                              type: Type.OBJECT,
                              properties: {
                                  title: { type: Type.STRING },
                                  description: { type: Type.STRING },
                                  content: { type: Type.STRING },
                                  priority: { type: Type.STRING, enum: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW] }
                              },
                              required: ["title"]
                          },
                          // Schema for Project Creation
                          projectPlan: {
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
                                              dueDate: { type: Type.STRING }
                                          },
                                          required: ["title", "status"]
                                      }
                                  }
                              }
                          }
                      },
                      required: ["actionType", "targetProjectId", "data", "reasoning"]
                  }
              }
          });

          const jsonStr = response.text;
          if (!jsonStr) return null;
          return JSON.parse(jsonStr) as InboxAction;
      } catch (error) {
          console.error("Gemini Inbox Sort Error:", error);
          return null;
      }
  },

  /**
   * Generates a full project plan (Doc + Tasks) from a text prompt or file inputs
   */
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
                  - Use **H2 Headers** and **Bullet Points**.
                  - **AVOID WALLS OF TEXT.** Make it scannable and clean.
                  - Include sections for: Executive Summary, Scope of Work, and Timeline.
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
                                assignee: { type: Type.STRING, description: "Inferred assignee name or 'Unassigned'" },
                                dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional list of task titles this task depends on." },
                                dueDate: { type: Type.STRING, description: "ISO Date string if a date is found in the doc" }
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

  /**
   * Analyzes text to extract actionable tasks
   */
  async extractTasks(text: string): Promise<Partial<Task>[]> {
    if (!apiKey) return [];

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Analyze the following document content to identify actionable tasks.
        
        For each task:
        1. Extract the title and a brief description.
        2. Infer the assignee if a specific person is mentioned.
        3. Assess the urgency and importance of the task within the context and automatically assign a priority level: 'High', 'Medium', or 'Low'.

        Document Content: "${text}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        status: { type: Type.STRING, enum: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE] },
                        priority: { type: Type.STRING, enum: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW] },
                        assignee: { type: Type.STRING, description: "Inferred assignee name or 'Unassigned'" },
                        dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional list of task titles this task depends on." }
                    },
                    required: ["title", "status", "priority"]
                }
            }
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) return [];
      return JSON.parse(jsonStr) as Partial<Task>[];
    } catch (error) {
      console.error("Gemini Extract Tasks Error:", error);
      return [];
    }
  },

  /**
   * Suggests tasks based on provided context (document content or chat history)
   */
  async suggestTasksFromContext(context: string): Promise<Partial<Task>[]> {
    if (!apiKey) return [];

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are a proactive Project Manager AI for Aasani OS. 
        Based on the provided Context (which may include document text and recent chat history), suggest 3-5 logical, actionable next steps or tasks for this project.
        
        Context:
        "${context.substring(0, 15000)}"
        
        Requirements:
        1. Tasks should be clear and actionable.
        2. Infer priority based on urgency in the context.
        3. If no specific context is clear, suggest standard project initiation tasks.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        status: { type: Type.STRING, enum: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE] },
                        priority: { type: Type.STRING, enum: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW] },
                        assignee: { type: Type.STRING, description: "Inferred assignee name or 'Unassigned'" },
                        dependencies: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "status", "priority"]
                }
            }
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) return [];
      return JSON.parse(jsonStr) as Partial<Task>[];
    } catch (error) {
      console.error("Gemini Suggest Tasks Error:", error);
      return [];
    }
  },

  /**
   * Generates content continuation or specific sections for a document
   */
  async generateDocumentContent(prompt: string, currentContent: string): Promise<string> {
    if (!apiKey) return "";

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are a helpful AI writing assistant. 
        Context (Current Document Content): "${currentContent}"
        User Request: "${prompt}"
        
        Generate the requested content to be added to the document. Return ONLY the new text content, formatted in Markdown. Use headers, lists, and bold text for clarity. Do not include conversational filler.`,
      });
      
      return response.text || "";
    } catch (error) {
      console.error("Gemini Generate Content Error:", error);
      return "";
    }
  },

  /**
   * Summarizes the document content
   */
  async summarizeDocument(text: string): Promise<string> {
    if (!apiKey) return "Error: No API Key.";

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Summarize the following document concisely in a few paragraphs or a bulleted list. Capture the key points and any decisions made.
        
        Document Content:
        "${text}"`,
      });
      
      return response.text || "Could not generate summary.";
    } catch (error) {
      console.error("Gemini Summary Error:", error);
      return "Error generating summary.";
    }
  },

  /**
   * Suggests tags for a document based on content
   */
  async suggestTags(text: string): Promise<string[]> {
      if (!apiKey) return [];
      
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `Analyze the following document content and suggest 3-5 relevant tags (keywords) for categorization. 
              Tags should be single words or short 2-word phrases (e.g., 'Meeting Notes', 'Architecture', 'Q3 Goals').
              
              Content: "${text.substring(0, 5000)}"`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          tags: {
                              type: Type.ARRAY,
                              items: { type: Type.STRING }
                          }
                      },
                      required: ["tags"]
                  }
              }
          });
          
          const jsonStr = response.text;
          if (!jsonStr) return [];
          const res = JSON.parse(jsonStr);
          return res.tags || [];
      } catch (error) {
          console.error("Gemini Suggest Tags Error:", error);
          return [];
      }
  },

  /**
   * Improves the writing style of selected text
   */
  async improveWriting(text: string): Promise<string> {
    if (!apiKey) return text;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Improve the clarity, flow, and professionalism of the following text. Keep the meaning identical, but make it read better. Return ONLY the improved text.
            
            Text: "${text}"`
        });
        return response.text || text;
    } catch (e) { return text; }
  },

  /**
   * Fixes grammar and spelling
   */
  async fixGrammar(text: string): Promise<string> {
    if (!apiKey) return text;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Fix any grammar, spelling, or punctuation errors in the following text. Return ONLY the corrected text.
            
            Text: "${text}"`
        });
        return response.text || text;
    } catch (e) { return text; }
  },

  /**
   * Shortens the text
   */
  async shortenText(text: string): Promise<string> {
    if (!apiKey) return text;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Condense the following text to be more concise without losing key information. Return ONLY the shortened text.
            
            Text: "${text}"`
        });
        return response.text || text;
    } catch (e) { return text; }
  },

  /**
   * Autocompletes or continues text (Ghostwriter)
   */
  async continueWriting(context: string): Promise<string> {
    if (!apiKey) return "";
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `You are a ghostwriter. Based on the following document context, write the next logical sentence or short phrase to complete the thought. 
            Do not repeat the last sentence. Keep it natural and consistent with the tone. Return ONLY the completion text.
            
            Context: "${context.slice(-2000)}"`
        });
        return response.text?.trim() || "";
    } catch (e) { return ""; }
  },

  /**
   * Expands a task into a full document starter
   */
  async expandTaskToContent(taskTitle: string, taskDescription?: string): Promise<string> {
    if (!apiKey) return `# ${taskTitle}\n\n`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `You are Aasani. The user wants to expand a Task into a full Document/Page.
            
            Task Title: "${taskTitle}"
            Task Description: "${taskDescription || ''}"
            
            Generate a starter document structure. 
            Include a title (H1), an Overview section, a Strategy/Details section, and a Next Steps section. 
            Fill it with placeholder or inferred content based on the task description. 
            Return the result in Markdown.`
        });
        return response.text || `# ${taskTitle}\n\n`;
    } catch (error) {
        return `# ${taskTitle}\n\n`;
    }
  },

  /**
   * Generates a daily briefing based on tasks and context
   */
  async generateDailyBriefing(userName: string, context: string): Promise<string> {
    if (!apiKey) return `Good morning, ${userName}. Here is your overview.`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are the Aasani OS personal assistant.
        User: ${userName}.
        Current Date: ${new Date().toDateString()}.
        
        Work Context (Overdue, Due Today, High Priority):
        ${context}
        
        Generate a concise, friendly, and motivating "Daily Briefing" (max 3 sentences). 
        Highlight the most critical item. Start with a greeting.`,
      });
      return response.text || "Ready to start the day.";
    } catch (e) {
      return "Unable to generate briefing.";
    }
  },

  /**
   * Performs a task assigned to an AI Agent
   */
  async performAgentTask(role: AgentRole, taskTitle: string, taskDescription?: string): Promise<AgentResult> {
      if (!apiKey) return { output: "Error: No API Key", type: 'text', timestamp: new Date() };

      let prompt = "";
      if (role === AgentRole.RESEARCHER) {
          prompt = `You are an expert AI Researcher. The user has assigned you this task: "${taskTitle}". 
          Description: "${taskDescription || ''}". 
          
          Please perform a comprehensive research summary on this topic. Structure your response with:
          1. Key Findings
          2. Relevant Facts/Data
          3. Sources/References (simulated if necessary)
          4. Recommended Next Steps.
          
          Format as Markdown.`;
      } else if (role === AgentRole.WRITER) {
          prompt = `You are an expert AI Writer. The user has assigned you this task: "${taskTitle}". 
          Description: "${taskDescription || ''}". 
          
          Please draft the content requested. Focus on high quality, professional tone, and clarity. 
          If the task is vague, assume a standard business document format.
          
          Format as Markdown.`;
      } else if (role === AgentRole.PLANNER) {
          prompt = `You are an expert AI Project Planner. The user has assigned you this task: "${taskTitle}". 
          Description: "${taskDescription || ''}". 
          
          Please break this task down into a detailed Checklist of subtasks. 
          Do not write paragraphs. Write a Markdown checkbox list (e.g., - [ ] Step 1).
          Include dependencies or prerequisites if obvious.`;
      }

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt
          });
          
          return {
              output: response.text || "I tried to do the work but produced no output.",
              type: role === AgentRole.PLANNER ? 'checklist' : 'text',
              timestamp: new Date()
          };
      } catch (error) {
          return { output: "I encountered an error while working on this task.", type: 'text', timestamp: new Date() };
      }
  },

  /**
   * Phase 7: Analyze Stale Task
   * Suggests what to do with a task that has been stuck for a while.
   */
  async analyzeStaleTask(taskTitle: string, daysStuck: number): Promise<string> {
      if (!apiKey) return "Review this task manually.";

      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: `The user has a task "${taskTitle}" that has been 'In Progress' for ${daysStuck} days.
              Suggest a 1-sentence recommended action to unblock it.
              Options: Delegate to AI, Break it down, or Delete it if irrelevant.`
          });
          return response.text || "Consider breaking this task down.";
      } catch (e) {
          return "Consider reviewing this task.";
      }
  }
};