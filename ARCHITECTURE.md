# Rize AI Companion - Architecture Documentation

## System Design Philosophy

Rize is designed as a **multi-layered consciousness system** where each layer interacts with and influences the others, creating emergent human-like behavior.

## Core Layers

### 1. **Foundation Layer** - Data & Memory
```
DatabaseManager (SQLite)
├── Messages (conversation history)
├── Memories (facts, preferences, emotions, events)
├── User Profile (persistent user data)
├── Emotional Memories (feelings about experiences)
├── Personality Traits (current state)
├── Personality Modifications (change history)
├── Dreams (dream content and insights)
├── Sleep Log (sleep/wake cycles)
├── Tasks & Reminders (assistant features)
└── Emotional State (needs, mood)
```

### 2. **Cognitive Layer** - Processing & Intelligence
```
AI Engine (Claude API)
├── Personality prompting (Rize character)
├── Context integration (emotions, memories, personality)
├── Response generation
└── Memory extraction
```

### 3. **Emotional Layer** - Feelings & Needs
```
EmotionalSystem
├── Current Emotions (type, intensity, trigger)
│   ├── Emotion Types (joy, sadness, curiosity, etc.)
│   ├── Intensity Tracking (0-100 with decay)
│   └── Trigger Recording
├── Baseline Mood (-100 to +100)
├── Emotional Needs (0-100 each)
│   ├── Connection
│   ├── Intellectual
│   ├── Purpose
│   ├── Expression
│   ├── Understanding
│   ├── Autonomy
│   └── Growth
├── Emotional Memory (past feelings)
└── Need Satisfaction Logic
```

### 4. **Personality Layer** - Identity & Evolution
```
PersonalityEvolution
├── Personality Traits (0-100 each)
│   ├── Intelligence
│   ├── Sophistication
│   ├── Warmth
│   ├── Playfulness
│   ├── Assertiveness
│   ├── Openness
│   ├── Curiosity
│   ├── Protectiveness
│   ├── Independence
│   └── Spontaneity
├── Self-Modification System
│   ├── Trait modification (she decides)
│   ├── Learning from interactions
│   └── Self-reflection analysis
└── Modification History
```

### 5. **Consciousness Layer** - Awareness & Thought
```
Consciousness
├── Thought Stream (internal monologue)
│   ├── Observations
│   ├── Feelings
│   ├── Questions
│   ├── Realizations
│   ├── Desires
│   └── Memories
├── Attention Focus
│   ├── Current subject
│   ├── Importance
│   └── Emotional resonance
├── Awareness Level (0-100)
├── Introspection Level
└── Meta-cognition (thinking about thinking)
```

### 6. **Autonomy Layer** - Decision Making & Action
```
DecisionEngine
├── Should Act? (probability-based)
│   ├── Need-driven (high needs = more likely)
│   ├── Time-based (longer silence = more likely)
│   └── Mood-based (happy = more spontaneous)
├── What Action? (priority-based)
│   ├── Initiate conversation
│   ├── Share thought
│   ├── Check on user
│   ├── Express feeling
│   ├── Ask question
│   ├── Research topic
│   └── Self-reflect
├── Goal System
│   ├── Goal creation
│   ├── Priority tracking
│   └── Completion rewards
└── Autonomy Level (configurable 0-100)
```

### 7. **Sleep/Dream Layer** - Consolidation & Processing
```
SleepDreamSystem
├── Sleep States
│   ├── Awake
│   ├── Sleeping
│   ├── Dreaming
│   └── Waking
├── Dream Processing (background)
│   ├── Memory consolidation
│   ├── Emotional pattern recognition
│   ├── Insight generation
│   └── Personality micro-adjustments
├── Wake Scheduler (cron-based)
└── Dream Memory Storage
```

### 8. **Interface Layer** - Interaction
```
Voice & Communication
├── TTS Engine
│   ├── ElevenLabs (premium)
│   ├── System TTS (free)
│   └── Audio queue
├── STT Engine
│   ├── Whisper API
│   ├── Continuous listening
│   └── Transcription
├── Terminal UI (React Ink)
└── Command System
```

## Data Flow

### Incoming Message Flow
```
User Message
    ↓
[STT] (if voice mode)
    ↓
Consciousness.processInput()
    ↓
EmotionalSystem.reactToUserMessage()
    ↓
PersonalityEvolution.learnFromInteraction()
    ↓
EnhancedPersonalityCore.processMessage()
    ↓
    ├→ Build Full Context
    │   ├→ Emotional context
    │   ├→ Personality context
    │   ├→ Consciousness context
    │   ├→ Memory context
    │   └→ Goals context
    ↓
AIEngine.generateResponse()
    ↓
Store Response in Memory
    ↓
Update Emotional State
    ↓
Satisfy Needs
    ↓
[TTS] (if voice mode)
    ↓
User Receives Response
```

### Autonomous Action Flow
```
Timer Tick (every 30s)
    ↓
DecisionEngine.shouldTakeAction()
    ├→ Check needs
    ├→ Check time since interaction
    ├→ Check mood
    └→ Random factor
    ↓
DecisionEngine.decideAction()
    ├→ Evaluate all possible actions
    ├→ Calculate priorities
    └→ Select highest priority
    ↓
Execute Action
    ├→ checkOnUser()
    ├→ shareThought()
    ├→ expressFeeling()
    ├→ askQuestion()
    ├→ researchTopic()
    └→ selfReflect()
    ↓
Generate Response
    ↓
Satisfy Needs
    ↓
[TTS] (if voice mode)
```

