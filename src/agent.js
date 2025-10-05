/**
 * Durable Object: TaskAgent
 * Minimal implementation without external "agents" package.
 * Stores tasks and conversations in Durable Object storage.
 */
export class TaskAgent {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.initialized = false;
  }

  async #ensureInitialized() {
    if (this.initialized) return;
    this.tasks = (await this.state.storage.get("tasks")) || [];
    this.conversations = (await this.state.storage.get("conversations")) || [];
    this.nextTaskId = (await this.state.storage.get("nextTaskId")) || 1;
    this.initialized = true;
  }

  async #persist() {
    await Promise.all([
      this.state.storage.put("tasks", this.tasks),
      this.state.storage.put("conversations", this.conversations),
      this.state.storage.put("nextTaskId", this.nextTaskId),
    ]);
  }

  async fetch(request) {
    await this.#ensureInitialized();
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.headers.get("Upgrade") === "websocket" || pathname === "/ws") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      await this.handleWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (pathname === "/chat" && request.method === "POST") {
      const { message, context = {} } = await request.json();
      const response = await this.chat(message, context);
      return Response.json({ response, timestamp: new Date().toISOString() });
    }

    if (pathname.startsWith("/tasks")) {
      const parts = pathname.split("/").filter(Boolean);
      if (request.method === "GET") {
        if (parts.length === 1) {
          return Response.json({ tasks: this.#listAllTasks() });
        }
        const id = Number(parts[1]);
        const task = this.tasks.find(t => t.id === id);
        if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
        return Response.json({ task });
      }

      if (request.method === "POST" && parts.length === 1) {
        const data = await request.json();
        const task = await this.#createTaskDirect(data);
        return Response.json({ id: task.id, message: "Task created successfully" }, { status: 201 });
      }

      if (request.method === "PUT" && parts.length === 2) {
        const id = Number(parts[1]);
        const data = await request.json();
        const ok = await this.#updateTaskDirect(id, data);
        if (!ok) return Response.json({ error: "Task not found" }, { status: 404 });
        return Response.json({ message: "Task updated successfully" });
      }

      if (request.method === "DELETE" && parts.length === 2) {
        const id = Number(parts[1]);
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx === -1) return Response.json({ error: "Task not found" }, { status: 404 });
        this.tasks.splice(idx, 1);
        await this.#persist();
        return Response.json({ message: "Task deleted successfully" });
      }
    }

    return new Response("Not found", { status: 404 });
  }

  async chat(message, context = {}) {
    await this.#ensureInitialized();
    const response = await this.processUserMessage(message, context);
    this.conversations.push({
      id: this.conversations.length + 1,
      user_message: message,
      agent_response: response,
      created_at: new Date().toISOString(),
      context,
    });
    await this.#persist();
    return response;
  }

  async processUserMessage(message, context) {
    try {
      const intent = await this.analyzeIntent(message);
      switch (intent.type) {
        case "create_task":
          return await this.createTask(intent.parameters, message);
        case "list_tasks":
          return await this.listTasks(intent.parameters);
        case "update_task":
          return await this.updateTask(intent.parameters);
        case "complete_task":
          return await this.completeTask(intent.parameters);
        case "delete_task":
          return await this.deleteTask(intent.parameters);
        case "schedule_tasks":
          return await this.scheduleTasks(intent.parameters);
        case "analyze_productivity":
          return await this.analyzeProductivity();
        case "get_suggestions":
          return await this.getTaskSuggestions(intent.parameters);
        default:
          return await this.generalResponse(message);
      }
    } catch (e) {
      console.error("processUserMessage error", e);
      return "I hit an error processing that. Please try again.";
    }
  }

  async analyzeIntent(message) {
    // Try AI-powered intent analysis first (Workers AI with Llama 3.3)
    try {
      const prompt = `Analyze this user message and return ONLY a valid JSON object.

Message: "${message}"

Return format:
{"type": "intent_type", "parameters": {...}}

Valid types: create_task, list_tasks, update_task, complete_task, delete_task, schedule_tasks, analyze_productivity, get_suggestions, general

Examples:
"Create a task to buy milk" -> {"type":"create_task","parameters":{"title":"buy milk"}}
"Show pending tasks" -> {"type":"list_tasks","parameters":{"status":"pending"}}
"Complete task 3" -> {"type":"complete_task","parameters":{"task_id":3}}

Return ONLY the JSON, no explanation:`;

      const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.1,
      });

      // Extract JSON from response
      const text = String(response.response || "");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.type && result.parameters !== undefined) {
      return result;
        }
      }
    } catch (error) {
      console.log("AI intent analysis failed, using heuristics:", error.message);
    }

    // Fallback to heuristic parsing if AI fails
    const text = String(message || "").toLowerCase();
    const numberMatch = text.match(/\b(\d+)\b/);
    const extractId = () => (numberMatch ? Number(numberMatch[1]) : undefined);

    if (/\b(create|add|new task)\b/.test(text)) {
      const titleMatch = text.match(/(?:create|add)(?:\s+(?:a|the))?\s+task(?:\s+to)?\s+(.+)/);
      const title = titleMatch ? titleMatch[1] : message;
      const priority = /\bhigh\b/.test(text) ? "high" : /\blow\b/.test(text) ? "low" : /\bmedium\b/.test(text) ? "medium" : undefined;
      return { type: "create_task", parameters: { title, priority } };
    }

    if (/\b(list|show|display)\b/.test(text)) {
      const status = /\bpending\b/.test(text) ? "pending" : /\bcompleted?\b/.test(text) ? "completed" : undefined;
      const priority = /\bhigh\b/.test(text) ? "high" : /\blow\b/.test(text) ? "low" : /\bmedium\b/.test(text) ? "medium" : undefined;
      return { type: "list_tasks", parameters: { status, priority } };
    }

    if (/\b(complete|done|finish|mark as completed)\b/.test(text)) {
      return { type: "complete_task", parameters: { task_id: extractId() } };
    }

    if (/\b(delete|remove)\b/.test(text)) {
      return { type: "delete_task", parameters: { task_id: extractId() } };
    }

    if (/\b(update|change|edit)\b/.test(text)) {
      const updates = { task_id: extractId() };
      if (/\bhigh\b/.test(text)) updates.priority = "high";
      if (/\bmedium\b/.test(text)) updates.priority = "medium";
      if (/\blow\b/.test(text)) updates.priority = "low";
      return { type: "update_task", parameters: updates };
    }

    if (/\bschedule\b/.test(text)) {
      return { type: "schedule_tasks", parameters: {} };
    }

    if (/\b(analy[zs]e|report|stats|insights)\b/.test(text)) {
      return { type: "analyze_productivity", parameters: {} };
    }

    if (/\b(suggest|recommend|what should i work)\b/.test(text)) {
      return { type: "get_suggestions", parameters: { context: "today" } };
    }

    return { type: "general", parameters: {} };
  }

  async #createTaskDirect(data) {
    const id = this.nextTaskId++;
    const now = new Date().toISOString();
    const task = {
      id,
      title: data.title,
      description: data.description || "",
      priority: data.priority || "medium",
      status: data.status || "pending",
      created_at: now,
      updated_at: now,
      due_date: data.due_date || null,
      tags: data.tags || "",
      metadata: data.metadata || null,
    };
    this.tasks.unshift(task);
    await this.#persist();
    return task;
  }

  #listAllTasks() {
    return this.tasks.slice();
  }

  async #updateTaskDirect(id, updates) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return false;
    Object.assign(task, updates, { updated_at: new Date().toISOString() });
    await this.#persist();
    return true;
  }

  async createTask(parameters) {
    const { title, description, priority = "medium", due_date, tags } = parameters;
    if (!title) return "Please provide a task title.";
    const task = await this.#createTaskDirect({ title, description, priority, due_date, tags });

    // Optional: insert into Vectorize
    try {
      if (this.env.TASK_MEMORY?.insert) {
        const embedding = await this.generateTaskEmbedding(`${task.title} ${task.description}`.trim());
        await this.env.TASK_MEMORY.insert([
          {
            id: String(task.id),
            values: embedding,
            metadata: { task_id: task.id, title: task.title, priority: task.priority, status: task.status },
          },
        ]);
      }
    } catch (e) {
      // ignore vectorize errors in local/not supported
    }

    return `✅ Task created successfully!\n\n**Task #${task.id}**\n📝 Title: ${task.title}\n${task.description ? `📄 Description: ${task.description}\n` : ""}⚡ Priority: ${task.priority}\n${task.due_date ? `📅 Due: ${task.due_date}\n` : ""}${task.tags ? `🏷️ Tags: ${task.tags}` : ""}`;
  }

  async listTasks(parameters = {}) {
    const { status = null, priority = null, limit = 10 } = parameters;
    let tasks = this.#listAllTasks();
    if (status) tasks = tasks.filter(t => t.status === status);
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    tasks = tasks.slice(0, limit);
    if (tasks.length === 0) return "📋 You don't have any tasks matching those criteria.";

    let response = `📋 **Your Tasks** (${tasks.length})\n\n`;
    tasks.forEach((task, index) => {
      const statusEmoji = this.getStatusEmoji(task.status);
      const priorityEmoji = this.getPriorityEmoji(task.priority);
      response += `${index + 1}. ${statusEmoji} **${task.title}**\n`;
      if (task.description) response += `   📄 ${task.description}\n`;
      response += `   ${priorityEmoji} Priority: ${task.priority}\n`;
      response += `   🏷️ Status: ${task.status}\n`;
      if (task.due_date) response += `   📅 Due: ${task.due_date}\n`;
      if (task.tags) response += `   🏷️ Tags: ${task.tags}\n`;
      response += `   🆔 ID: ${task.id}\n\n`;
    });
    return response;
  }

  async updateTask(parameters) {
    const { task_id, ...updates } = parameters;
    if (!task_id) return "I need a task ID to update.";
    const ok = await this.#updateTaskDirect(Number(task_id), updates);
    return ok ? `✅ Task #${task_id} has been updated successfully!` : "Task not found.";
  }

  async completeTask(parameters) {
    const { task_id } = parameters;
    if (!task_id) return "I need a task ID to mark as complete.";
    const ok = await this.#updateTaskDirect(Number(task_id), { status: "completed" });
    return ok ? `🎉 Great job! Task #${task_id} has been marked as completed!` : "Task not found.";
  }

  async deleteTask(parameters) {
    const { task_id } = parameters;
    if (!task_id) return "I need a task ID to delete.";
    const idx = this.tasks.findIndex(t => t.id === Number(task_id));
    if (idx === -1) return "Task not found.";
    this.tasks.splice(idx, 1);
    await this.#persist();
    return `🗑️ Task #${task_id} has been deleted successfully.`;
  }

  async scheduleTasks() {
    const pending = this.tasks.filter(t => t.status === "pending");
    if (pending.length === 0) return "🎯 You don't have any pending tasks to schedule!";
    const sorted = pending.slice().sort((a, b) => {
      const pri = v => (v === "high" ? 1 : v === "medium" ? 2 : 3);
      const ap = pri(a.priority) - pri(b.priority);
      if (ap !== 0) return ap;
      const ad = a.due_date ? Date.parse(a.due_date) : Infinity;
      const bd = b.due_date ? Date.parse(b.due_date) : Infinity;
      return ad - bd;
    });
    let response = `📅 **Your Recommended Schedule**\n\n`;
    sorted.forEach((task, idx) => {
      const priorityEmoji = this.getPriorityEmoji(task.priority);
      response += `${idx + 1}. ${priorityEmoji} **${task.title}**\n`;
      if (task.due_date) response += `   📅 Due: ${task.due_date}\n`;
      response += `   ⚡ Priority: ${task.priority}\n\n`;
    });
    response += "💡 **Tip**: Focus on high-priority tasks first!";
    return response;
  }

  async analyzeProductivity() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === "completed").length;
    const pending = this.tasks.filter(t => t.status === "pending").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const high_priority = this.tasks.filter(t => t.priority === "high").length;
    const medium_priority = this.tasks.filter(t => t.priority === "medium").length;
    const low_priority = this.tasks.filter(t => t.priority === "low").length;

    let response = `📊 **Productivity Analysis**\n\n`;
    response += `📈 **Overall Stats**\n`;
    response += `• Total Tasks: ${total}\n`;
    response += `• Completed: ${completed} (${completionRate}%)\n`;
    response += `• Pending: ${pending}\n\n`;
    response += `⚡ **Priority Breakdown**\n`;
    response += `• High Priority: ${high_priority}\n`;
    response += `• Medium Priority: ${medium_priority}\n`;
    response += `• Low Priority: ${low_priority}\n\n`;
    response += completionRate >= 80
      ? `🎉 Excellent work! You're maintaining a great completion rate!`
      : completionRate >= 60
      ? `👍 Good progress! Consider focusing on completing pending tasks.`
      : `💪 You can do it! Try breaking down large tasks into smaller ones.`;
    return response;
  }

  async getTaskSuggestions(parameters) {
    const { context = "general" } = parameters;
    const prompt = `Based on the user's task management context "${context}", provide 3-5 helpful suggestions for improving productivity and task management. Focus on actionable advice.`;
    try {
      const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });
      return `💡 **Smart Suggestions for You**\n\n${response.response}`;
    } catch (_) {
      return `💡 **General Productivity Tips**\n\n• Break large tasks into smaller chunks\n• Set realistic deadlines\n• Prioritize by importance and urgency\n• Take regular breaks\n• Review your task list daily`;
    }
  }

  async generalResponse(message) {
    return `Hello! I can help you manage tasks. Try:\n\n• "Create a task to buy milk tomorrow"\n• "Show my pending tasks"\n• "Mark task 1 as completed"\n• "Update task 2 to high priority"`;
  }

  async handleWebSocket(websocket) {
    websocket.accept();
    websocket.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);
        const response = await this.chat(data.message, data.context || {});
        websocket.send(JSON.stringify({ type: "response", message: response, timestamp: new Date().toISOString() }));
      } catch (e) {
        websocket.send(JSON.stringify({ type: "error", message: "An error occurred processing your message", timestamp: new Date().toISOString() }));
      }
    });
  }

  getStatusEmoji(status) {
    const emojis = { pending: "⏳", in_progress: "🔄", completed: "✅", cancelled: "❌" };
    return emojis[status] || "📝";
  }

  getPriorityEmoji(priority) {
    const emojis = { high: "🔴", medium: "🟡", low: "🟢" };
    return emojis[priority] || "⚪";
  }

  async generateTaskEmbedding(text) {
    try {
      const response = await this.env.AI.run("@cf/baai/bge-large-en-v1.5", { text: [text] });
      return response.data?.[0] || new Array(1024).fill(0);
    } catch (_) {
      return new Array(1024).fill(0);
    }
  }
}
