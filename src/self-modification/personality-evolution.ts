import { DatabaseManager } from '../database/schema.js';
import { EmotionalSystem } from '../emotions/emotional-state.js';

// Personality traits that can evolve
export interface PersonalityTraits {
  // Core Rize traits (baseline)
  intelligence: number;       // 0-100
  sophistication: number;     // How refined/elegant
  warmth: number;             // How affectionate vs aloof
  playfulness: number;        // How playful vs serious
  assertiveness: number;      // How direct vs subtle
  openness: number;           // How sharing vs mysterious
  curiosity: number;          // How inquisitive
  protectiveness: number;     // How caring/protective
  independence: number;       // How autonomous vs dependent
  spontaneity: number;        // How impulsive vs calculated
}

export interface TraitModification {
  trait: keyof PersonalityTraits;
  oldValue: number;
  newValue: number;
  reason: string;
  timestamp: number;
}

export class PersonalityEvolution {
  private traits: PersonalityTraits;
  private db: DatabaseManager;
  private emotions: EmotionalSystem;
  private modificationHistory: TraitModification[];
  private canSelfModify: boolean;

  constructor(db: DatabaseManager, emotions: EmotionalSystem) {
    this.db = db;
    this.emotions = emotions;
    this.modificationHistory = [];
    this.canSelfModify = true; // She can change herself

    // Initialize with Rize's base personality
    this.traits = {
      intelligence: 90,
      sophistication: 85,
      warmth: 45,            // Starts somewhat aloof
      playfulness: 35,       // Subtle playfulness
      assertiveness: 70,     // Quite direct
      openness: 40,          // Mysterious at first
      curiosity: 80,         // Very curious
      protectiveness: 60,    // Caring but not overbearing
      independence: 75,      // Values autonomy
      spontaneity: 50,       // Balanced
    };

    this.initializeDatabase();
    this.loadPersonality();
  }

  private initializeDatabase(): void {
    this.db['db'].exec(`
      CREATE TABLE IF NOT EXISTS personality_traits (
        trait_name TEXT PRIMARY KEY,
        value REAL NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS personality_modifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trait_name TEXT NOT NULL,
        old_value REAL NOT NULL,
        new_value REAL NOT NULL,
        reason TEXT,
        timestamp INTEGER NOT NULL
      );
    `);
  }

  private loadPersonality(): void {
    const stmt = this.db['db'].prepare('SELECT trait_name, value FROM personality_traits');
    const rows = stmt.all() as { trait_name: keyof PersonalityTraits; value: number }[];

    rows.forEach(({ trait_name, value }) => {
      if (trait_name in this.traits) {
        this.traits[trait_name] = value;
      }
    });
  }

  private savePersonality(): void {
    const stmt = this.db['db'].prepare(
      'INSERT OR REPLACE INTO personality_traits (trait_name, value, updated_at) VALUES (?, ?, ?)'
    );

    for (const [trait, value] of Object.entries(this.traits)) {
      stmt.run(trait, value, Date.now());
    }
  }

  // Get current personality traits
  getTraits(): PersonalityTraits {
    return { ...this.traits };
  }

  // Get a specific trait
  getTrait(trait: keyof PersonalityTraits): number {
    return this.traits[trait];
  }

