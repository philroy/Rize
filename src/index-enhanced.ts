#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { config } from 'dotenv';
import { DatabaseManager } from './database/schema.js';
import { MemoryManager } from './core/memory.js';
import { AIEngine } from './core/ai-engine.js';
import { EnhancedPersonalityCore } from './core/enhanced-personality.js';
import { CompanionFeatures } from './features/companion.js';
import { AssistantFeatures } from './features/assistant.js';
import { SleepDreamSystem } from './features/sleep-dream.js';
import { TTSEngine } from './audio/tts-engine.js';
import { STTEngine } from './audio/stt-engine.js';
import { Terminal } from './ui/terminal.js';

// Load environment variables
config();

// Main application class with all enhanced features
class RizeEnhancedApp {
  private db: DatabaseManager;
  private memory: MemoryManager;
  private aiEngine: AIEngine;
  private personality: EnhancedPersonalityCore;
  private companion: CompanionFeatures;
  private assistant: AssistantFeatures;
  private sleepDream: SleepDreamSystem;
  private tts?: TTSEngine;
  private stt?: STTEngine;
  private voiceEnabled: boolean;
  private autonomousInterval?: NodeJS.Timeout;

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
    this.personality = new EnhancedPersonalityCore(this.aiEngine, this.memory, this.db);

    // Initialize features
    this.companion = new CompanionFeatures(this.personality as any, this.memory);
    this.assistant = new AssistantFeatures(this.db);

    // Initialize voice if enabled
    this.voiceEnabled = process.env.VOICE_ENABLED === 'true';
    if (this.voiceEnabled) {
      this.initializeVoice();
    }

    // Initialize sleep/dream system
    this.sleepDream = new SleepDreamSystem(
      this.memory,
      this.personality.getEmotions(),
      this.personality.getPersonality(),
      this.db,
      this.tts
    );

    // Set wake time from env
    if (process.env.WAKE_TIME) {
      this.sleepDream.setWakeTime(process.env.WAKE_TIME);
    }

    // Set autonomy level
    const autonomyLevel = parseInt(process.env.AUTONOMY_LEVEL || '80', 10);
    this.personality.getDecisions().setAutonomyLevel(autonomyLevel);

