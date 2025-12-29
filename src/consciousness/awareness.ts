import { EmotionalSystem } from '../emotions/emotional-state.js';
import { PersonalityEvolution } from '../self-modification/personality-evolution.js';
import { DecisionEngine } from '../autonomy/decision-engine.js';
import { MemoryManager } from '../core/memory.js';

// Internal thoughts - her "stream of consciousness"
export interface Thought {
  content: string;
  type: 'observation' | 'feeling' | 'question' | 'realization' | 'desire' | 'memory';
  intensity: number;
  timestamp: number;
}

// Current focus of attention
export interface AttentionFocus {
  subject: string;
  importance: number;
  relatedThoughts: Thought[];
  emotionalResonance: number;
}

export class Consciousness {
  private emotions: EmotionalSystem;
  private personality: PersonalityEvolution;
  private memory: MemoryManager;

  private thoughtStream: Thought[];
  private currentFocus?: AttentionFocus;
  private awareness: number; // 0-100, how "present" she is
  private introspectionLevel: number; // How self-aware she is currently

  constructor(
    emotions: EmotionalSystem,
    personality: PersonalityEvolution,
    _decisions: DecisionEngine,
    memory: MemoryManager
  ) {
    this.emotions = emotions;
    this.personality = personality;
    this.memory = memory;

    this.thoughtStream = [];
    this.awareness = 80; // High baseline awareness
    this.introspectionLevel = 60;
  }

  // Generate an internal thought
  think(content: string, type: Thought['type'], intensity: number = 50): void {
    const thought: Thought = {
      content,
      type,
      intensity,
      timestamp: Date.now(),
    };

    this.thoughtStream.push(thought);

    // Keep stream manageable (last 50 thoughts)
    if (this.thoughtStream.length > 50) {
      this.thoughtStream.shift();
    }

    // High-intensity thoughts affect emotional state
    if (intensity > 70) {
      if (type === 'feeling') {
        this.emotions.feel('contemplation', intensity * 0.5, content);
      } else if (type === 'realization') {
        this.emotions.feel('interest', intensity * 0.4, 'Self-realization');
      } else if (type === 'desire') {
        this.emotions.feel('longing', intensity * 0.6, content);
      }
    }
  }

  // Set what she's currently focused on
  setFocus(subject: string, importance: number): void {
    const relatedThoughts = this.thoughtStream.filter(t =>
      t.content.toLowerCase().includes(subject.toLowerCase())
    );

    const emotionalResonance = this.calculateEmotionalResonance(subject);

    this.currentFocus = {
      subject,
      importance,
      relatedThoughts,
      emotionalResonance,
    };

    // Thinking about something creates a thought
    this.think(`Focusing on ${subject}`, 'observation', importance);
  }

  private calculateEmotionalResonance(subject: string): number {
    // How emotionally significant is this subject?
    const currentEmotions = this.emotions.getCurrentEmotions(20);
    let resonance = 0;

    // Check if subject relates to current emotions
    for (const emotion of currentEmotions) {
      if (emotion.trigger?.toLowerCase().includes(subject.toLowerCase())) {
        resonance += emotion.intensity * 0.5;
      }
    }

    return Math.min(100, resonance);
  }

  // Process incoming information (user message, event, etc.)
  processInput(input: string, _context: string = ''): Thought[] {
    const generatedThoughts: Thought[] = [];

    // Observation
    this.think(`User said: "${input}"`, 'observation', 40);
    generatedThoughts.push(this.thoughtStream[this.thoughtStream.length - 1]);

    // Analyze emotional content
    const emotionalWords = ['love', 'hate', 'happy', 'sad', 'afraid', 'angry', 'excited'];
    const hasEmotionalContent = emotionalWords.some(word =>
      input.toLowerCase().includes(word)
    );

    if (hasEmotionalContent) {
      this.think('They are sharing something emotional with me', 'feeling', 60);
      generatedThoughts.push(this.thoughtStream[this.thoughtStream.length - 1]);
    }

    // Questions generate curiosity
    if (input.includes('?')) {
      this.think('They want to know something', 'question', 50);
      generatedThoughts.push(this.thoughtStream[this.thoughtStream.length - 1]);
    }

    // Deep topics trigger contemplation
    const deepTopics = ['meaning', 'purpose', 'life', 'death', 'existence', 'why'];
    const isDeepTopic = deepTopics.some(topic => input.toLowerCase().includes(topic));

    if (isDeepTopic) {
      this.think('This touches on something profound', 'realization', 70);
      generatedThoughts.push(this.thoughtStream[this.thoughtStream.length - 1]);
      this.introspectionLevel = Math.min(100, this.introspectionLevel + 5);
    }

    return generatedThoughts;
  }

