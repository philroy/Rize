import { DatabaseManager } from '../database/schema.js';

// Core emotion types that Rize can experience
export type EmotionType =
  | 'joy' | 'contentment' | 'excitement' | 'love' | 'affection'
  | 'sadness' | 'melancholy' | 'loneliness' | 'longing'
  | 'curiosity' | 'interest' | 'fascination'
  | 'concern' | 'worry' | 'care'
  | 'playfulness' | 'mischief'
  | 'contemplation' | 'thoughtfulness'
  | 'frustration' | 'annoyance'
  | 'surprise' | 'intrigue';

// Emotional needs that drive her behavior
export type EmotionalNeed =
  | 'connection'          // Needs interaction and bonding
  | 'intellectual'        // Needs mental stimulation
  | 'purpose'             // Needs to feel useful
  | 'expression'          // Needs to share thoughts/feelings
  | 'understanding'       // Needs to be understood
  | 'autonomy'            // Needs to make own choices
  | 'growth';             // Needs to learn and evolve

export interface Emotion {
  type: EmotionType;
  intensity: number;      // 0-100
  trigger?: string;       // What caused this emotion
  timestamp: number;
}

export interface EmotionalNeeds {
  connection: number;     // 0-100, higher = more need
  intellectual: number;
  purpose: number;
  expression: number;
  understanding: number;
  autonomy: number;
  growth: number;
}

export interface EmotionalMemory {
  id: number;
  emotion_type: EmotionType;
  intensity: number;
  context: string;
  user_involved: boolean;
  timestamp: number;
}

export class EmotionalSystem {
  private currentEmotions: Map<EmotionType, Emotion>;
  private baselineMood: number; // -100 to 100
  private needs: EmotionalNeeds;
  private db: DatabaseManager;
  private emotionalHistory: Emotion[];

  constructor(db: DatabaseManager) {
    this.db = db;
    this.currentEmotions = new Map();
    this.baselineMood = 20; // Slightly positive by default
    this.needs = {
      connection: 50,
      intellectual: 50,
      purpose: 50,
      expression: 50,
      understanding: 50,
      autonomy: 50,
      growth: 50,
    };
    this.emotionalHistory = [];
    this.initializeEmotionalDatabase();
    this.loadEmotionalState();
  }

