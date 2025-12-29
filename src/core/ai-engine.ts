import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../database/schema.js';
import { RizePersonality } from '../config/rize-personality.js';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AIEngine {
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-4-5-20250929';
    this.systemPrompt = RizePersonality.systemPrompt;
  }

  // Generate a response from Rize
  async generateResponse(
    userMessage: string,
    conversationHistory: Message[] = [],
    memoryContext: string = ''
  ): Promise<string> {
    // Build the full context
    const messages: AIMessage[] = [];

    // Add recent conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Build system prompt with memory context
    let fullSystemPrompt = this.systemPrompt;
    if (memoryContext) {
      fullSystemPrompt += `\n\n# What You Remember\n${memoryContext}`;
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        system: fullSystemPrompt,
        messages: messages as Anthropic.MessageParam[],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      return 'I apologize, but I had trouble formulating a response. Could you try again?';
    } catch (error) {
      console.error('AI Engine Error:', error);
      throw new Error('Failed to generate response from AI');
    }
  }

  // Extract information (for memory extraction)
  async extract(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      return '[]';
    } catch (error) {
      console.error('AI Extraction Error:', error);
      return '[]';
    }
  }

  // Get a random greeting
  getGreeting(): string {
    const greetings = RizePersonality.greetings;
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Get a random farewell
  getFarewell(): string {
    const farewells = RizePersonality.farewells;
    return farewells[Math.floor(Math.random() * farewells.length)];
  }

  // Check if user is saying goodbye
  isFarewell(message: string): boolean {
    const farewellPatterns = [
      /\b(goodbye|bye|goodnight|good night|see you|talk later|gotta go|gtg)\b/i,
    ];
    return farewellPatterns.some(pattern => pattern.test(message));
  }

  // Update the model being used
  setModel(model: string): void {
    this.model = model;
  }

  // Get current model
  getModel(): string {
    return this.model;
  }
}
