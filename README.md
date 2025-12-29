# Rize - AI Companion System

An AI companion modeled after Rize Kamishiro from Tokyo Ghoul. Provides both emotional companionship and practical daily assistance.

## Features

- **Authentic Personality**: Intelligent, literary, elegant character modeling
- **Persistent Memory**: Remembers all conversations and learns about you
- **Companionship**: Emotional support, conversations, and genuine connection
- **Daily Assistant**: Task management, reminders, scheduling, and organization
- **Adaptive Learning**: Evolves based on your interactions and preferences

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure your environment:
   ```bash
   cp .env.example .env
   # Edit .env and add your Anthropic API key
   ```

3. Run Rize:
   ```bash
   bun start
   ```

## Development

```bash
# Run in development mode with auto-reload
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build
```

## Requirements

- Bun runtime
- Anthropic API key (get one at https://console.anthropic.com/)

## Project Structure

```
src/
├── core/          # Core AI engine, personality, and memory
├── features/      # Companion and assistant features
├── ui/            # Terminal interface
├── database/      # SQLite database and schemas
└── index.ts       # Entry point
```
