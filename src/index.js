import { TaskAgent } from "./agent.js";
import { TaskWorkflow } from "./workflows.js";

/**
 * Main Cloudflare Worker entry point
 * Handles HTTP requests and WebSocket connections for the AI Task Manager
 */

export default {
  /**
   * Handle incoming requests
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route Durable Object proxy first
      if (path.startsWith("/durable-object")) {
        return handleDurableObjectRequest(request, env);
      }

      // Handle WebSocket upgrade requests
      if (request.headers.get("Upgrade") === "websocket") {
        return handleWebSocket(request, env);
      }

      // Handle different endpoints
      if (path === "/") {
        return new Response(getHomePage(), {
          headers: { "Content-Type": "text/html" }
        });
      }

      if (path === "/chat" || path.startsWith("/chat")) {
        if (request.method === "POST") {
          return handleChatRequest(request, env);
        }
        return new Response(getChatPage(), {
          headers: { "Content-Type": "text/html" }
        });
      }

      if (path === "/tasks" || path.startsWith("/tasks")) {
        return handleTasksAPI(request, env);
      }

      if (path === "/health") {
        return new Response(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/workflows" || path.startsWith("/workflows/")) {
        return handleWorkflowsAPI(request, env);
      }

      if (path === "/voice" || path.startsWith("/voice")) {
        if (request.method === "POST") {
          return handleVoiceInput(request, env);
        }
        return new Response(getVoicePage(), {
          headers: { "Content-Type": "text/html" }
        });
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Error handling request:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * Handle WebSocket connections for real-time chat
 */
async function handleWebSocket(request, env) {
  const { 0: client, 1: server } = new WebSocketPair();

  const agentId = env.TASK_AGENT.idFromName("main-agent");
  const agent = env.TASK_AGENT.get(agentId);

  const doRequest = new Request("https://durable-object/ws", {
    headers: { Upgrade: "websocket" },
    webSocket: server,
  });
  await agent.fetch(doRequest);

  return new Response(null, { status: 101, webSocket: client });
}

/**
 * Handle chat API requests
 */
async function handleChatRequest(request, env) {
  try {
    const { message, context = {} } = await request.json();
    
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const agentId = env.TASK_AGENT.idFromName("main-agent");
    const agent = env.TASK_AGENT.get(agentId);

    const resp = await agent.fetch("https://durable-object/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context })
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error handling chat request:", error);
    return new Response(JSON.stringify({ error: "Failed to process message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * Handle tasks API endpoints
 */
async function handleTasksAPI(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const path = url.pathname;
  
  try {
    const agentId = env.TASK_AGENT.idFromName("main-agent");
    const agent = env.TASK_AGENT.get(agentId);

    switch (method) {
      case "GET": {
        if (path === "/tasks") {
          const r = await agent.fetch("https://durable-object/tasks");
          return new Response(await r.text(), { headers: { "Content-Type": "application/json" } });
        }
        if (pathParts[0] === "tasks" && pathParts[1]) {
          const taskId = pathParts[1];
          const r = await agent.fetch(`https://durable-object/tasks/${taskId}`);
          return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
        }
        break;
      }
      case "POST": {
        if (path === "/tasks") {
          const body = await request.text();
          const r = await agent.fetch("https://durable-object/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
        }
        break;
      }
      case "PUT": {
        if (pathParts[0] === "tasks" && pathParts[1]) {
          const taskId = pathParts[1];
          const body = await request.text();
          const r = await agent.fetch(`https://durable-object/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body,
          });
          return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
        }
        break;
      }
      case "DELETE": {
        if (pathParts[0] === "tasks" && pathParts[1]) {
          const taskId = pathParts[1];
          const r = await agent.fetch(`https://durable-object/tasks/${taskId}`, { method: "DELETE" });
          return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
        }
        break;
      }
      default:
        return new Response("Method not allowed", { status: 405 });
    }
    
    return new Response("Not found", { status: 404 });
  } catch (error) {
    console.error("Error handling tasks API:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * Handle Durable Object requests
 */
async function handleDurableObjectRequest(request, env) {
  const url = new URL(request.url);
  const agentId = env.TASK_AGENT.idFromName("main-agent");
  const agent = env.TASK_AGENT.get(agentId);
  
  return agent.fetch(request);
}

/**
 * Home page HTML
 */
function getHomePage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Task Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 800px;
            width: 90%;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .feature {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .feature-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .feature h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .feature p {
            color: #666;
            font-size: 0.9em;
        }
        
        .cta {
            text-align: center;
            margin-top: 30px;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 50px;
            font-size: 1.1em;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .demo-section {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .demo-section h3 {
            margin-bottom: 15px;
            color: #333;
        }
        
        .demo-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 1em;
            margin-bottom: 15px;
        }
        
        .demo-response {
            background: white;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            min-height: 100px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Task Manager</h1>
            <p>Intelligent task management powered by Cloudflare Workers AI and Llama 3.3</p>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🧠</div>
                <h3>AI-Powered</h3>
                <p>Natural language processing with Llama 3.3 for intelligent task management</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <h3>Real-time</h3>
                <p>WebSocket-based chat interface for instant responses and updates</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">💾</div>
                <h3>Persistent Memory</h3>
                <p>SQLite database with Vectorize for semantic search and context retention</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🔄</div>
                <h3>Workflows</h3>
                <p>Automated task scheduling and priority management with Cloudflare Workflows</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🎤</div>
                <h3>Voice Control</h3>
                <p>Hands-free task management with voice commands</p>
            </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="/voice" style="display: inline-block; padding: 10px 20px; background: #f0f0f0; color: #667eea; text-decoration: none; border-radius: 20px; font-size: 0.9em;">🎤 Try Voice Control</a>
            <a href="/workflows" style="display: inline-block; padding: 10px 20px; background: #f0f0f0; color: #667eea; text-decoration: none; border-radius: 20px; font-size: 0.9em;">🔄 View Workflows</a>
        </div>
        
        <div class="demo-section">
            <h3>Try it out:</h3>
            <input type="text" class="demo-input" id="demoInput" placeholder="Try: 'Create a task to buy groceries tomorrow' or 'Show me my pending tasks'">
            <div class="demo-response" id="demoResponse">Enter a message above to interact with the AI task manager...</div>
        </div>
        
        <div class="cta">
            <a href="/chat" class="btn" id="chatButton">Start Chatting with AI</a>
        </div>
    </div>
    
    <script>
        const demoInput = document.getElementById('demoInput');
        const demoResponse = document.getElementById('demoResponse');
        const chatButton = document.getElementById('chatButton');
        
        // Update chat button to include demo input text
        chatButton.addEventListener('click', (e) => {
            const message = demoInput.value.trim();
            if (message) {
                e.preventDefault();
                window.location.href = '/chat?message=' + encodeURIComponent(message);
            }
        });
        
        demoInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const message = demoInput.value.trim();
                if (!message) return;
                
                demoResponse.textContent = 'Thinking...';
                demoInput.value = '';
                
                try {
                    const response = await fetch('/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ message })
                    });
                    
                    const data = await response.json();
                    demoResponse.textContent = data.response;
                } catch (error) {
                    demoResponse.textContent = 'Error: ' + error.message;
                }
            }
        });
    </script>
</body>
</html>`;
}

/**
 * Chat page HTML
 */
function getChatPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Task Manager - Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .chat-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 800px;
            height: 600px;
            display: flex;
            flex-direction: column;
        }
        
        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 20px 20px 0 0;
            text-align: center;
        }
        
        .chat-header h1 {
            font-size: 1.8em;
            margin-bottom: 5px;
        }
        
        .chat-header p {
            opacity: 0.9;
            font-size: 0.9em;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .message {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 15px;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        
        .message.user {
            background: #667eea;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 5px;
        }
        
        .message.assistant {
            background: #f0f0f0;
            color: #333;
            align-self: flex-start;
            border-bottom-left-radius: 5px;
        }
        
        .message.system {
            background: #e3f2fd;
            color: #1976d2;
            align-self: center;
            font-size: 0.9em;
            font-style: italic;
        }
        
        .chat-input-container {
            padding: 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
        }
        
        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 1em;
            outline: none;
            transition: border-color 0.3s;
        }
        
        .chat-input:focus {
            border-color: #667eea;
        }
        
        .send-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 1em;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .send-button:hover {
            transform: translateY(-2px);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .back-link {
            position: fixed;
            top: 20px;
            left: 20px;
            background: white;
            color: #667eea;
            padding: 10px 20px;
            border-radius: 20px;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .back-link:hover {
            transform: translateY(-2px);
        }
        
        .examples {
            display: flex;
            gap: 10px;
            padding: 10px 20px;
            overflow-x: auto;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .example-chip {
            background: #f0f0f0;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85em;
            white-space: nowrap;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .example-chip:hover {
            background: #e0e0e0;
        }
    </style>
</head>
<body>
    <a href="/" class="back-link">← Back to Home</a>
    
    <div class="chat-container">
        <div class="chat-header">
            <h1>🤖 AI Task Manager</h1>
            <p>Chat with your intelligent task assistant</p>
        </div>
        
        <div class="examples">
            <div class="example-chip" onclick="sendExample('Create a task to buy groceries tomorrow')">📝 Create task</div>
            <div class="example-chip" onclick="sendExample('Show my pending tasks')">📋 List tasks</div>
            <div class="example-chip" onclick="sendExample('Analyze my productivity')">📊 Analyze</div>
            <div class="example-chip" onclick="sendExample('Schedule my tasks')">📅 Schedule</div>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="message system">👋 Hello! I'm your AI task assistant. Try creating a task or asking me to show your tasks!</div>
        </div>
        
        <div class="chat-input-container">
            <input 
                type="text" 
                class="chat-input" 
                id="chatInput" 
                placeholder="Type your message... (e.g., 'Create a task to call mom')"
                autofocus
            >
            <button class="send-button" id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        
        function addMessage(content, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.textContent = content;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            
            // Add user message
            addMessage(message, 'user');
            chatInput.value = '';
            sendButton.disabled = true;
            
            // Add thinking indicator
            addMessage('Thinking...', 'system');
            
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message })
                });
                
                // Remove thinking indicator
                chatMessages.removeChild(chatMessages.lastChild);
                
                const data = await response.json();
                addMessage(data.response, 'assistant');
            } catch (error) {
                // Remove thinking indicator
                chatMessages.removeChild(chatMessages.lastChild);
                addMessage('Error: ' + error.message, 'system');
            } finally {
                sendButton.disabled = false;
                chatInput.focus();
            }
        }
        
        function sendExample(text) {
            chatInput.value = text;
            sendMessage();
        }
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Check for message in URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const initialMessage = urlParams.get('message');
        if (initialMessage) {
            chatInput.value = initialMessage;
            // Auto-send the message after a brief delay
            setTimeout(() => sendMessage(), 500);
        }
    </script>
</body>
</html>`;
}

/**
 * Handle Workflows API endpoints
 */
async function handleWorkflowsAPI(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Create workflow instance
    const workflow = new TaskWorkflow(null, env);

    // Trigger daily reminder
    if (path === "/workflows/daily-reminder" && request.method === "POST") {
      const result = await workflow.run({ type: "daily_reminder" }, env);
      return Response.json({ message: "Daily reminder workflow executed", result });
    }

    // Trigger productivity report
    if (path === "/workflows/productivity-report" && request.method === "POST") {
      const result = await workflow.run({ type: "productivity_report" }, env);
      return Response.json({ message: "Productivity report workflow executed", result });
    }

    // Auto-schedule tasks
    if (path === "/workflows/auto-schedule" && request.method === "POST") {
      const result = await workflow.run({ type: "auto_schedule" }, env);
      return Response.json({ message: "Auto-schedule workflow executed", result });
    }

    // Priority review
    if (path === "/workflows/priority-review" && request.method === "POST") {
      const result = await workflow.run({ type: "priority_review" }, env);
      return Response.json({ message: "Priority review workflow executed", result });
    }

    // List available workflows - serve HTML page
    if (path === "/workflows" && request.method === "GET") {
      return new Response(getWorkflowsPage(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    return Response.json({ error: "Workflow not found" }, { status: 404 });
  } catch (error) {
    console.error("Error handling workflows API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Handle voice input
 */
async function handleVoiceInput(request, env) {
  try {
    const { audio, format = "webm" } = await request.json();
    
    if (!audio) {
      return Response.json({ error: "Audio data is required" }, { status: 400 });
    }

    // Simulate speech-to-text (in production, you'd use Deepgram or similar)
    // For now, return a simulated transcription
    const simulatedTranscription = "Create a task to test voice input";
    
    // Process the transcribed message through the chat endpoint
    const agentId = env.TASK_AGENT.idFromName("main-agent");
    const agent = env.TASK_AGENT.get(agentId);
    
    const resp = await agent.fetch("https://durable-object/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: simulatedTranscription, context: { voice: true } })
    });
    
    const data = await resp.json();
    
    return Response.json({
      transcription: simulatedTranscription,
      response: data.response,
      audio_url: null, // In production, generate TTS audio here
      message: "Voice input processed (simulation mode - integrate Deepgram for real STT)"
    });
  } catch (error) {
    console.error("Error handling voice input:", error);
    return Response.json({ error: "Failed to process voice input" }, { status: 500 });
  }
}

/**
 * Workflows page HTML
 */
function getWorkflowsPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Task Manager - Workflows</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .workflows-container {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            background: white;
            color: #667eea;
            padding: 10px 20px;
            border-radius: 20px;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .workflows-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .workflow-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .workflow-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }
        
        .workflow-icon {
            font-size: 3em;
            margin-bottom: 15px;
        }
        
        .workflow-name {
            color: #333;
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: capitalize;
        }
        
        .workflow-description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .workflow-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            width: 100%;
            font-size: 1em;
            transition: transform 0.2s;
        }
        
        .workflow-button:hover {
            transform: scale(1.05);
        }
        
        .workflow-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .status-message {
            margin-top: 15px;
            padding: 10px;
            border-radius: 10px;
            text-align: center;
            display: none;
        }
        
        .status-message.show {
            display: block;
        }
        
        .status-message.success {
            background: #d4edda;
            color: #155724;
        }
        
        .status-message.error {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-message.loading {
            background: #d1ecf1;
            color: #0c5460;
        }
    </style>
</head>
<body>
    <div class="workflows-container">
        <a href="/" class="back-link">← Back to Home</a>
        
        <div class="header">
            <h1>🔄 Automated Workflows</h1>
            <p>Trigger automated task management workflows</p>
        </div>
        
        <div class="workflows-grid">
            <div class="workflow-card">
                <div class="workflow-icon">🌅</div>
                <div class="workflow-name">Daily Reminder</div>
                <div class="workflow-description">Get a summary of your tasks for today with priority breakdown</div>
                <button class="workflow-button" onclick="triggerWorkflow('daily-reminder', this)">
                    Run Daily Reminder
                </button>
                <div class="status-message" id="status-daily-reminder"></div>
            </div>
            
            <div class="workflow-card">
                <div class="workflow-icon">📊</div>
                <div class="workflow-name">Productivity Report</div>
                <div class="workflow-description">Generate a weekly productivity report with insights and recommendations</div>
                <button class="workflow-button" onclick="triggerWorkflow('productivity-report', this)">
                    Generate Report
                </button>
                <div class="status-message" id="status-productivity-report"></div>
            </div>
            
            <div class="workflow-card">
                <div class="workflow-icon">📅</div>
                <div class="workflow-name">Auto Schedule</div>
                <div class="workflow-description">Automatically schedule your pending tasks based on priority and deadlines</div>
                <button class="workflow-button" onclick="triggerWorkflow('auto-schedule', this)">
                    Auto Schedule Tasks
                </button>
                <div class="status-message" id="status-auto-schedule"></div>
            </div>
            
            <div class="workflow-card">
                <div class="workflow-icon">🔍</div>
                <div class="workflow-name">Priority Review</div>
                <div class="workflow-description">Review tasks and get suggestions for priority adjustments</div>
                <button class="workflow-button" onclick="triggerWorkflow('priority-review', this)">
                    Review Priorities
                </button>
                <div class="status-message" id="status-priority-review"></div>
            </div>
        </div>
    </div>
    
    <script>
        async function triggerWorkflow(workflowName, button) {
            const statusEl = document.getElementById('status-' + workflowName);
            
            // Show loading state
            button.disabled = true;
            statusEl.className = 'status-message show loading';
            statusEl.textContent = '⏳ Running workflow...';
            
            try {
                const response = await fetch('/workflows/' + workflowName, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    statusEl.className = 'status-message show success';
                    statusEl.textContent = '✅ ' + data.message;
                } else {
                    statusEl.className = 'status-message show error';
                    statusEl.textContent = '❌ ' + (data.error || 'Workflow failed');
                }
            } catch (error) {
                statusEl.className = 'status-message show error';
                statusEl.textContent = '❌ Error: ' + error.message;
            } finally {
                button.disabled = false;
                
                // Auto-hide success message after 5 seconds
                setTimeout(() => {
                    if (statusEl.classList.contains('success')) {
                        statusEl.classList.remove('show');
                    }
                }, 5000);
            }
        }
    </script>
</body>
</html>`;
}

/**
 * Voice page HTML
 */
function getVoicePage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Task Manager - Voice Control</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .voice-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        
        .voice-header h1 {
            color: #333;
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .voice-header p {
            color: #666;
            margin-bottom: 30px;
        }
        
        .record-button {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            font-size: 3em;
            cursor: pointer;
            transition: transform 0.2s;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            margin: 20px auto;
        }
        
        .record-button:hover {
            transform: scale(1.05);
        }
        
        .record-button:active {
            transform: scale(0.95);
        }
        
        .record-button.recording {
            animation: pulse 1.5s infinite;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .status {
            margin: 20px 0;
            padding: 15px;
            border-radius: 10px;
            background: #f0f0f0;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .response-box {
            margin-top: 20px;
            padding: 20px;
            border-radius: 10px;
            background: #e3f2fd;
            text-align: left;
            display: none;
        }
        
        .response-box.show {
            display: block;
        }
        
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #667eea;
            text-decoration: none;
        }
        
        .info-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            text-align: left;
        }
        
        .info-box strong {
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="voice-container">
        <div class="voice-header">
            <h1>🎤 Voice Control</h1>
            <p>Speak to manage your tasks hands-free</p>
        </div>
        
        <div class="info-box">
            <strong>⚠️ Demo Mode:</strong> Voice recognition is simulated. To enable real voice input, integrate <a href="https://deepgram.com" target="_blank">Deepgram</a> or similar STT service.
        </div>
        
        <button class="record-button" id="recordButton" onclick="toggleRecording()">🎤</button>
        
        <div class="status" id="status">
            Tap the microphone to start
        </div>
        
        <div class="response-box" id="responseBox">
            <strong>Transcription:</strong> <span id="transcription"></span><br><br>
            <strong>Response:</strong> <span id="response"></span>
        </div>
        
        <a href="/" class="back-link">← Back to Home</a>
    </div>
    
    <script>
        let isRecording = false;
        let mediaRecorder;
        let audioChunks = [];
        
        const recordButton = document.getElementById('recordButton');
        const status = document.getElementById('status');
        const responseBox = document.getElementById('responseBox');
        const transcription = document.getElementById('transcription');
        const response = document.getElementById('response');
        
        async function toggleRecording() {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        }
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    await processAudio(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                isRecording = true;
                recordButton.classList.add('recording');
                recordButton.textContent = '⏹️';
                status.textContent = '🔴 Recording... Speak now!';
            } catch (error) {
                status.textContent = '❌ Microphone access denied';
                console.error('Error accessing microphone:', error);
            }
        }
        
        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.textContent = '🎤';
                status.textContent = '⏳ Processing...';
            }
        }
        
        async function processAudio(audioBlob) {
            try {
                // Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(',')[1];
                    
                    const result = await fetch('/voice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audio: base64Audio, format: 'webm' })
                    });
                    
                    const data = await result.json();
                    
                    transcription.textContent = data.transcription;
                    response.textContent = data.response;
                    responseBox.classList.add('show');
                    status.textContent = '✅ Processing complete!';
                    
                    if (data.audio_url) {
                        const audio = new Audio(data.audio_url);
                        audio.play();
                    }
                };
            } catch (error) {
                status.textContent = '❌ Error processing audio';
                console.error('Error:', error);
            }
        }
    </script>
</body>
</html>`;
}

// Re-export Durable Object class for Wrangler to bind
export { TaskAgent } from "./agent.js";