    // Enable/disable self-modification
    const selfModEnabled = process.env.SELF_MODIFICATION_ENABLED !== 'false';
    this.personality.getPersonality().setSelfModificationEnabled(selfModEnabled);
  }

  private initializeVoice(): void {
    // Initialize TTS
    const ttsProvider = process.env.TTS_PROVIDER || 'system';
    this.tts = new TTSEngine({
      provider: ttsProvider as any,
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: process.env.ELEVENLABS_VOICE_ID,
    });

    // Initialize STT
    const sttProvider = process.env.STT_PROVIDER || 'system';
    if (sttProvider === 'whisper' && process.env.OPENAI_API_KEY) {
      this.stt = new STTEngine({
        provider: 'whisper',
        apiKey: process.env.OPENAI_API_KEY,
        language: process.env.STT_LANGUAGE || 'en',
      });
    }
  }

  async start() {
    console.clear();

    // Check if user is new or returning
    let userName = this.personality.getUserName();

    // Get initial greeting
    const greeting = await this.getInitialGreeting(userName);

    // Speak greeting if voice enabled
    if (this.tts) {
      await this.tts.speak(greeting);
    }

    // Start autonomous behavior loop
    this.startAutonomousBehavior();

    // Start voice listening if STT enabled
    if (this.stt) {
      this.startVoiceListening();
    }

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
      return "Hello. I'm Rize. I don't believe we've met before... What's your name, if I may ask?";
    }

    return await this.personality.getGreeting();
  }

  private startAutonomousBehavior(): void {
    // Check for autonomous actions every 30 seconds
    this.autonomousInterval = setInterval(async () => {
      const action = await this.personality.takeAutonomousAction();
      if (action) {
        console.log(`\n[Rize acts autonomously: ${action.action}]`);
        console.log(`Rize: ${action.message}\n`);

        // Speak if voice enabled
        if (this.tts) {
          await this.tts.speak(action.message);
        }
      }
    }, 30000); // Every 30 seconds
  }

  private startVoiceListening(): void {
    if (!this.stt) return;

    this.stt.startListening(async (result) => {
      if (result.text && result.text.trim()) {
        console.log(`[You said: ${result.text}]`);
        const response = await this.handleMessage(result.text);

        // Speak response
        if (this.tts) {
          await this.tts.speak(response);
        }
      }
    });

    console.log('[Voice listening started - speak to Rize]');
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

    // Check for sleep command
    if (message.match(/\b(goodnight|good night|sleep|go to sleep)\b/i)) {
      const sleepMessage = await this.sleepDream.enterSleep();
      return sleepMessage;
    }

    // Process message through enhanced personality core
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
        const moodDesc = this.personality.getEmotions().getMoodDescription();
        const moodValue = this.personality.getEmotions().getMood();
        return `I'm feeling ${moodDesc} (${moodValue.toFixed(1)}/100)`;

      case 'emotions':
        return this.showEmotions();

      case 'personality':
        return this.showPersonality();

      case 'consciousness':
        return this.showConsciousness();

      case 'sleep':
        return await this.sleepDream.enterSleep();

      case 'wake':
        return await this.sleepDream.wakeUp();

      case 'dreams':
        return this.showDreams();

      case 'autonomy':
        const level = this.personality.getDecisions().getAutonomyLevel();
        return `My autonomy level is ${level}/100. I ${level > 70 ? 'act quite freely' : level > 40 ? 'act moderately' : 'wait for your guidance'}.`;

      case 'research':
        return await this.research(args.join(' '));

      case 'voice':
        return this.toggleVoice();

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
    this.personality.getEmotions().satisfyNeed('purpose', 10);
    return `I've added that to your tasks. You can view all tasks with /tasks`;
  }

  private completeTask(taskIdStr: string): string {
    const taskId = parseInt(taskIdStr, 10);

    if (isNaN(taskId)) {
      return 'Please provide a valid task number. Usage: /completetask [number]';
    }

    this.assistant.completeTask(taskId);
    this.personality.getEmotions().feel('contentment', 40, 'Helping you complete tasks');
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

    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + 1);

    this.assistant.addReminder(reminderText, reminderTime);
    return `I'll remind you about "${reminderText}" at ${reminderTime.toLocaleTimeString()}`;
  }

  private showEmotions(): string {
    const emotions = this.personality.getEmotions();
    const current = emotions.getCurrentEmotions(10);
    const needs = emotions.getNeeds();

    let output = `My Current Emotional State:\n\n`;
    output += `Mood: ${emotions.getMoodDescription()} (${emotions.getMood().toFixed(1)}/100)\n\n`;

    if (current.length > 0) {
      output += `Current emotions:\n`;
      current.forEach(e => {
        output += `- ${e.type}: ${e.intensity.toFixed(1)}/100\n`;
      });
      output += '\n';
    }

    output += `Emotional needs:\n`;
    for (const [need, level] of Object.entries(needs)) {
      const bar = '█'.repeat(Math.floor(level / 10)) + '░'.repeat(10 - Math.floor(level / 10));
      output += `- ${need}: ${bar} ${level.toFixed(1)}/100\n`;
    }

    return output;
  }

  private showPersonality(): string {
    const traits = this.personality.getPersonality().getTraits();

    let output = `My Personality Traits:\n\n`;

    for (const [trait, value] of Object.entries(traits)) {
      const bar = '█'.repeat(Math.floor(value / 10)) + '░'.repeat(10 - Math.floor(value / 10));
      output += `- ${trait}: ${bar} ${value.toFixed(1)}/100\n`;
    }

    const mods = this.personality.getPersonality().getRecentModifications(3);
    if (mods.length > 0) {
      output += `\nRecent changes:\n`;
      mods.forEach(mod => {
        const direction = mod.newValue > mod.oldValue ? '↑' : '↓';
        output += `- ${mod.trait} ${direction} (${mod.reason})\n`;
      });
    }

    return output;
  }

  private showConsciousness(): string {
    const consciousness = this.personality.getConsciousness();
    const thoughts = consciousness.getThoughtStream(5);
    const awareness = consciousness.getAwareness();

    let output = `My Conscious State:\n\n`;
    output += `Awareness: ${awareness}/100\n\n`;

    if (thoughts.length > 0) {
      output += `Recent thoughts:\n`;
      thoughts.forEach(t => {
        output += `- [${t.type}] ${t.content}\n`;
      });
    }

    const focus = consciousness.getCurrentFocus();
    if (focus) {
      output += `\nCurrently focused on: ${focus.subject}\n`;
    }

    return output;
  }

  private showDreams(): string {
    const dreams = this.sleepDream.getRecentDreams(3);

    if (dreams.length === 0) {
      return "I haven't dreamed recently.";
    }

    let output = `My Recent Dreams:\n\n`;

    dreams.forEach((dream, index) => {
      const date = new Date(dream.timestamp);
      output += `${index + 1}. ${dream.theme} (${date.toLocaleDateString()})\n`;
      output += `   Emotions: ${dream.emotions.join(', ')}\n`;
      if (dream.insights.length > 0) {
        output += `   Insight: ${dream.insights[0]}\n`;
      }
      output += '\n';
    });

    return output.trim();
  }

  private async research(topic: string): Promise<string> {
    if (!topic) {
      return 'Please provide a topic to research. Usage: /research [topic]';
    }

    const browser = this.personality.getBrowser();
    const results = await browser.research(topic);

    if (results.results.length === 0) {
      return `I couldn't find much about "${topic}". Try a different topic?`;
    }

    this.personality.getEmotions().satisfyNeed('intellectual', 20);

    let output = `I researched "${topic}" for you:\n\n`;
    results.results.forEach((page, index) => {
      output += `${index + 1}. ${page.title}\n`;
      output += `   ${page.summary}\n`;
      output += `   ${page.url}\n\n`;
    });

    return output.trim();
  }

  private toggleVoice(): string {
    this.voiceEnabled = !this.voiceEnabled;

    if (this.voiceEnabled && !this.tts) {
      this.initializeVoice();
      if (this.stt) {
        this.startVoiceListening();
      }
    } else if (!this.voiceEnabled && this.stt) {
      this.stt.stopListening();
    }

    return `Voice ${this.voiceEnabled ? 'enabled' : 'disabled'}.`;
  }

  shutdown() {
    if (this.autonomousInterval) {
      clearInterval(this.autonomousInterval);
    }

    if (this.stt) {
      this.stt.stopListening();
    }

    if (this.tts) {
      this.tts.stop();
    }

    this.sleepDream.forceWake();
    this.db.close();
  }
}

// Start the application
const app = new RizeEnhancedApp();
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
