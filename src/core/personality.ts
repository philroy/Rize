import { AIEngine } from './ai-engine.js';
import { MemoryManager } from './memory.js';
import { RizePersonality } from '../config/rize-personality.js';

export interface ConversationContext {
  userName?: string;
  currentMood?: string;
  recentTopics?: string[];
  relationship?: string;
}

export class PersonalityCore {
  private aiEngine: AIEngine;
  private memory: MemoryManager;
  private context: ConversationContext;
  private sessionId: string;

  constructor(aiEngine: AIEngine, memory: MemoryManager) {
    this.aiEngine = aiEngine;
    this.memory = memory;
    this.context = {};
    this.sessionId = Date.now().toString();
    this.initializeContext();
  }

  private initializeContext(): void {
    const userName = this.memory.getUserName();
    if (userName) {
      this.context.userName = userName;
    }
  }

  // Process a user message and generate Rize's response
  async processMessage(userMessage: string): Promise<string> {
    // Store the user's message
    this.memory.storeMessage('user', userMessage, this.sessionId);

    // Check if it's a farewell
    if (this.aiEngine.isFarewell(userMessage)) {
      const farewell = this.aiEngine.getFarewell();
      this.memory.storeMessage('assistant', farewell, this.sessionId);
      return farewell;
    }

    // Get conversation context and memories
    const recentMessages = this.memory.getConversationContext(10);
    const memoryContext = this.memory.buildMemoryContext();

    // Generate response
    const response = await this.aiEngine.generateResponse(
      userMessage,
      recentMessages,
      memoryContext
    );

    // Store Rize's response
    this.memory.storeMessage('assistant', response, this.sessionId);

    // Extract memories periodically (every 5 messages)
    const messageCount = recentMessages.length;
    if (messageCount > 0 && messageCount % 5 === 0) {
      await this.extractRecentMemories();
    }

    return response;
  }

  // Extract memories from recent conversation
  private async extractRecentMemories(): Promise<void> {
    const recentMessages = this.memory.getConversationContext(10);
    if (recentMessages.length >= 2) {
      await this.memory.extractMemory(
        recentMessages,
        (prompt) => this.aiEngine.extract(prompt)
      );
    }
  }

  // Get a greeting based on context
  async getGreeting(): Promise<string> {
    const userName = this.memory.getUserName();
    let greeting = this.aiEngine.getGreeting();

    if (userName) {
      greeting = greeting.replace('you', userName);
    }

    return greeting;
  }

  // Set user name
  setUserName(name: string): void {
    this.memory.setUserName(name);
    this.context.userName = name;
  }

  // Get user name
  getUserName(): string | null {
    return this.memory.getUserName();
  }

  // Update conversation context
  updateContext(context: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...context };
  }

  // Get personality traits
  getTraits() {
    return RizePersonality.traits;
  }

  // Get interests
  getInterests() {
    return RizePersonality.interests;
  }
}