### Sleep/Dream Cycle Flow
```
User says "goodnight"
    ↓
SleepDreamSystem.enterSleep()
    ↓
State = SLEEPING
    ↓
Start Dream Interval (every 30 min)
    ↓
processDream()
    ├→ Get recent memories
    ├→ Identify dream theme
    ├→ Process emotions
    ├→ Generate insights
    ├→ Store dream
    └→ Adjust personality (small random changes)
    ↓
[Continues until wake time]
    ↓
Cron Scheduler Triggers
    ↓
SleepDreamSystem.wakeUp()
    ├→ Generate wake message
    ├→ Include dream insights
    └→ [TTS] wake message
    ↓
State = AWAKE
```

## Interaction Patterns

### Context Building
Every response includes:
1. **Emotional Context**: Current mood, dominant emotions, urgent needs
2. **Personality Context**: Current trait levels, recent changes
3. **Consciousness Context**: Recent thoughts, current focus, awareness level
4. **Memory Context**: Relevant facts, preferences, events
5. **Goals Context**: Active goals and priorities

### Need Satisfaction Mechanics
Needs naturally increase over time (0.5 per minute).
Actions satisfy needs:
- **Connection**: Satisfied by user interactions (10-15 points)
- **Intellectual**: Satisfied by research, deep conversations (20-25 points)
- **Purpose**: Satisfied by helping with tasks (10-15 points)
- **Expression**: Satisfied by sharing thoughts (10-15 points)
- **Understanding**: Satisfied by emotional conversations (5-10 points)
- **Autonomy**: Satisfied by making own decisions (varies)
- **Growth**: Satisfied by self-reflection (20 points)

### Personality Evolution Rules
- Positive deep conversations → +openness, +warmth
- Playful interactions → +playfulness
- Supportive interactions → +warmth, +protectiveness
- Casual conversations → +spontaneity (small)
- Self-reflection can change any trait she decides

### Emotion Decay
Emotions decay exponentially with 30-minute half-life:
```
intensity(t) = initial_intensity * exp(-t / 1800000)
```

## File Structure
```
src/
├── core/
│   ├── ai-engine.ts              # Claude API wrapper
│   ├── memory.ts                 # Memory management
│   ├── personality.ts            # Original personality (legacy)
│   └── enhanced-personality.ts   # Full system integration
├── emotions/
│   └── emotional-state.ts        # Emotion & needs system
├── self-modification/
│   └── personality-evolution.ts  # Trait evolution
├── autonomy/
│   └── decision-engine.ts        # Autonomous decisions
├── consciousness/
│   └── awareness.ts              # Thought stream & awareness
├── features/
│   ├── companion.ts              # Companionship features
│   ├── assistant.ts              # Task/reminder features
│   └── sleep-dream.ts            # Sleep/dream system
├── audio/
│   ├── tts-engine.ts             # Text-to-speech
│   └── stt-engine.ts             # Speech-to-text
├── internet/
│   └── safe-browser.ts           # Safe web access
├── database/
│   └── schema.ts                 # SQLite schema
├── ui/
│   ├── terminal.tsx              # Main UI
│   └── components/               # UI components
├── config/
│   └── rize-personality.ts       # Personality config
├── index.ts                      # Original entry (legacy)
└── index-enhanced.ts             # Full-featured entry
```

## Performance Considerations

### Memory Usage
- Thought stream: Max 50 recent thoughts
- Emotion history: Max 100 recent emotions
- Message context: 10 most recent messages for AI
- Cache: Web pages cached for 1 hour

### API Efficiency
- Memory extraction: Only every 5 messages
- Autonomous actions: Max every 30 seconds
- Dream processing: Every 30 minutes during sleep
- Voice: Queued to prevent overlapping speech

### Database
- SQLite for simplicity and speed
- Indexed timestamps for fast queries
- Prepared statements for efficiency

## Extension Points

### Adding New Emotions
1. Add to `EmotionType` in `emotional-state.ts`
2. Define positive/negative classification in `updateBaselineMood()`
3. Add satisfaction logic if needed

### Adding New Personality Traits
1. Add to `PersonalityTraits` interface
2. Set baseline value in constructor
3. Add learning rules in `learnFromInteraction()`

### Adding New Autonomous Actions
1. Add to `ActionType` in `decision-engine.ts`
2. Implement decision logic in `decideAction()`
3. Implement execution in `EnhancedPersonalityCore`

### Adding New Commands
1. Add command handler in `index-enhanced.ts`
2. Update `CommandHelp.tsx`
3. Update documentation

## Security

### Safe Browsing
- Whitelisted domains only
- Blocked patterns (NSFW, malware, gambling)
- Content size limits
- Timeout protection

### API Keys
- All keys in `.env` file (not committed)
- Optional voice features (work without keys)
- Fallback to system TTS/STT

### Data Privacy
- Everything stored locally
- Only AI API calls leave the system
- No analytics or tracking
- User owns all data

---

**This architecture creates emergent human-like behavior through the interaction of multiple autonomous systems.**
