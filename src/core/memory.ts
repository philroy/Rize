import { DatabaseManager, Message, Memory } from '../database/schema.js';

export class MemoryManager {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // Store a conversation message
  storeMessage(role: 'user' | 'assistant', content: string, sessionId?: string): void {
    this.db.addMessage(role, content, sessionId);
  }

  // Get conversation context for AI
  getConversationContext(messageCount: number = 10): Message[] {
    return this.db.getRecentMessages(messageCount).reverse();
  }

  // Extract and store important information from conversations
  async extractMemory(messages: Message[], aiExtract: (prompt: string) => Promise<string>): Promise<void> {
    if (messages.length < 2) return;

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const extractionPrompt = `Analyze this conversation and extract key information about the user.
Return a JSON array of memories in this format:
[{"type": "fact|preference|emotion|event", "content": "the memory", "importance": 1-10}]

Conversation:
${conversationText}

Focus on:
- Facts about the user (name, job, family, etc.)
- Preferences and likes/dislikes
- Emotional states or concerns
- Important events mentioned

Only extract significant, memorable information. Return an empty array if nothing important.`;

    try {
      const response = await aiExtract(extractionPrompt);
      const memories = JSON.parse(response);

      if (Array.isArray(memories)) {
        for (const memory of memories) {
          if (memory.content && memory.type) {
            this.db.addMemory(
              memory.type,
              memory.content,
              memory.importance || 5,
              messages.map(m => m.id).join(',')
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to extract memories:', error);
    }
  }

  // Get relevant memories for current context
  getRelevantMemories(query?: string, limit: number = 10): Memory[] {
    if (query) {
      return this.db.searchMemories(query).slice(0, limit);
    }
    return this.db.getMemories(undefined, limit);
  }

  // Get memories by type
  getMemoriesByType(type: Memory['type'], limit?: number): Memory[] {
    return this.db.getMemories(type, limit);
  }

  // Build context string for AI prompt
  buildMemoryContext(): string {
    const facts = this.db.getMemories('fact', 5);
    const preferences = this.db.getMemories('preference', 5);
    const recentEvents = this.db.getMemories('event', 3);

    let context = '';

    if (facts.length > 0) {
      context += 'What I know about you:\n' + facts.map(f => `- ${f.content}`).join('\n') + '\n\n';
    }

    if (preferences.length > 0) {
      context += 'Your preferences:\n' + preferences.map(p => `- ${p.content}`).join('\n') + '\n\n';
    }

    if (recentEvents.length > 0) {
      context += 'Recent events:\n' + recentEvents.map(e => `- ${e.content}`).join('\n') + '\n\n';
    }

    return context.trim();
  }

  // Add a memory directly
  addMemory(type: Memory['type'], content: string, importance: number = 5): number {
    return this.db.addMemory(type, content, importance);
  }

  // User profile helpers
  setUserName(name: string): void {
    this.db.setUserProfile('name', name);
  }

  getUserName(): string | null {
    return this.db.getUserProfile('name');
  }

  setUserData(key: string, value: string): void {
    this.db.setUserProfile(key, value);
  }

  getUserData(key: string): string | null {
    return this.db.getUserProfile(key);
  }

  getAllUserData(): Record<string, string> {
    return this.db.getAllUserProfile();
  }
}
