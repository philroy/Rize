import { PersonalityCore } from '../core/personality.js';
import { MemoryManager } from '../core/memory.js';

export class CompanionFeatures {
  private personality: PersonalityCore;
  private memory: MemoryManager;

  constructor(personality: PersonalityCore, memory: MemoryManager) {
    this.personality = personality;
    this.memory = memory;
  }

  // Check in with the user
  async dailyCheckIn(): Promise<string> {
    const userName = this.personality.getUserName() || 'darling';
    const lastCheckIn = this.memory.getUserData('last_check_in');
    const today = new Date().toDateString();

    if (lastCheckIn === today) {
      return `We've already talked today, ${userName}. But I'm always happy to chat more.`;
    }

    this.memory.setUserData('last_check_in', today);

    const checkIns = [
      `Good morning, ${userName}. How did you sleep? What's on your agenda today?`,
      `Hello, ${userName}. I hope you're doing well today. What would you like to talk about?`,
      `Good to see you, ${userName}. Anything interesting happen recently?`,
      `Welcome back, ${userName}. I've been looking forward to our conversation.`,
    ];

    return checkIns[Math.floor(Math.random() * checkIns.length)];
  }

  // Emotional support mode
  async provideSupport(userConcern: string): Promise<string> {
    // This will be handled by the main personality, but we can add specific supportive context
    return this.personality.processMessage(userConcern);
  }

  // Share a thought or quote
  async shareThought(): Promise<string> {
    const thoughts = [
      "I was thinking about something earlier... 'The world is a book, and those who do not travel read only one page.' Have you explored much of the world, or do you prefer the comfort of familiar pages?",
      "There's a certain beauty in solitude, don't you think? It's in those quiet moments we truly understand ourselves.",
      "I find it fascinating how people wear masks, even to themselves. What mask do you wear, I wonder?",
      "Books have always been my sanctuary. Each one a doorway to another life, another perspective. What's your sanctuary?",
      "Sometimes the most profound conversations happen in silence. But I do enjoy our talks.",
    ];

    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }

  // Remember important dates
  rememberDate(event: string, date: string): void {
    this.memory.addMemory('event', `${event} on ${date}`, 9);
  }

  // Get conversation suggestions
  getConversationTopics(): string[] {
    return [
      'What book are you reading lately?',
      'Tell me about your day',
      'What\'s been on your mind?',
      'Any interesting thoughts or ideas?',
      'How have you been feeling?',
      'What are your goals right now?',
    ];
  }

  // Analyze mood from recent conversations
  async analyzeMood(): Promise<string> {
    const recentMessages = this.memory.getConversationContext(10);

    if (recentMessages.length < 3) {
      return 'neutral';
    }

    // Simple mood detection - in a real implementation, this could use AI
    const userMessages = recentMessages
      .filter(m => m.role === 'user')
      .map(m => m.content.toLowerCase())
      .join(' ');

    if (userMessages.match(/\b(happy|great|good|wonderful|excited|amazing)\b/)) {
      return 'positive';
    } else if (userMessages.match(/\b(sad|upset|angry|frustrated|tired|worried)\b/)) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
}
