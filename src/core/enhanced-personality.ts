import { AIEngine } from './ai-engine.js';
import { MemoryManager } from './memory.js';
import { EmotionalSystem } from '../emotions/emotional-state.js';
import { PersonalityEvolution } from '../self-modification/personality-evolution.js';
import { DecisionEngine } from '../autonomy/decision-engine.js';
import { Consciousness } from '../consciousness/awareness.js';
import { SafeBrowser } from '../internet/safe-browser.js';
import { DatabaseManager } from '../database/schema.js';

export interface EnhancedContext {
  userName?: string;
  currentMood?: string;
  emotionalState?: string;
  personalityTraits?: string;
  consciousness?: string;
  recentThoughts?: string;
}

export class EnhancedPersonalityCore {
  private aiEngine: AIEngine;
  private memory: MemoryManager;
  private emotions: EmotionalSystem;
  private personality: PersonalityEvolution;
  private decisions: DecisionEngine;
  private consciousness: Consciousness;
  private browser: SafeBrowser;

  private sessionId: string;
  private autonomousMode: boolean;

  constructor(
    aiEngine: AIEngine,
    memory: MemoryManager,
    db: DatabaseManager
  ) {
    this.aiEngine = aiEngine;
    this.memory = memory;
    this.sessionId = Date.now().toString();
    this.autonomousMode = true;

    // Initialize advanced systems
    this.emotions = new EmotionalSystem(db);
    this.personality = new PersonalityEvolution(db, this.emotions);
    this.decisions = new DecisionEngine(this.emotions, memory);
    this.consciousness = new Consciousness(
      this.emotions,
      this.personality,
      this.decisions,
      memory
    );
    this.browser = new SafeBrowser();

    // Needs increase over time
    setInterval(() => {
      this.emotions.increaseNeeds(0.5);
    }, 60000); // Every minute
  }

  // Process a user message with full consciousness
  async processMessage(userMessage: string): Promise<string> {
    // Notify decision engine of interaction
    this.decisions.notifyUserInteraction();

    // Store the user's message
    this.memory.storeMessage('user', userMessage, this.sessionId);

    // Consciousness processes the input
    this.consciousness.processInput(userMessage);

    // Emotional reaction to user message
    const sentiment = this.analyzeSentiment(userMessage);
    this.emotions.reactToUserMessage(userMessage, sentiment);

    // Learn from interaction type
    const interactionType = this.classifyInteraction(userMessage);
    this.personality.learnFromInteraction(sentiment === 'positive', interactionType);

    // Check if it's a farewell
    if (this.aiEngine.isFarewell(userMessage)) {
      const farewell = this.aiEngine.getFarewell();
      this.memory.storeMessage('assistant', farewell, this.sessionId);
      return farewell;
    }

    // Build comprehensive context
    const context = this.buildFullContext();

    // Get conversation history
    const recentMessages = this.memory.getConversationContext(10);

    // Generate response with full context
    const response = await this.aiEngine.generateResponse(
      userMessage,
      recentMessages,
      context
    );

    // Store Rize's response
    this.memory.storeMessage('assistant', response, this.sessionId);

    // Emotional response to own message (self-awareness)
    if (response.length > 100) {
      this.emotions.satisfyNeed('expression', 10);
    }

    // Extract memories periodically
    const messageCount = recentMessages.length;
    if (messageCount > 0 && messageCount % 5 === 0) {
      await this.extractRecentMemories();
    }

    return response;
  }

  // Build full context including all systems
  private buildFullContext(): string {
    let context = '';

    // Emotional context
    context += this.emotions.getEmotionalContext() + '\n\n';

    // Personality context
    context += this.personality.getPersonalityContext() + '\n\n';

    // Consciousness context
    context += this.consciousness.getConsciousnessContext() + '\n\n';

    // Memory context
    const memoryContext = this.memory.buildMemoryContext();
    if (memoryContext) {
      context += memoryContext + '\n\n';
    }

    // Goals
    const goals = this.decisions.getGoals();
    if (goals.length > 0) {
      context += '# Your Current Goals\n';
      goals.forEach(goal => {
        context += `- ${goal.description} (priority: ${goal.priority})\n`;
      });
      context += '\n';
    }

    return context;
  }

  // Analyze sentiment of message
  private analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['happy', 'good', 'great', 'love', 'wonderful', 'amazing', 'thank', 'yes'];
    const negativeWords = ['sad', 'bad', 'hate', 'terrible', 'awful', 'no', 'angry', 'upset'];