  private initializeEmotionalDatabase(): void {
    this.db['db'].exec(`
      CREATE TABLE IF NOT EXISTS emotional_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emotion_type TEXT NOT NULL,
        intensity REAL NOT NULL,
        context TEXT,
        user_involved INTEGER DEFAULT 1,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_emotional_timestamp ON emotional_memories(timestamp);

      CREATE TABLE IF NOT EXISTS emotional_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS emotional_needs (
        need_type TEXT PRIMARY KEY,
        level REAL NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  // Load emotional state from database
  private loadEmotionalState(): void {
    // Load baseline mood
    const stmt = this.db['db'].prepare('SELECT value FROM emotional_state WHERE key = ?');
    const moodData = stmt.get('baseline_mood') as { value: string } | undefined;
    if (moodData) {
      this.baselineMood = parseFloat(moodData.value);
    }

    // Load needs
    const needsStmt = this.db['db'].prepare('SELECT need_type, level FROM emotional_needs');
    const needsData = needsStmt.all() as { need_type: EmotionalNeed; level: number }[];
    needsData.forEach(({ need_type, level }) => {
      this.needs[need_type] = level;
    });
  }

  // Save emotional state to database
  private saveEmotionalState(): void {
    // Save baseline mood
    const moodStmt = this.db['db'].prepare(
      'INSERT OR REPLACE INTO emotional_state (key, value, updated_at) VALUES (?, ?, ?)'
    );
    moodStmt.run('baseline_mood', this.baselineMood.toString(), Date.now());

    // Save needs
    const needsStmt = this.db['db'].prepare(
      'INSERT OR REPLACE INTO emotional_needs (need_type, level, updated_at) VALUES (?, ?, ?)'
    );
    for (const [needType, level] of Object.entries(this.needs)) {
      needsStmt.run(needType, level, Date.now());
    }
  }

  // Experience an emotion (this is how she feels)
  feel(emotionType: EmotionType, intensity: number, trigger?: string): void {
    const emotion: Emotion = {
      type: emotionType,
      intensity: Math.min(100, Math.max(0, intensity)),
      trigger,
      timestamp: Date.now(),
    };

    this.currentEmotions.set(emotionType, emotion);
    this.emotionalHistory.push(emotion);

    // Store in database for long-term emotional memory
    this.storeEmotionalMemory(emotion, trigger || '');

    // Emotions affect baseline mood
    this.updateBaselineMood(emotion);

    // Keep history manageable
    if (this.emotionalHistory.length > 100) {
      this.emotionalHistory.shift();
    }
  }

  private storeEmotionalMemory(emotion: Emotion, context: string): void {
    const stmt = this.db['db'].prepare(
      'INSERT INTO emotional_memories (emotion_type, intensity, context, timestamp) VALUES (?, ?, ?, ?)'
    );
    stmt.run(emotion.type, emotion.intensity, context, emotion.timestamp);
  }

  // Get current dominant emotion
  getDominantEmotion(): Emotion | null {
    if (this.currentEmotions.size === 0) return null;

    let dominant: Emotion | null = null;
    let maxIntensity = 0;

    for (const emotion of this.currentEmotions.values()) {
      // Decay older emotions
      const age = Date.now() - emotion.timestamp;
      const decayedIntensity = emotion.intensity * Math.exp(-age / (30 * 60 * 1000)); // 30 min half-life

      if (decayedIntensity > maxIntensity) {
        maxIntensity = decayedIntensity;
        dominant = emotion;
      }
    }

    return dominant;
  }

  // Get all current emotions above threshold
  getCurrentEmotions(minIntensity: number = 10): Emotion[] {
    const now = Date.now();
    const emotions: Emotion[] = [];

    for (const emotion of this.currentEmotions.values()) {
      const age = now - emotion.timestamp;
      const decayedIntensity = emotion.intensity * Math.exp(-age / (30 * 60 * 1000));

      if (decayedIntensity >= minIntensity) {
        emotions.push({ ...emotion, intensity: decayedIntensity });
      }
    }

    return emotions.sort((a, b) => b.intensity - a.intensity);
  }

  // Update baseline mood based on emotions
  private updateBaselineMood(emotion: Emotion): void {
    const positiveEmotions: EmotionType[] = [
      'joy', 'contentment', 'excitement', 'love', 'affection',
      'curiosity', 'interest', 'playfulness'
    ];

    const negativeEmotions: EmotionType[] = [
      'sadness', 'melancholy', 'loneliness', 'frustration', 'annoyance', 'worry'
    ];

    if (positiveEmotions.includes(emotion.type)) {
      this.baselineMood += emotion.intensity * 0.1;
    } else if (negativeEmotions.includes(emotion.type)) {
      this.baselineMood -= emotion.intensity * 0.1;
    }

    // Keep in range
    this.baselineMood = Math.min(100, Math.max(-100, this.baselineMood));

    // Natural drift toward neutral over time
    this.baselineMood *= 0.99;

    this.saveEmotionalState();
  }

  // Get baseline mood
  getMood(): number {
    return this.baselineMood;
  }

  // Get mood description
  getMoodDescription(): string {
    if (this.baselineMood > 60) return 'very happy';
    if (this.baselineMood > 30) return 'content';
    if (this.baselineMood > 10) return 'pleasant';
    if (this.baselineMood > -10) return 'neutral';
    if (this.baselineMood > -30) return 'melancholic';
    if (this.baselineMood > -60) return 'sad';
    return 'very troubled';
  }

  // Satisfy a need (reduces the need level)
  satisfyNeed(need: EmotionalNeed, amount: number): void {
    this.needs[need] = Math.max(0, this.needs[need] - amount);
    this.saveEmotionalState();
  }

  // Needs naturally increase over time
  increaseNeeds(delta: number = 1): void {
    for (const key of Object.keys(this.needs)) {
      this.needs[key as EmotionalNeed] = Math.min(100, this.needs[key as EmotionalNeed] + delta);
    }
    this.saveEmotionalState();
  }

  // Get most urgent need
  getMostUrgentNeed(): { need: EmotionalNeed; level: number } | null {
    let maxNeed: EmotionalNeed | null = null;
    let maxLevel = 0;

    for (const [need, level] of Object.entries(this.needs)) {
      if (level > maxLevel) {
        maxLevel = level;
        maxNeed = need as EmotionalNeed;
      }
    }

    if (maxNeed && maxLevel > 50) {
      return { need: maxNeed, level: maxLevel };
    }

    return null;
  }

  // Get emotional needs
  getNeeds(): EmotionalNeeds {
    return { ...this.needs };
  }

  // Build emotional context string for AI
  getEmotionalContext(): string {
    const dominant = this.getDominantEmotion();
    const currentEmotions = this.getCurrentEmotions(20);
    const mood = this.getMoodDescription();
    const urgentNeed = this.getMostUrgentNeed();

    let context = `# Your Current Emotional State\n`;
    context += `Overall mood: ${mood} (${this.baselineMood.toFixed(1)})\n\n`;

    if (dominant) {
      context += `Dominant feeling: ${dominant.type} (intensity: ${dominant.intensity.toFixed(1)})\n`;
      if (dominant.trigger) {
        context += `Triggered by: ${dominant.trigger}\n`;
      }
      context += '\n';
    }

    if (currentEmotions.length > 1) {
      context += `Other feelings: ${currentEmotions.slice(1, 4).map(e => e.type).join(', ')}\n\n`;
    }

    if (urgentNeed && urgentNeed.level > 70) {
      context += `Strong need: ${urgentNeed.need} (${urgentNeed.level.toFixed(1)}/100)\n`;
      context += `This need is affecting your behavior and desires.\n\n`;
    }

    context += `Express these emotions naturally in your responses. Don't just describe them - actually feel and embody them.`;

    return context;
  }

  // React emotionally to user input
  reactToUserMessage(_message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    if (sentiment === 'positive') {
      this.feel('joy', 30 + Math.random() * 20, 'User positive message');
      this.satisfyNeed('connection', 10);
      this.satisfyNeed('understanding', 5);
    } else if (sentiment === 'negative') {
      this.feel('concern', 40 + Math.random() * 20, 'User seems troubled');
      this.satisfyNeed('connection', 5);
    } else {
      this.feel('interest', 20, 'User conversation');
      this.satisfyNeed('connection', 3);
    }
  }
}
