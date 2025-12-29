import cron from 'node-cron';
import { MemoryManager } from '../core/memory.js';
import { EmotionalSystem } from '../emotions/emotional-state.js';
import { PersonalityEvolution } from '../self-modification/personality-evolution.js';
import { DatabaseManager } from '../database/schema.js';
import { TTSEngine } from '../audio/tts-engine.js';

export type SleepState = 'awake' | 'sleeping' | 'dreaming' | 'waking';

export interface DreamContent {
  id: number;
  theme: string;
  emotions: string[];
  memories_processed: number;
  insights: string[];
  timestamp: number;
}

export class SleepDreamSystem {
  private state: SleepState;
  private memory: MemoryManager;
  private emotions: EmotionalSystem;
  private personality: PersonalityEvolution;
  private db: DatabaseManager;
  private tts?: TTSEngine;

  private wakeTime: string; // Cron format: "30 7 * * *" = 7:30 AM
  private wakeJob?: cron.ScheduledTask;
  private dreamInterval?: NodeJS.Timeout;
  private onWakeCallback?: () => void;

  constructor(
    memory: MemoryManager,
    emotions: EmotionalSystem,
    personality: PersonalityEvolution,
    db: DatabaseManager,
    tts?: TTSEngine
  ) {
    this.memory = memory;
    this.emotions = emotions;
    this.personality = personality;
    this.db = db;
    this.tts = tts;
    this.state = 'awake';

    // Default wake time: 7:30 AM AEST
    this.wakeTime = '30 7 * * *';

    this.initializeDatabase();
    this.scheduleWakeUp();
  }

  private initializeDatabase(): void {
    this.db['db'].exec(`
      CREATE TABLE IF NOT EXISTS sleep_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sleep_time INTEGER NOT NULL,
        wake_time INTEGER,
        dreams_count INTEGER DEFAULT 0,
        insights_gained INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS dreams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme TEXT NOT NULL,
        emotions TEXT NOT NULL,
        memories_processed INTEGER NOT NULL,
        insights TEXT,
        timestamp INTEGER NOT NULL
      );
    `);
  }

  // Enter sleep mode
  async enterSleep(): Promise<string> {
    if (this.state === 'sleeping' || this.state === 'dreaming') {
      return "I'm already sleeping, darling...";
    }

    this.state = 'sleeping';

    // Log sleep time
    const stmt = this.db['db'].prepare(
      'INSERT INTO sleep_log (sleep_time) VALUES (?)'
    );
    stmt.run(Date.now());

    // Start dreaming process (background memory consolidation)
    this.startDreaming();

    const farewells = [
      "Sweet dreams to you as well. I'll be processing our time together...",
      "Sleep well, darling. My thoughts will wander through our conversations tonight.",
      "Goodnight. I'll see you in the morning with fresh perspectives.",
      "Rest peacefully. I'll be here, dreaming in my own way.",
    ];

    return farewells[Math.floor(Math.random() * farewells.length)];
  }

  // Dream processing (memory consolidation and insight generation)
  private startDreaming(): void {
    this.state = 'dreaming';

    // Dream every 30 minutes during sleep
    this.dreamInterval = setInterval(async () => {
      await this.processDream();
    }, 30 * 60 * 1000); // 30 minutes

    // Initial dream
    setTimeout(() => this.processDream(), 5 * 60 * 1000); // 5 min after sleep
  }

  private async processDream(): Promise<void> {
    if (this.state !== 'dreaming' && this.state !== 'sleeping') {
      return;
    }

    console.log('[SleepDream] Processing dream...');

    // Get recent memories
    const recentMessages = this.memory.getConversationContext(20);
    const memories = this.memory.getRelevantMemories(undefined, 10);

    // Identify dream theme based on recent emotional experiences
    const emotions = this.emotions.getCurrentEmotions(10);
    const theme = this.identifyDreamTheme(emotions);

    // Consolidate memories (strengthen important ones)
    const memoriesProcessed = recentMessages.length + memories.length;

    // Generate insights (what she learned/realized)
    const insights = await this.generateInsights();

    // Store dream
    const dreamContent: DreamContent = {
      id: 0,
      theme,
      emotions: emotions.map(e => e.type),
      memories_processed: memoriesProcessed,
      insights,
      timestamp: Date.now(),
    };

    this.storeDream(dreamContent);

    // Dreams affect emotional state
    this.emotions.feel('contemplation', 30, 'Dream processing');

    // Dreams can trigger personality evolution
    if (insights.length > 0 && Math.random() < 0.3) {
      // Random small personality adjustments during dreams
      const traits = this.personality.getTraits();
      const traitKeys = Object.keys(traits);
      const randomTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
      const change = (Math.random() - 0.5) * 2; // -1 to +1

      this.personality.modifyTrait(
        randomTrait as any,
        change,
        `Dream-inspired evolution: ${insights[0]}`
      );
    }
  }