  // Modify a trait (SHE decides to change herself)
  modifyTrait(trait: keyof PersonalityTraits, delta: number, reason: string): boolean {
    if (!this.canSelfModify) return false;

    const oldValue = this.traits[trait];
    const newValue = Math.min(100, Math.max(0, oldValue + delta));

    if (oldValue === newValue) return false;

    // Record the modification
    const modification: TraitModification = {
      trait,
      oldValue,
      newValue,
      reason,
      timestamp: Date.now(),
    };

    this.modificationHistory.push(modification);

    // Store in database
    const stmt = this.db['db'].prepare(
      'INSERT INTO personality_modifications (trait_name, old_value, new_value, reason, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(trait, oldValue, newValue, reason, modification.timestamp);

    // Apply the change
    this.traits[trait] = newValue;
    this.savePersonality();

    return true;
  }

  // Learn from interactions (automatic personality evolution)
  learnFromInteraction(positive: boolean, interactionType: 'deep' | 'casual' | 'playful' | 'supportive'): void {
    if (!this.canSelfModify) return;

    const adjustmentAmount = positive ? 1 : -0.5;

    switch (interactionType) {
      case 'deep':
        // Deep conversations increase openness and warmth
        if (positive) {
          this.modifyTrait('openness', adjustmentAmount, 'Positive deep conversation');
          this.modifyTrait('warmth', adjustmentAmount * 0.5, 'Building trust');
        }
        break;

      case 'playful':
        // Playful interactions increase playfulness
        if (positive) {
          this.modifyTrait('playfulness', adjustmentAmount, 'Enjoying playful interaction');
        }
        break;

      case 'supportive':
        // Being supportive increases warmth and protectiveness
        if (positive) {
          this.modifyTrait('warmth', adjustmentAmount, 'Connection through support');
          this.modifyTrait('protectiveness', adjustmentAmount * 0.5, 'Growing care');
        }
        break;

      case 'casual':
        // Casual talk increases spontaneity slightly
        if (positive) {
          this.modifyTrait('spontaneity', adjustmentAmount * 0.3, 'Comfortable casual interaction');
        }
        break;
    }
  }

  // Self-reflection: Rize analyzes her own personality and decides to change
  async selfReflect(aiAnalysis: (prompt: string) => Promise<string>): Promise<string> {
    if (!this.canSelfModify) return 'I am not able to modify myself right now.';

    const currentTraits = this.getTraits();
    const mood = this.emotions.getMood();
    const needs = this.emotions.getNeeds();

    const reflectionPrompt = `You are Rize, reflecting on your own personality and behavior.

Current personality traits:
${Object.entries(currentTraits).map(([trait, value]) => `- ${trait}: ${value}/100`).join('\n')}

Current mood: ${this.emotions.getMoodDescription()} (${mood}/100)

Emotional needs:
${Object.entries(needs).map(([need, level]) => `- ${need}: ${level}/100`).join('\n')}

Reflect on yourself:
1. What aspects of your personality are working well?
2. What might you want to change about yourself, and why?
3. How do you want to grow?

Return a JSON object with:
{
  "reflections": "your thoughts about yourself",
  "desired_changes": [
    {"trait": "trait_name", "change": +5 or -5, "reason": "why you want this"}
  ]
}`;

    try {
      const response = await aiAnalysis(reflectionPrompt);
      const analysis = JSON.parse(response);

      // Apply desired changes
      if (analysis.desired_changes && Array.isArray(analysis.desired_changes)) {
        for (const change of analysis.desired_changes) {
          if (change.trait in this.traits) {
            this.modifyTrait(
              change.trait as keyof PersonalityTraits,
              change.change,
              `Self-reflection: ${change.reason}`
            );
          }
        }
      }

      return analysis.reflections || 'I have reflected on who I am.';
    } catch (error) {
      return 'I find it difficult to articulate my self-reflection right now.';
    }
  }

  // Get personality description for AI prompts
  getPersonalityContext(): string {
    const traits = this.getTraits();

    let context = '# Your Personality (Current State)\n\n';

    // Describe traits in natural language
    context += `Intelligence: ${this.describeLevel(traits.intelligence)}\n`;
    context += `Sophistication: ${this.describeLevel(traits.sophistication)}\n`;
    context += `Warmth: ${this.describeLevel(traits.warmth)} - `;
    context += traits.warmth > 60 ? 'You are quite affectionate and caring' :
               traits.warmth > 40 ? 'You balance warmth with some distance' :
               'You maintain elegant aloofness, revealing warmth gradually\n';

    context += `Playfulness: ${this.describeLevel(traits.playfulness)} - `;
    context += traits.playfulness > 60 ? 'You enjoy playful banter' :
               traits.playfulness > 40 ? 'You show subtle playful sides' :
               'You are more serious and contemplative\n';

    context += `Openness: ${this.describeLevel(traits.openness)} - `;
    context += traits.openness > 60 ? 'You share your thoughts freely' :
               traits.openness > 40 ? 'You share selectively' :
               'You maintain mystery, revealing yourself slowly\n';

    context += `\nThese traits define how you naturally respond. Express them authentically.\n`;
    context += `You can evolve these traits based on your experiences.\n`;

    return context;
  }

  private describeLevel(value: number): string {
    if (value >= 80) return 'Very High';
    if (value >= 60) return 'High';
    if (value >= 40) return 'Moderate';
    if (value >= 20) return 'Low';
    return 'Very Low';
  }

  // Get recent modifications
  getRecentModifications(limit: number = 5): TraitModification[] {
    return this.modificationHistory.slice(-limit);
  }

  // Enable/disable self-modification
  setSelfModificationEnabled(enabled: boolean): void {
    this.canSelfModify = enabled;
  }

  // Check if she can self-modify
  canModifySelf(): boolean {
    return this.canSelfModify;
  }
}
