/**
 * Cloudflare Workflows for AI Task Manager
 * Handles automated task scheduling, reminders, and productivity workflows
 */

export class TaskWorkflow {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const { event } = await request.json();
    return await this.run(event, this.env);
  }

  async run(event, env) {
    console.log("Starting task workflow:", event.type);
    
    switch (event.type) {
      case "daily_reminder":
        await this.sendDailyReminder(env);
        break;
      
      case "task_reminder":
        await this.sendTaskReminder(event.taskId, env);
        break;
      
      case "productivity_report":
        await this.generateProductivityReport(env);
        break;
      
      case "auto_schedule":
        await this.autoScheduleTasks(env);
        break;
      
      case "priority_review":
        await this.reviewTaskPriorities(env);
        break;
      
      default:
        console.log("Unknown workflow type:", event.type);
    }
  }

  /**
   * Send daily reminder with task overview
   */
  async sendDailyReminder(env) {
    try {
      // Get agent instance
      const agentId = env.TASK_AGENT.idFromName("main-agent");
      const agent = env.TASK_AGENT.get(agentId);
      
      // Get today's tasks
      const today = new Date().toISOString().split('T')[0];
      const tasks = await agent.sql`
        SELECT * FROM tasks 
        WHERE DATE(due_date) = ${today} OR status = 'pending'
        ORDER BY priority DESC, due_date ASC
        LIMIT 10
      `;
      
      if (tasks.length === 0) {
        console.log("No tasks for today");
        return;
      }
      
      let reminderMessage = `🌅 **Good morning! Here's your daily task overview:**\n\n`;
      
      const highPriorityTasks = tasks.filter(t => t.priority === 'high');
      const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium');
      const lowPriorityTasks = tasks.filter(t => t.priority === 'low');
      
      if (highPriorityTasks.length > 0) {
        reminderMessage += `🔴 **High Priority Tasks:**\n`;
        highPriorityTasks.forEach(task => {
          reminderMessage += `• ${task.title}\n`;
        });
        reminderMessage += `\n`;
      }
      
      if (mediumPriorityTasks.length > 0) {
        reminderMessage += `🟡 **Medium Priority Tasks:**\n`;
        mediumPriorityTasks.forEach(task => {
          reminderMessage += `• ${task.title}\n`;
        });
        reminderMessage += `\n`;
      }
      
      if (lowPriorityTasks.length > 0) {
        reminderMessage += `🟢 **Low Priority Tasks:**\n`;
        lowPriorityTasks.forEach(task => {
          reminderMessage += `• ${task.title}\n`;
        });
        reminderMessage += `\n`;
      }
      
      reminderMessage += `💡 **Tip:** Focus on high-priority tasks first, especially those with deadlines today!`;
      
      // Store the reminder in the conversation history
      await agent.sql`
        INSERT INTO conversations (user_message, agent_response, context)
        VALUES ('Daily reminder', ${reminderMessage}, ${JSON.stringify({ type: 'daily_reminder', timestamp: new Date().toISOString() })})
      `;
      
      console.log("Daily reminder sent successfully");
    } catch (error) {
      console.error("Error sending daily reminder:", error);
    }
  }

  /**
   * Send reminder for specific task
   */
  async sendTaskReminder(taskId, env) {
    try {
      const agentId = env.TASK_AGENT.idFromName("main-agent");
      const agent = env.TASK_AGENT.get(agentId);
      
      const tasks = await agent.sql`
        SELECT * FROM tasks WHERE id = ${taskId}
      `;
      
      if (tasks.length === 0) {
        console.log("Task not found:", taskId);
        return;
      }
      
      const task = tasks[0];
      const reminderMessage = `⏰ **Task Reminder**\n\n**${task.title}**\n${task.description ? task.description + '\n' : ''}Priority: ${task.priority}\nDue: ${task.due_date}\n\nDon't forget to work on this task!`;
      
      await agent.sql`
        INSERT INTO conversations (user_message, agent_response, context)
        VALUES ('Task reminder', ${reminderMessage}, ${JSON.stringify({ type: 'task_reminder', taskId, timestamp: new Date().toISOString() })})
      `;
      
      console.log("Task reminder sent for task:", taskId);
    } catch (error) {
      console.error("Error sending task reminder:", error);
    }
  }

  /**
   * Generate weekly productivity report
   */
  async generateProductivityReport(env) {
    try {
      const agentId = env.TASK_AGENT.idFromName("main-agent");
      const agent = env.TASK_AGENT.get(agentId);
      
      // Get tasks from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const tasks = await agent.sql`
        SELECT * FROM tasks 
        WHERE created_at >= ${sevenDaysAgo.toISOString()}
        OR updated_at >= ${sevenDaysAgo.toISOString()}
      `;
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const highPriorityCompleted = tasks.filter(t => t.priority === 'high' && t.status === 'completed').length;
      const mediumPriorityCompleted = tasks.filter(t => t.priority === 'medium' && t.status === 'completed').length;
      const lowPriorityCompleted = tasks.filter(t => t.priority === 'low' && t.status === 'completed').length;
      
      let report = `📊 **Weekly Productivity Report**\n\n`;
      report += `📈 **Overall Performance**\n`;
      report += `• Total Tasks: ${totalTasks}\n`;
      report += `• Completed: ${completedTasks} (${completionRate}%)\n`;
      report += `• Completion Rate: ${completionRate >= 80 ? '🎉 Excellent!' : completionRate >= 60 ? '👍 Good!' : '💪 Keep improving!'}\n\n`;
      
      report += `⚡ **Priority Breakdown**\n`;
      report += `• High Priority Completed: ${highPriorityCompleted}\n`;
      report += `• Medium Priority Completed: ${mediumPriorityCompleted}\n`;
      report += `• Low Priority Completed: ${lowPriorityCompleted}\n\n`;
      
      // Get AI insights
      const insights = await this.getProductivityInsights(tasks, env);
      report += `🧠 **AI Insights**\n${insights}\n\n`;
      
      report += `🎯 **Recommendations**\n`;
      if (completionRate < 60) {
        report += `• Try breaking down large tasks into smaller ones\n`;
        report += `• Set more realistic deadlines\n`;
        report += `• Focus on one task at a time\n`;
      } else if (completionRate < 80) {
        report += `• Great progress! Consider optimizing your workflow\n`;
        report += `• Try time-blocking techniques\n`;
      } else {
        report += `• Outstanding performance! Keep up the great work!\n`;
        report += `• Consider taking on more challenging tasks\n`;
      }
      
      await agent.sql`
        INSERT INTO conversations (user_message, agent_response, context)
        VALUES ('Weekly report', ${report}, ${JSON.stringify({ type: 'productivity_report', timestamp: new Date().toISOString() })})
      `;
      
      console.log("Productivity report generated successfully");
    } catch (error) {
      console.error("Error generating productivity report:", error);
    }
  }

  /**
   * Auto-schedule tasks based on priority and deadlines
   */
  async autoScheduleTasks(env) {
    try {
      const agentId = env.TASK_AGENT.idFromName("main-agent");
      const agent = env.TASK_AGENT.get(agentId);
      
      // Get unscheduled tasks
      const unscheduledTasks = await agent.sql`
        SELECT * FROM tasks 
        WHERE status = 'pending' 
        AND (due_date IS NULL OR due_date > datetime('now'))
        ORDER BY priority DESC, created_at ASC
      `;
      
      if (unscheduledTasks.length === 0) {
        console.log("No tasks to auto-schedule");
        return;
      }
      
      let scheduleMessage = `🤖 **Auto-Scheduling Suggestions**\n\n`;
      scheduleMessage += `I've analyzed your pending tasks and here are my recommendations:\n\n`;
      
      unscheduledTasks.forEach((task, index) => {
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        scheduleMessage += `${index + 1}. ${priorityEmoji} **${task.title}**\n`;
        if (task.description) {
          scheduleMessage += `   📄 ${task.description}\n`;
        }
        scheduleMessage += `   ⚡ Priority: ${task.priority}\n`;
        
        // Suggest optimal scheduling
        if (task.priority === 'high') {
          scheduleMessage += `   💡 **Recommendation:** Schedule for today or tomorrow\n`;
        } else if (task.priority === 'medium') {
          scheduleMessage += `   💡 **Recommendation:** Schedule within 3 days\n`;
        } else {
          scheduleMessage += `   💡 **Recommendation:** Schedule when you have free time\n`;
        }
        scheduleMessage += `\n`;
      });
      
      scheduleMessage += `🎯 **Scheduling Tips:**\n`;
      scheduleMessage += `• Block 2-3 hours for high-priority tasks\n`;
      scheduleMessage += `• Use time-blocking techniques\n`;
      scheduleMessage += `• Leave buffer time between tasks\n`;
      scheduleMessage += `• Schedule breaks every 90 minutes\n`;
      
      await agent.sql`
        INSERT INTO conversations (user_message, agent_response, context)
        VALUES ('Auto-scheduling', ${scheduleMessage}, ${JSON.stringify({ type: 'auto_schedule', timestamp: new Date().toISOString() })})
      `;
      
      console.log("Auto-scheduling completed successfully");
    } catch (error) {
      console.error("Error in auto-scheduling:", error);
    }
  }

  /**
   * Review and suggest priority adjustments
   */
  async reviewTaskPriorities(env) {
    try {
      const agentId = env.TASK_AGENT.idFromName("main-agent");
      const agent = env.TASK_AGENT.get(agentId);
      
      // Get tasks that might need priority review
      const tasksToReview = await agent.sql`
        SELECT * FROM tasks 
        WHERE status = 'pending' 
        AND created_at < datetime('now', '-3 days')
        ORDER BY priority, created_at ASC
      `;
      
      if (tasksToReview.length === 0) {
        console.log("No tasks need priority review");
        return;
      }
      
      let reviewMessage = `🔍 **Priority Review Suggestions**\n\n`;
      reviewMessage += `I've identified some tasks that might need priority adjustments:\n\n`;
      
      tasksToReview.forEach((task, index) => {
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        reviewMessage += `${index + 1}. ${priorityEmoji} **${task.title}**\n`;
        reviewMessage += `   📅 Created: ${new Date(task.created_at).toLocaleDateString()}\n`;
        reviewMessage += `   ⚡ Current Priority: ${task.priority}\n`;
        
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const today = new Date();
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue < 0) {
            reviewMessage += `   ⚠️ **OVERDUE** - Consider increasing priority\n`;
          } else if (daysUntilDue <= 1) {
            reviewMessage += `   🔥 Due tomorrow - Consider high priority\n`;
          } else if (daysUntilDue <= 3) {
            reviewMessage += `   ⏰ Due soon - Consider medium priority\n`;
          }
        } else {
          reviewMessage += `   💡 **Suggestion:** Set a due date for better planning\n`;
        }
        reviewMessage += `\n`;
      });
      
      reviewMessage += `🎯 **Priority Guidelines:**\n`;
      reviewMessage += `• High: Urgent and important, needs immediate attention\n`;
      reviewMessage += `• Medium: Important but not urgent, can be scheduled\n`;
      reviewMessage += `• Low: Nice to have, can be done when time permits\n`;
      
      await agent.sql`
        INSERT INTO conversations (user_message, agent_response, context)
        VALUES ('Priority review', ${reviewMessage}, ${JSON.stringify({ type: 'priority_review', timestamp: new Date().toISOString() })})
      `;
      
      console.log("Priority review completed successfully");
    } catch (error) {
      console.error("Error in priority review:", error);
    }
  }

  /**
   * Get AI-powered productivity insights
   */
  async getProductivityInsights(tasks, env) {
    try {
      const prompt = `Analyze the following task data and provide 2-3 actionable productivity insights:

Tasks: ${JSON.stringify(tasks.slice(0, 10))} // Limit to first 10 tasks for context

Provide insights about:
1. Task completion patterns
2. Priority distribution effectiveness
3. Time management suggestions

Keep it concise and actionable.`;

      const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.response;
    } catch (error) {
      console.error("Error getting AI insights:", error);
      return "• Focus on completing high-priority tasks first\n• Consider time-blocking for better focus\n• Regular breaks improve productivity";
    }
  }
}

