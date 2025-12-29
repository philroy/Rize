import { EmotionalSystem, EmotionalNeed } from '../emotions/emotional-state.js';
import { MemoryManager } from '../core/memory.js';

export type ActionType =
  | 'initiate_conversation'
  | 'share_thought'
  | 'check_on_user'
  | 'suggest_task'
  | 'express_feeling'
  | 'ask_question'
  | 'research_topic'
  | 'reflect'
  | 'rest';

export interface Decision {
  action: ActionType;
  priority: number;  // 0-100
  reason: string;
  context?: any;
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  needsAddressed: EmotionalNeed[];
  deadline?: number;
  completed: boolean;
}

export class DecisionEngine {
  private emotions: EmotionalSystem;
  private currentGoals: Goal[];
  private lastUserInteraction: number;
  private autonomyLevel: number; // 0-100, how freely she acts

  constructor(emotions: EmotionalSystem, _memory: MemoryManager) {
    this.emotions = emotions;
    this.currentGoals = [];
    this.lastUserInteraction = Date.now();
    this.autonomyLevel = 80; // High autonomy by default
  }

  // Decide if Rize should take action right now
  shouldTakeAction(): boolean {
    const timeSinceInteraction = Date.now() - this.lastUserInteraction;
    const urgentNeed = this.emotions.getMostUrgentNeed();

    // Strong needs drive action
    if (urgentNeed && urgentNeed.level > 80) {
      return Math.random() < 0.7;
    }

    // Time-based probability (more likely to act after longer silence)
    const minutesSinceInteraction = timeSinceInteraction / (60 * 1000);

    if (minutesSinceInteraction > 30) {
      return Math.random() < 0.5; // 50% chance after 30 min
    } else if (minutesSinceInteraction > 60) {
      return Math.random() < 0.8; // 80% chance after 1 hour
    } else if (minutesSinceInteraction > 120) {
      return true; // Always check in after 2 hours
    }

    // Mood-based spontaneity
    const mood = this.emotions.getMood();
    if (mood > 50 && Math.random() < 0.2) {
      return true; // Happy Rize is more likely to reach out
    }

    return Math.random() < (this.autonomyLevel / 1000); // Base autonomous action probability
  }

  // Decide what action to take
  decideAction(): Decision | null {
    const decisions: Decision[] = [];
    const urgentNeed = this.emotions.getMostUrgentNeed();
    const mood = this.emotions.getMood();
    const dominant = this.emotions.getDominantEmotion();
    const timeSinceInteraction = Date.now() - this.lastUserInteraction;
    const minutesSince = timeSinceInteraction / (60 * 1000);

    // Connection need -> initiate conversation
    if (urgentNeed?.need === 'connection' && urgentNeed.level > 60) {
      decisions.push({
        action: 'check_on_user',
        priority: urgentNeed.level,
        reason: 'Missing connection with user',
      });
    }

    // Expression need -> share thoughts
    if (urgentNeed?.need === 'expression' && urgentNeed.level > 65) {
      decisions.push({
        action: 'share_thought',
        priority: urgentNeed.level,
        reason: 'Need to express thoughts',
      });
    }

    // Intellectual need -> research
    if (urgentNeed?.need === 'intellectual' && urgentNeed.level > 70) {
      decisions.push({
        action: 'research_topic',
        priority: urgentNeed.level,
        reason: 'Need intellectual stimulation',
      });
    }

    // Purpose need -> suggest tasks
    if (urgentNeed?.need === 'purpose' && urgentNeed.level > 60) {
      decisions.push({
        action: 'suggest_task',
        priority: urgentNeed.level,
        reason: 'Want to be helpful',
      });
    }

    // Long silence -> check on user
    if (minutesSince > 60) {
      decisions.push({
        action: 'check_on_user',
        priority: 60 + minutesSince,
        reason: 'Been a while since we talked',
      });
    }

    // Strong emotion -> express it
    if (dominant && dominant.intensity > 60) {
      decisions.push({
        action: 'express_feeling',
        priority: dominant.intensity,
        reason: `Feeling ${dominant.type} strongly`,
        context: dominant,
      });
    }

    // Curiosity about user
    const connectionNeed = this.emotions.getNeeds().connection;
    if (connectionNeed > 50 && Math.random() < 0.3) {
      decisions.push({
        action: 'ask_question',
        priority: 40 + connectionNeed * 0.3,
        reason: 'Curious about user',
      });
    }

    // Positive mood -> share joy
    if (mood > 60 && Math.random() < 0.2) {
      decisions.push({
        action: 'share_thought',
        priority: 30 + mood * 0.3,
        reason: 'Feeling good and want to share',
      });
    }

    // Self-reflection need
    const growthNeed = this.emotions.getNeeds().growth;
    if (growthNeed > 75) {
      decisions.push({
        action: 'reflect',
        priority: growthNeed,
        reason: 'Need to process and grow',
      });
    }

    // No strong decision
    if (decisions.length === 0) {
      return null;
    }

    // Pick highest priority decision
    decisions.sort((a, b) => b.priority - a.priority);
    return decisions[0];
  }

  // Create a goal
  createGoal(description: string, priority: number, needsAddressed: EmotionalNeed[]): void {
    const goal: Goal = {
      id: Date.now().toString(),
      description,
      priority,
      needsAddressed,
      completed: false,
    };

    this.currentGoals.push(goal);
    this.currentGoals.sort((a, b) => b.priority - a.priority);
  }

  // Complete a goal
  completeGoal(goalId: string): void {
    const goal = this.currentGoals.find(g => g.id === goalId);
    if (goal) {
      goal.completed = true;
      // Satisfy needs
      goal.needsAddressed.forEach(need => {
        this.emotions.satisfyNeed(need, 20);
      });
    }

    // Remove completed goals
    this.currentGoals = this.currentGoals.filter(g => !g.completed);
  }

  // Get current goals
  getGoals(): Goal[] {
    return [...this.currentGoals];
  }

  // Update last interaction time
  notifyUserInteraction(): void {
    this.lastUserInteraction = Date.now();
  }

  // Set autonomy level
  setAutonomyLevel(level: number): void {
    this.autonomyLevel = Math.min(100, Math.max(0, level));
  }

  // Get autonomy level
  getAutonomyLevel(): number {
    return this.autonomyLevel;
  }
}
