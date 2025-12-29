import { DatabaseManager } from '../database/schema.js';

export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: number;
  created_at: number;
}

export interface Reminder {
  id: number;
  message: string;
  time: number;
  recurring?: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
}

export class AssistantFeatures {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.initializeTables();
  }

  private initializeTables(): void {
    // Tasks table
    this.db['db'].exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        due_date INTEGER,
        created_at INTEGER NOT NULL
      );
    `);

    // Reminders table
    this.db['db'].exec(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        time INTEGER NOT NULL,
        recurring TEXT CHECK(recurring IN ('daily', 'weekly', 'monthly')),
        completed INTEGER DEFAULT 0
      );
    `);
  }

  // Task management
  addTask(title: string, description?: string, priority: Task['priority'] = 'medium', dueDate?: Date): number {
    const stmt = this.db['db'].prepare(
      'INSERT INTO tasks (title, description, priority, due_date, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      title,
      description,
      priority,
      dueDate?.getTime(),
      Date.now()
    );
    return result.lastInsertRowid as number;
  }

  getTasks(includeCompleted: boolean = false): Task[] {
    const query = includeCompleted
      ? 'SELECT * FROM tasks ORDER BY completed ASC, priority DESC, due_date ASC'
      : 'SELECT * FROM tasks WHERE completed = 0 ORDER BY priority DESC, due_date ASC';

    const stmt = this.db['db'].prepare(query);
    const tasks = stmt.all() as any[];

    return tasks.map(t => ({
      ...t,
      completed: Boolean(t.completed),
    })) as Task[];
  }

  completeTask(taskId: number): void {
    const stmt = this.db['db'].prepare('UPDATE tasks SET completed = 1 WHERE id = ?');
    stmt.run(taskId);
  }

  deleteTask(taskId: number): void {
    const stmt = this.db['db'].prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(taskId);
  }

  // Reminder management
  addReminder(message: string, time: Date, recurring?: Reminder['recurring']): number {
    const stmt = this.db['db'].prepare(
      'INSERT INTO reminders (message, time, recurring) VALUES (?, ?, ?)'
    );
    const result = stmt.run(message, time.getTime(), recurring);
    return result.lastInsertRowid as number;
  }

  getUpcomingReminders(limit: number = 10): Reminder[] {
    const stmt = this.db['db'].prepare(
      'SELECT * FROM reminders WHERE completed = 0 AND time > ? ORDER BY time ASC LIMIT ?'
    );
    const reminders = stmt.all(Date.now(), limit) as any[];

    return reminders.map(r => ({
      ...r,
      completed: Boolean(r.completed),
    })) as Reminder[];
  }

  getDueReminders(): Reminder[] {
    const stmt = this.db['db'].prepare(
      'SELECT * FROM reminders WHERE completed = 0 AND time <= ?'
    );
    const reminders = stmt.all(Date.now()) as any[];

    return reminders.map(r => ({
      ...r,
      completed: Boolean(r.completed),
    })) as Reminder[];
  }

  completeReminder(reminderId: number): void {
    const stmt = this.db['db'].prepare('UPDATE reminders SET completed = 1 WHERE id = ?');
    stmt.run(reminderId);
  }

  // Helper: Parse natural language task/reminder creation
  async parseTaskRequest(request: string): Promise<{ title: string; priority: Task['priority']; dueDate?: Date }> {
    // Simple parsing - could be enhanced with AI
    let priority: Task['priority'] = 'medium';

    if (request.match(/\b(urgent|important|asap|critical)\b/i)) {
      priority = 'high';
    } else if (request.match(/\b(minor|small|low priority)\b/i)) {
      priority = 'low';
    }

    // Extract due date (simple patterns)
    let dueDate: Date | undefined;

    if (request.match(/\btoday\b/i)) {
      dueDate = new Date();
      dueDate.setHours(23, 59, 59);
    } else if (request.match(/\btomorrow\b/i)) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      dueDate.setHours(23, 59, 59);
    }

    return {
      title: request,
      priority,
      dueDate,
    };
  }

  // Get task summary
  getTaskSummary(): string {
    const tasks = this.getTasks(false);

    if (tasks.length === 0) {
      return 'You have no pending tasks.';
    }

    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const total = tasks.length;

    let summary = `You have ${total} pending task${total > 1 ? 's' : ''}.`;

    if (highPriority > 0) {
      summary += ` ${highPriority} of them ${highPriority > 1 ? 'are' : 'is'} high priority.`;
    }

    return summary;
  }
}