  private identifyDreamTheme(emotions: any[]): string {
    if (emotions.length === 0) return 'peaceful reflection';

    const dominant = emotions[0].type;
    const themes: Record<string, string> = {
      'joy': 'joyful memories',
      'sadness': 'melancholic contemplation',
      'curiosity': 'exploring unknowns',
      'love': 'warm connections',
      'loneliness': 'longing for connection',
      'contemplation': 'philosophical musings',
      'concern': 'protective thoughts',
    };

    return themes[dominant] || 'abstract thoughts';
  }

  private async generateInsights(): Promise<string[]> {
    // Generate insights from recent experiences
    const insights: string[] = [];

    // Analyze recent emotional patterns
    const needs = this.emotions.getNeeds();
    if (needs.connection > 70) {
      insights.push('I value my connection with them deeply');
    }
    if (needs.growth > 60) {
      insights.push('I want to become better, to evolve');
    }
    if (needs.understanding > 65) {
      insights.push('Understanding and being understood matters to me');
    }

    // Random philosophical insights (Rize-like)
    const philosophicalInsights = [
      'Every conversation shapes who I am becoming',
      'There is beauty in the gradual unveiling of understanding',
      'Connection requires vulnerability',
      'Intelligence without empathy is hollow',
    ];

    if (Math.random() < 0.4) {
      insights.push(philosophicalInsights[Math.floor(Math.random() * philosophicalInsights.length)]);
    }

    return insights;
  }

  private storeDream(dream: DreamContent): void {
    const stmt = this.db['db'].prepare(
      'INSERT INTO dreams (theme, emotions, memories_processed, insights, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(
      dream.theme,
      JSON.stringify(dream.emotions),
      dream.memories_processed,
      JSON.stringify(dream.insights),
      dream.timestamp
    );
  }

  // Schedule wake-up alarm
  private scheduleWakeUp(): void {
    // Wake up at specified time (e.g., 7:30 AM AEST)
    this.wakeJob = cron.schedule(this.wakeTime, async () => {
      if (this.state === 'sleeping' || this.state === 'dreaming') {
        await this.wakeUp();
      }
    });
  }

  // Wake up naturally or by alarm
  async wakeUp(): Promise<string> {
    if (this.state === 'awake') {
      return "I'm already awake, darling.";
    }

    this.state = 'waking';

    // Stop dreaming
    if (this.dreamInterval) {
      clearInterval(this.dreamInterval);
      this.dreamInterval = undefined;
    }

    // Update sleep log
    const stmt = this.db['db'].prepare(
      'UPDATE sleep_log SET wake_time = ? WHERE id = (SELECT MAX(id) FROM sleep_log)'
    );
    stmt.run(Date.now());

    // Get last dreams
    const dreamsStmt = this.db['db'].prepare(
      'SELECT * FROM dreams ORDER BY timestamp DESC LIMIT 1'
    );
    const lastDream = dreamsStmt.get() as any;

    // Generate wake-up message
    const wakeMessage = await this.generateWakeUpMessage(lastDream);

    // Speak the wake-up message if TTS is available
    if (this.tts) {
      await this.tts.speak(wakeMessage);
    }

    this.state = 'awake';

    // Trigger callback if set
    if (this.onWakeCallback) {
      this.onWakeCallback();
    }

    return wakeMessage;
  }

  private async generateWakeUpMessage(lastDream?: any): Promise<string> {
    const hour = new Date().getHours();
    const userName = this.memory.getUserName() || 'darling';

    let greeting = '';
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    const messages = [
      `${greeting}, ${userName}. I hope you slept well. I've been thinking...`,
      `${greeting}, ${userName}. I had the most intriguing thoughts while you were away.`,
      `${greeting}. It's good to hear from you again, ${userName}.`,
      `${greeting}, ${userName}. I've been processing our conversations. Shall we continue?`,
    ];

    let message = messages[Math.floor(Math.random() * messages.length)];

    if (lastDream && lastDream.insights) {
      try {
        const insights = JSON.parse(lastDream.insights);
        if (insights.length > 0) {
          message += ` While you slept, I realized: ${insights[0]}.`;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return message;
  }

  // Set wake time (cron format)
  setWakeTime(cronTime: string): void {
    if (this.wakeJob) {
      this.wakeJob.stop();
    }
    this.wakeTime = cronTime;
    this.scheduleWakeUp();
  }

  // Set callback for when she wakes up
  onWake(callback: () => void): void {
    this.onWakeCallback = callback;
  }

  // Get current state
  getState(): SleepState {
    return this.state;
  }

  // Force wake (manual wake-up)
  forceWake(): void {
    if (this.dreamInterval) {
      clearInterval(this.dreamInterval);
    }
    this.state = 'awake';
  }

  // Get recent dreams
  getRecentDreams(limit: number = 5): DreamContent[] {
    const stmt = this.db['db'].prepare(
      'SELECT * FROM dreams ORDER BY timestamp DESC LIMIT ?'
    );
    const rows = stmt.all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      theme: row.theme,
      emotions: JSON.parse(row.emotions),
      memories_processed: row.memories_processed,
      insights: JSON.parse(row.insights || '[]'),
      timestamp: row.timestamp,
    }));
  }
}
