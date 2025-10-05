# Getting Started with cf_ai_task_manager

**⚡ The fastest way to experience AI-powered task management on Cloudflare's platform!**

## 🚀 Try It Now (Zero Setup)

### Live Demo
Visit: **https://cf-ai-task-manager.krishnamewara841.workers.dev**

No installation required! Try all features immediately:

1. **Chat with AI** → https://cf-ai-task-manager.krishnamewara841.workers.dev/chat
2. **Voice Control** → https://cf-ai-task-manager.krishnamewara841.workers.dev/voice  
3. **Workflows** → https://cf-ai-task-manager.krishnamewara841.workers.dev/workflows

## 💬 Quick Examples

### Via Web UI
1. Go to the chat page
2. Type one of these:
   - `Create a task to review the deployment docs`
   - `Show my pending tasks`
   - `Analyze my productivity`
   - `Schedule my tasks`

### Via API
```bash
curl -X POST https://cf-ai-task-manager.krishnamewara841.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a task to buy groceries tomorrow"}'
```

## 🎤 Voice Control

1. Visit `/voice`
2. Click the large microphone button
3. Allow microphone access when prompted
4. Speak naturally: *"Create a task to call mom tomorrow"*
5. Watch AI process your voice command!

## 🔄 Automated Workflows

Visit `/workflows` and click any workflow button:

- **🌅 Daily Reminder** - Get today's task summary
- **📊 Productivity Report** - Weekly productivity insights
- **📅 Auto Schedule** - Organize tasks by priority
- **🔍 Priority Review** - Get priority suggestions

## 🛠️ Run Locally (5 Minutes)

### Prerequisites
- Node.js 18+
- Cloudflare account (free)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/cf_ai_task_manager.git
cd cf_ai_task_manager

# 2. Install dependencies
npm install

# 3. Login to Cloudflare
npx wrangler login

# 4. Create services
npx wrangler vectorize create task-memory-index --dimensions=1024 --metric=cosine
npx wrangler kv namespace create TASK_STORE

# 5. Update wrangler.toml with the KV ID returned above

# 6. Run locally
npm run dev

# 7. Visit http://localhost:8787
```

## 🚢 Deploy Your Own (3 Minutes)

```bash
# After completing local setup above:

# 1. Deploy to Cloudflare
npm run deploy

# 2. Your app will be live at:
# https://cf-ai-task-manager.YOUR_SUBDOMAIN.workers.dev
```

## 📚 What You Can Do

### Task Management
- ✅ Create tasks with natural language
- ✅ List tasks (all, pending, completed)
- ✅ Update task priority and status
- ✅ Complete tasks
- ✅ Delete tasks
- ✅ Get task suggestions

### Smart Features
- 🧠 AI understands context and intent
- 🔍 Semantic task search
- 📊 Productivity analytics
- 📅 Automated scheduling
- 🎤 Voice commands
- 💬 Natural conversation

### Example Commands

```
✨ Creating Tasks:
"Create a task to finish the report by Friday"
"Add a high priority task to call the client"
"Remind me to buy milk tomorrow"

📋 Viewing Tasks:
"Show my pending tasks"
"List all high priority tasks"
"What's on my plate today?"

✅ Completing Tasks:
"Mark task 1 as done"
"Complete the grocery shopping task"
"I finished task 3"

📊 Analytics:
"Analyze my productivity"
"How am I doing?"
"Show me my stats"

📅 Scheduling:
"Schedule my tasks"
"What should I work on first?"
"Prioritize my work"
```

## 🏗️ Architecture Overview

```
User → Cloudflare Worker → Durable Object → Workers AI (Llama 3.3)
                         ↓
                    Vectorize (Semantic Search)
                         ↓
                    Workers KV (Storage)
```

## 📖 Documentation

- **[README.md](./README.md)** - Full project documentation
- **[PROMPTS.md](./PROMPTS.md)** - All AI prompts used
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment guide
- **[SUBMISSION.md](./SUBMISSION.md)** - Challenge submission details

## 🆘 Quick Troubleshooting

### "AI binding not found"
→ Ensure Workers AI is enabled in your Cloudflare account

### "Vectorize index not found"
→ Run: `npx wrangler vectorize create task-memory-index --dimensions=1024 --metric=cosine`

### "KV namespace not found"
→ Create KV and update the ID in `wrangler.toml`

### Can't access microphone in voice mode
→ Make sure you're on HTTPS (deployed) or localhost, not HTTP

## 💡 Tips

1. **Start Simple**: Try the chat interface first
2. **Use Natural Language**: No need for specific commands
3. **Explore Workflows**: Automate your task management
4. **Try Voice**: Experience hands-free control
5. **Check Docs**: Comprehensive guides available

## 🎯 Next Steps

After trying the demo:

1. ⭐ Star the repository
2. 📖 Read the full [README.md](./README.md)
3. 🚀 Deploy your own instance
4. 🔧 Customize to your needs
5. 🤝 Contribute improvements

## 🌟 Features Powered by Cloudflare

- **Workers AI** - Llama 3.3 70B for intelligence
- **Durable Objects** - Persistent state with SQLite
- **Vectorize** - Semantic search (1024 dimensions)
- **Workers KV** - Fast key-value storage
- **Edge Network** - 300+ global locations
- **Zero Cold Starts** - Instant response times

## 📞 Need Help?

- 📖 Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guides
- 🐛 Open a GitHub issue for bugs
- 💬 Questions? Reach out via GitHub discussions

---

**Ready to experience AI-powered task management?**

👉 **[Try the Live Demo Now](https://cf-ai-task-manager.krishnamewara841.workers.dev)** 👈

---

*Built with ❤️ on Cloudflare's Developer Platform*

