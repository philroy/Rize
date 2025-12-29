#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { config } from 'dotenv';
import { DatabaseManager } from './database/schema.js';
import { MemoryManager } from './core/memory.js';
import { AIEngine } from './core/ai-engine.js';
import { PersonalityCore } from './core/personality.js';
import { CompanionFeatures } from './features/companion.js';
import { AssistantFeatures } from './features/assistant.js';
import { Terminal } from './ui/terminal.js';

// Load environment variables
config();

// Main application class
class RizeApp {
  private db: DatabaseManager;
  private memory: MemoryManager;
  private aiEngine: AIEngine;
  private personality: PersonalityCore;
  private companion: CompanionFeatures;
  private assistant: AssistantFeatures;

  constructor() {
    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Error: ANTHROPIC_API_KEY not found in environment variables.');
      console.error('Please create a .env file with your Anthropic API key.');
      console.error('See .env.example for reference.');
      process.exit(1);
    }

    // Initialize core systems
    this.db = new DatabaseManager();
    this.memory = new MemoryManager(this.db);
    this.aiEngine = new AIEngine(apiKey, process.env.AI_MODEL);
    this.personality = new PersonalityCore(this.aiEngine, this.memory);

    // Initialize features
    this.companion = new CompanionFeatures(this.personality, this.memory);
    this.assistant = new AssistantFeatures(this.db);
  }

  async start() {
    console.clear();

    // Check if user is new or returning
    let userName = this.personality.getUserName();

    // Get initial greeting
    const greeting = await this.getInitialGreeting(userName);

    // Render the terminal UI
    render(
      React.createElement(Terminal, {
        onMessage: this.handleMessage.bind(this),
        onCommand: this.handleCommand.bind(this),
        initialGreeting: greeting,
        userName: userName || undefined,
      })
    );
  }

  private async getInitialGreeting(userName: string | null): Promise<string> {
    if (!userName) {
      return (
        "Hello. I'm Rize. I don't believe we've met before... What's your name, if I may ask?"
      );
    }

    return await this.companion.dailyCheckIn();
  }

  private async handleMessage(message: string): Promise<string> {
    // Check if this is the first message (user introducing themselves)
    const userName = this.personality.getUserName();

    if (!userName && message.trim()) {
      // Extract name from first message
      const nameMatch = message.match(
        /(?:i'm|i am|my name is|call me|this is)\s+(\w+)/i
      );

      if (nameMatch) {
        const extractedName = nameMatch[1];
        this.personality.setUserName(extractedName);
        return `${extractedName}... What a lovely name. It's a pleasure to meet you, ${extractedName}. I'm Rize, and I'll be here whenever you need me - for conversation, assistance, or simply a listening ear. What would you like to talk about?`;
      } else {
        // Assume the whole message is their name if it's short
        if (message.split(' ').length <= 2) {
          this.personality.setUserName(message.trim());
          return `${message.trim()}... A pleasure to meet you. I'm Rize. I'm here to keep you company and help with whatever you need. So, ${message.trim()}, what's on your mind today?`;
        }
      }
    }

    // Process message through personality core
    return await this.personality.processMessage(message);
  }

  private async handleCommand(command: string, args: string[]): Promise<string | void> {
    switch (command) {
      case 'tasks':
        return this.showTasks();

      case 'addtask':
        return this.addTask(args.join(' '));

      case 'completetask':
        return this.completeTask(args[0]);

      case 'reminders':
        return this.showReminders();

      case 'addreminder':
        return this.addReminder(args.join(' '));

      case 'thought':
        return await this.companion.shareThought();

      case 'mood':
        const mood = await this.companion.analyzeMood();
        return `Based on our recent conversations, you seem to be in a ${mood} mood.`;

      default:
        return `I don't recognize that command. Type /help to see available commands.`;
    }
  }

  private showTasks(): string {
    const tasks = this.assistant.getTasks();

    if (tasks.length === 0) {
      return "You don't have any pending tasks. Would you like to add one?";
    }

    let output = `Here are your tasks:\n\n`;

    tasks.forEach((task, index) => {
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      const dueDate = task.due_date
        ? ` (Due: ${new Date(task.due_date).toLocaleDateString()})`
        : '';

      output += `${index + 1}. ${priority} ${task.title}${dueDate}\n`;

      if (task.description) {
        output += `   ${task.description}\n`;
      }
    });

    return output.trim();
  }

  private addTask(taskText: string): string {
    if (!taskText) {
      return 'Please provide a task description. Usage: /addtask [task description]';
    }

    this.assistant.addTask(taskText);
    return `I've added that to your tasks. You can view all tasks with /tasks`;
  }

  private completeTask(taskIdStr: string): string {
    const taskId = parseInt(taskIdStr, 10);

    if (isNaN(taskId)) {
      return 'Please provide a valid task number. Usage: /completetask [number]';
    }

    this.assistant.completeTask(taskId);
    return `Task ${taskId} marked as complete. Well done!`;
  }

  private showReminders(): string {
    const reminders = this.assistant.getUpcomingReminders();

    if (reminders.length === 0) {
      return "You don't have any upcoming reminders.";
    }

    let output = `Here are your upcoming reminders:\n\n`;

    reminders.forEach((reminder, index) => {
      const time = new Date(reminder.time);
      const recurring = reminder.recurring ? ` (${reminder.recurring})` : '';

      output += `${index + 1}. ${reminder.message}\n`;
      output += `   ${time.toLocaleString()}${recurring}\n`;
    });

    return output.trim();
  }

  private addReminder(reminderText: string): string {
    if (!reminderText) {
      return 'Please provide a reminder message. Usage: /addreminder [message]';
    }

    // Simple implementation - set reminder for 1 hour from now
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + 1);

    this.assistant.addReminder(reminderText, reminderTime);
    return `I'll remind you about "${reminderText}" at ${reminderTime.toLocaleTimeString()}`;
  }

  shutdown() {
    this.db.close();
  }
}

// Start the application
const app = new RizeApp();
app.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Handle shutdown
process.on('SIGINT', () => {
  app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  app.shutdown();
  process.exit(0);
});
