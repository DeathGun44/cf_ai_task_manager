# AI Task Manager - Usage Examples

## 🤖 Chat Commands

### Task Creation
```
Create a task to buy groceries tomorrow
Add a high priority task to finish the project proposal by Friday
Create a task called "Review code" with medium priority
```

### Task Management
```
Show me my pending tasks
List all high priority tasks
What tasks are due today?
Mark task 1 as completed
Update task 2 to high priority
Delete task 3
```

### Scheduling & Planning
```
Schedule my tasks for today
What should I work on next?
Give me task suggestions for this week
Show me my productivity analysis
Generate a weekly report
```

### General Queries
```
How am I doing with my tasks?
What's my completion rate?
Help me prioritize my work
What tasks are overdue?
```

## 🎯 Expected AI Responses

### Task Creation Response
```
✅ Task created successfully!

**Task #1**
📝 Title: Buy groceries
📄 Description: 
⚡ Priority: medium
📅 Due: tomorrow
🏷️ Tags: 

Your task has been added to your task list. You can ask me to show your tasks anytime!
```

### Task List Response
```
📋 **Your Tasks** (3)

1. ⏳ **Buy groceries**
   🟡 Priority: medium
   🏷️ Status: pending
   📅 Due: 2024-12-06
   🆔 ID: 1

2. ✅ **Finish project proposal**
   🔴 Priority: high
   🏷️ Status: completed
   📅 Due: 2024-12-05
   🆔 ID: 2

3. ⏳ **Review code**
   🟡 Priority: medium
   🏷️ Status: pending
   🆔 ID: 3
```

### Scheduling Response
```
📅 **Your Recommended Schedule**

1. 🔴 **Finish project proposal**
   📅 Due: today
   ⚡ Priority: high

2. 🟡 **Buy groceries**
   📅 Due: tomorrow
   ⚡ Priority: medium

3. 🟡 **Review code**
   ⚡ Priority: medium

💡 **Tip**: Focus on high-priority tasks first, especially those with upcoming deadlines!
```

## 🔄 Workflow Examples

### Daily Reminder
```
🌅 **Good morning! Here's your daily task overview:**

🔴 **High Priority Tasks:**
• Finish project proposal

🟡 **Medium Priority Tasks:**
• Buy groceries
• Review code

💡 **Tip:** Focus on high-priority tasks first, especially those with deadlines today!
```

### Productivity Report
```
📊 **Weekly Productivity Report**

📈 **Overall Performance**
• Total Tasks: 15
• Completed: 12 (80%)
• Completion Rate: 🎉 Excellent!

⚡ **Priority Breakdown**
• High Priority Completed: 5
• Medium Priority Completed: 4
• Low Priority Completed: 3

🧠 **AI Insights**
• You're excellent at completing high-priority tasks
• Consider breaking down large tasks into smaller ones
• Your productivity peaks in the morning hours

🎯 **Recommendations**
• Outstanding performance! Keep up the great work!
• Consider taking on more challenging tasks
```

## 🎤 Voice Commands

### Supported Voice Inputs
- "Create a task to call mom"
- "Show me my pending tasks"
- "Mark task one as complete"
- "What should I work on today?"

### Voice Response
The AI will process your voice input and respond with both text and (if configured) voice output.

## 📱 Mobile Usage

The interface is fully responsive and works great on mobile devices:

- Swipe-friendly chat interface
- Voice input button for hands-free operation
- Quick action buttons for common tasks
- Touch-optimized controls

## 🔗 API Examples

### Create Task via API
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries",
    "description": "Get milk, bread, and eggs",
    "priority": "medium",
    "due_date": "2024-12-06",
    "tags": "shopping, essentials"
  }'
```

### Chat via API
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a task to review the quarterly report",
    "context": {}
  }'
```

### WebSocket Connection
```javascript
const ws = new WebSocket('wss://your-worker.your-subdomain.workers.dev/durable-object');

ws.onopen = function() {
  console.log('Connected to AI agent');
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('AI Response:', data.message);
};

// Send a message
ws.send(JSON.stringify({
  message: "What tasks do I have today?",
  context: {}
}));
```

## 🎯 Best Practices

### Effective Task Creation
- Be specific with task titles
- Include relevant details in descriptions
- Set realistic due dates
- Use appropriate priority levels
- Add helpful tags for organization

### Productivity Tips
- Review your tasks daily
- Use the scheduling feature to plan your day
- Take advantage of AI suggestions
- Complete high-priority tasks first
- Use voice input for quick task creation

### Maintenance
- Regularly review and update task priorities
- Clean up completed tasks periodically
- Use productivity reports to track progress
- Leverage AI insights for improvement