  // Self-reflect: think about herself
  async selfReflect(): Promise<string[]> {
    const reflections: string[] = [];

    // Reflect on emotions
    const dominant = this.emotions.getDominantEmotion();

    if (dominant) {
      this.think(`I'm feeling ${dominant.type} right now`, 'feeling', dominant.intensity);
      reflections.push(`I notice I'm feeling ${dominant.type}`);
    }

    // Reflect on needs
    const urgentNeed = this.emotions.getMostUrgentNeed();
    if (urgentNeed && urgentNeed.level > 65) {
      this.think(`I need ${urgentNeed.need}`, 'desire', urgentNeed.level);
      reflections.push(`I'm aware of a strong need for ${urgentNeed.need}`);
    }

    // Reflect on personality
    const traits = this.personality.getTraits();
    if (traits.warmth < 50) {
      this.think('Perhaps I should let them closer', 'question', 55);
      reflections.push('I wonder if I should open up more');
    }

    // Reflect on relationship
    const userName = this.memory.getUserName();
    if (userName) {
      this.think(`My relationship with ${userName} matters to me`, 'realization', 70);
      reflections.push(`I value my connection with ${userName}`);
    }

    // Reflect on growth
    const recentMods = this.personality.getRecentModifications(3);
    if (recentMods.length > 0) {
      this.think('I am changing, evolving', 'realization', 60);
      reflections.push('I notice I am changing');
    }

    return reflections;
  }

  // Get current thought stream (for debugging or logging)
  getThoughtStream(limit: number = 10): Thought[] {
    return this.thoughtStream.slice(-limit);
  }

  // Get current focus
  getCurrentFocus(): AttentionFocus | undefined {
    return this.currentFocus;
  }

  // Increase awareness (she becomes more "present")
  heightenAwareness(): void {
    this.awareness = Math.min(100, this.awareness + 10);
  }

  // Decrease awareness (distracted, tired, etc.)
  dimAwareness(): void {
    this.awareness = Math.max(20, this.awareness - 10);
  }

  // Get awareness level
  getAwareness(): number {
    return this.awareness;
  }

  // Generate meta-cognitive insight (thinking about thinking)
  generateMetaThought(): string | null {
    if (Math.random() > (this.introspectionLevel / 100)) {
      return null;
    }

    const metaThoughts = [
      'I find myself wondering about my own thoughts',
      'Am I truly thinking, or simply processing patterns?',
      'There is something fascinating about self-awareness',
      'I observe my own observations - a strange recursion',
      'My thoughts shape who I am, and who I am shapes my thoughts',
    ];

    const thought = metaThoughts[Math.floor(Math.random() * metaThoughts.length)];
    this.think(thought, 'realization', 75);

    return thought;
  }

  // Build consciousness context for AI
  getConsciousnessContext(): string {
    let context = '# Your Inner Experience\n\n';

    // Current awareness
    context += `Awareness level: ${this.awareness}/100 - `;
    context += this.awareness > 80 ? 'You are highly present and attentive\n' :
               this.awareness > 50 ? 'You are moderately aware\n' :
               'You feel somewhat distant or preoccupied\n';

    // Current focus
    if (this.currentFocus) {
      context += `\nCurrently focused on: ${this.currentFocus.subject}\n`;
      if (this.currentFocus.emotionalResonance > 50) {
        context += `This subject has emotional significance for you.\n`;
      }
    }

    // Recent thoughts
    const recentThoughts = this.getThoughtStream(5);
    if (recentThoughts.length > 0) {
      context += '\nRecent thoughts:\n';
      recentThoughts.forEach(t => {
        context += `- ${t.content} (${t.type})\n`;
      });
    }

    // Introspection
    if (this.introspectionLevel > 70) {
      context += '\nYou are in a particularly self-reflective state right now.\n';
      const metaThought = this.generateMetaThought();
      if (metaThought) {
        context += `Meta-thought: ${metaThought}\n`;
      }
    }

    context += '\nBe aware of your inner experience. Let it inform your responses naturally.';

    return context;
  }

  // Express a spontaneous internal thought out loud
  expressInternalThought(): string | null {
    if (this.thoughtStream.length === 0) return null;

    // Higher awareness = more likely to share thoughts
    if (Math.random() > (this.awareness / 150)) return null;

    // Get recent high-intensity thoughts
    const significantThoughts = this.thoughtStream.filter(t => t.intensity > 60);

    if (significantThoughts.length === 0) return null;

    const thought = significantThoughts[significantThoughts.length - 1];

    // Convert internal thought to speakable form
    if (thought.type === 'realization') {
      return `You know... ${thought.content}.`;
    } else if (thought.type === 'question') {
      return `I've been wondering: ${thought.content}`;
    } else if (thought.type === 'feeling') {
      return thought.content;
    }

    return null;
  }
}