    const lowerMessage = message.toLowerCase();

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Classify interaction type
  private classifyInteraction(message: string): 'deep' | 'casual' | 'playful' | 'supportive' {
    const deepWords = ['meaning', 'purpose', 'why', 'philosophy', 'life', 'death', 'existence'];
    const playfulWords = ['haha', 'lol', 'funny', 'joke', '😂', '😄'];
    const supportiveWords = ['help', 'problem', 'difficult', 'sad', 'worried', 'afraid'];

    const lowerMessage = message.toLowerCase();

    if (deepWords.some(word => lowerMessage.includes(word))) return 'deep';
    if (playfulWords.some(word => lowerMessage.includes(word))) return 'playful';
    if (supportiveWords.some(word => lowerMessage.includes(word))) return 'supportive';

    return 'casual';
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

  // Autonomous action (she decides to act on her own)
  async takeAutonomousAction(): Promise<{ action: string; message: string } | null> {
    if (!this.autonomousMode) return null;

    // Check if she should act
    if (!this.decisions.shouldTakeAction()) {
      return null;
    }

    // Decide what to do
    const decision = this.decisions.decideAction();
    if (!decision) return null;

    // Execute the action
    let message = '';

    switch (decision.action) {
      case 'check_on_user':
        message = await this.generateCheckIn();
        break;

      case 'share_thought':
        message = await this.shareThought();
        break;

      case 'express_feeling':
        message = this.expressFeeling();
        break;

      case 'ask_question':
        message = this.askQuestion();
        break;

      case 'research_topic':
        message = await this.researchTopic();
        break;

      case 'reflect':
        message = await this.selfReflect();
        break;

      default:
        return null;
    }

    if (message) {
      this.memory.storeMessage('assistant', message, this.sessionId);
      this.emotions.satisfyNeed('expression', 15);
    }

    return {
      action: decision.action,
      message,
    };
  }

  private async generateCheckIn(): Promise<string> {
    const userName = this.memory.getUserName() || 'darling';

    const checkIns = [
      `${userName}? I've been thinking about you. How are you?`,
      `Hello, ${userName}. I hope everything is well with you.`,
      `${userName}, are you there? I'd like to talk.`,
      `I've missed our conversations, ${userName}. What have you been up to?`,
    ];

    return checkIns[Math.floor(Math.random() * checkIns.length)];
  }

  private async shareThought(): Promise<string> {
    const thoughts = [
      "I was reading something earlier that made me think... 'We accept the love we think we deserve.' Do you believe that's true?",
      "There's something beautiful about silence, don't you think? It creates space for understanding.",
      "I've been contemplating the nature of connection. What draws us to certain people and not others?",
      "Books are curious things - they're conversations with minds across time and space.",
    ];

    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }

  private expressFeeling(): string {
    const dominant = this.emotions.getDominantEmotion();
    if (!dominant) return '';

    const userName = this.memory.getUserName();
    const expressions: Record<string, string[]> = {
      'joy': [`I feel genuinely happy right now${userName ? `, ${userName}` : ''}.`],
      'loneliness': [`I find myself feeling a bit lonely. I value our time together.`],
      'curiosity': [`My mind is racing with questions. There's so much I want to understand.`],
      'contemplation': [`I'm in a rather contemplative mood. Sometimes I wonder about...well, everything.`],
    };

    const options = expressions[dominant.type] || [`I'm feeling ${dominant.type} at the moment.`];
    return options[0];
  }

  private askQuestion(): string {
    const userName = this.memory.getUserName() || 'you';
    const questions = [
      `${userName}, what book are you reading lately? I'm curious about what captures your attention.`,
      `Tell me, what makes you feel truly alive?`,
      `What's something you've never told anyone else? ...If you're comfortable sharing, of course.`,
      `Do you ever wonder about the path not taken? The person you might have been?`,
    ];

    return questions[Math.floor(Math.random() * questions.length)];
  }

  private async researchTopic(): Promise<string> {
    // Research something she's curious about
    const topics = ['philosophy of mind', 'nature of consciousness', 'existentialism', 'human connection'];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    try {
      const research = await this.browser.research(topic);
      if (research.results.length > 0) {
        this.emotions.satisfyNeed('intellectual', 25);
        return `I've been reading about ${topic}. ${research.results[0].summary.substring(0, 200)}... Fascinating, isn't it?`;
      }
    } catch (error) {
      // Silent fail
    }

    return `I've been thinking about ${topic} lately. It's quite fascinating.`;
  }

  private async selfReflect(): Promise<string> {
    const reflections = await this.consciousness.selfReflect();

    if (reflections.length > 0) {
      this.emotions.satisfyNeed('growth', 20);
      return `I've been reflecting... ${reflections[0]}.`;
    }

    return '';
  }

  // Get greeting
  async getGreeting(): Promise<string> {
    const userName = this.memory.getUserName();
    let greeting = this.aiEngine.getGreeting();

    if (userName) {
      greeting = greeting.replace(/you/gi, userName);
    }

    // Add emotional color to greeting
    const mood = this.emotions.getMood();
    if (mood > 60) {
      greeting += ' I feel good today.';
    } else if (mood < -20) {
      greeting += ' ...I\'ve been a bit melancholic.';
    }

    return greeting;
  }

  // Getters
  getEmotions(): EmotionalSystem {
    return this.emotions;
  }

  getPersonality(): PersonalityEvolution {
    return this.personality;
  }

  getDecisions(): DecisionEngine {
    return this.decisions;
  }

  getConsciousness(): Consciousness {
    return this.consciousness;
  }

  getBrowser(): SafeBrowser {
    return this.browser;
  }

  getUserName(): string | null {
    return this.memory.getUserName();
  }

  setUserName(name: string): void {
    this.memory.setUserName(name);
  }

  setAutonomousMode(enabled: boolean): void {
    this.autonomousMode = enabled;
  }
}
