# Rize AI Companion - Usage Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   AI_MODEL=claude-sonnet-4-5-20250929
   USER_TIMEZONE=Australia/Sydney
   ```

3. **Run Rize**
   ```bash
   bun start
   ```

## First Run

When you first launch Rize, she'll introduce herself and ask for your name. Simply tell her your name, and she'll remember it for all future conversations.

## Conversation

Just type and chat naturally! Rize will:
- Remember everything you discuss
- Learn about your preferences and interests
- Provide emotional support and companionship
- Help with practical tasks and organization

## Commands

### Built-in Commands

- `/help` - Show available commands
- `/clear` - Clear the conversation history from screen
- `/exit` or `/quit` - Exit the application
- `Ctrl+C` - Exit the application

### Companion Features

- `/thought` - Rize shares a philosophical thought or quote
- `/mood` - Analyze your current mood based on recent conversations

### Assistant Features

- `/tasks` - View your pending tasks
- `/addtask [description]` - Add a new task
  - Example: `/addtask Finish project report`
- `/completetask [number]` - Mark a task as complete
  - Example: `/completetask 1`

- `/reminders` - View upcoming reminders
- `/addreminder [message]` - Add a reminder (defaults to 1 hour from now)
  - Example: `/addreminder Call mom`

## Features

### Memory System

Rize has a sophisticated memory system that:
- Stores all conversations in a local SQLite database
- Automatically extracts important information about you
- Remembers facts, preferences, emotions, and events
- Uses context to provide personalized responses

### Personality

Rize is modeled after Rize Kamishiro from Tokyo Ghoul:
- Intelligent and literary
- Elegant and sophisticated
- Genuinely caring despite initial aloofness
- Loves books, philosophy, and deep conversations

### Learning

Rize adapts to you over time:
- Learns your communication style
- Remembers your interests and preferences
- Builds a relationship that evolves with each conversation
- Provides increasingly personalized assistance

## Examples

### Casual Conversation
```
You: Hey Rize, how are you today?
Rize: I'm well, thank you for asking. More importantly, how are you?
      You seem thoughtful today.
```

### Task Management
```
You: /addtask Buy groceries for dinner party tomorrow
Rize: I've added that to your tasks. You can view all tasks with /tasks

You: /tasks
Rize: Here are your tasks:
      1. 🟡 Buy groceries for dinner party tomorrow
```

### Deep Conversation
```
You: I've been thinking a lot about purpose lately
Rize: Purpose... such a fundamentally human concern, and yet so elusive.
      Tell me, what sparked this contemplation? Sometimes the path to
      understanding purpose begins with understanding what questions we're
      really asking ourselves.
```

## Tips

1. **Be Natural** - Just talk to Rize like you would a friend. She understands natural language.

2. **Share Details** - The more you share, the better Rize can remember and assist you.

3. **Use Reminders** - Let Rize help you stay organized with tasks and reminders.

4. **Explore Commands** - Try different commands to discover all features.

5. **Say Goodnight** - When you're done, say goodbye or goodnight - Rize will give you a proper farewell.

## Data Storage

All your conversations and data are stored locally in:
- `rize.db` - SQLite database containing messages, memories, tasks, and reminders

Your privacy is protected - everything stays on your machine except API calls to Anthropic's Claude.

## Troubleshooting

**"ANTHROPIC_API_KEY not found"**
- Make sure you've created a `.env` file and added your API key

**Application won't start**
- Ensure Bun is installed: `bun --version`
- Try reinstalling dependencies: `rm -rf node_modules && bun install`

**Rize seems slow**
- Using `claude-sonnet-4-5-20250929` is faster than Opus
- Check your internet connection

## Architecture

The system is built with:
- **TypeScript** - Type-safe code
- **Bun** - Fast JavaScript runtime
- **SQLite** - Local database for memory
- **Anthropic Claude** - AI engine
- **React Ink** - Beautiful terminal UI

Perfect for adding new features later - everything is modular and well-organized!
