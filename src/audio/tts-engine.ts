import { ElevenLabsClient } from 'elevenlabs';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TTSConfig {
  provider: 'elevenlabs' | 'system';
  apiKey?: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
}

export class TTSEngine {
  private config: TTSConfig;
  private elevenlabs?: ElevenLabsClient;
  private audioQueue: string[];
  private isSpeaking: boolean;

  constructor(config: TTSConfig) {
    this.config = config;
    this.audioQueue = [];
    this.isSpeaking = false;

    if (config.provider === 'elevenlabs' && config.apiKey) {
      this.elevenlabs = new ElevenLabsClient({ apiKey: config.apiKey });
    }
  }

  // Speak text (convert to audio and play)
  async speak(text: string): Promise<void> {
    this.audioQueue.push(text);
    if (!this.isSpeaking) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const text = this.audioQueue.shift()!;

    try {
      if (this.config.provider === 'elevenlabs' && this.elevenlabs) {
        await this.speakWithElevenLabs(text);
      } else {
        await this.speakWithSystem(text);
      }
    } catch (error) {
      console.error('[TTS] Error speaking:', error);
    }

    // Process next in queue
    await this.processQueue();
  }

  private async speakWithElevenLabs(text: string): Promise<void> {
    if (!this.elevenlabs) throw new Error('ElevenLabs not initialized');

    try {
      const audio = await this.elevenlabs.textToSpeech.convert(this.config.voiceId || 'default', {
        text,
        model_id: this.config.model || 'eleven_monolingual_v1',
        voice_settings: {
          stability: this.config.stability || 0.5,
          similarity_boost: this.config.similarityBoost || 0.75,
        },
      });

      // Save to temporary file
      const tempFile = `/tmp/rize_tts_${Date.now()}.mp3`;
      const chunks: Uint8Array[] = [];

      for await (const chunk of audio) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      writeFileSync(tempFile, buffer);

      // Play audio using system player
      await this.playAudioFile(tempFile);

      // Clean up
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    } catch (error) {
      console.error('[TTS] ElevenLabs error:', error);
      // Fallback to system TTS
      await this.speakWithSystem(text);
    }
  }

  private async speakWithSystem(text: string): Promise<void> {
    try {
      // Use system TTS (works on macOS, Linux with espeak, Windows with powershell)
      if (process.platform === 'darwin') {
        // macOS
        await execAsync(`say "${text.replace(/"/g, '\\"')}"`);
      } else if (process.platform === 'linux') {
        // Linux (requires espeak)
        await execAsync(`espeak "${text.replace(/"/g, '\\"')}" 2>/dev/null || echo "${text}"`);
      } else if (process.platform === 'win32') {
        // Windows
        await execAsync(`powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')"`);
      }
    } catch (error) {
      console.error('[TTS] System TTS error:', error);
      console.log(`[TTS] ${text}`); // Fallback: just print
    }
  }

  private async playAudioFile(filePath: string): Promise<void> {
    try {
      if (process.platform === 'darwin') {
        await execAsync(`afplay "${filePath}"`);
      } else if (process.platform === 'linux') {
        // Try different players
        await execAsync(`aplay "${filePath}" || paplay "${filePath}" || ffplay -nodisp -autoexit "${filePath}" 2>/dev/null`);
      } else if (process.platform === 'win32') {
        await execAsync(`powershell -c (New-Object Media.SoundPlayer "${filePath}").PlaySync()`);
      }
    } catch (error) {
      console.error('[TTS] Audio playback error:', error);
    }
  }

  // Stop speaking
  stop(): void {
    this.audioQueue = [];
    this.isSpeaking = false;
    // Note: Stopping mid-speech requires more complex audio handling
  }

  // Check if currently speaking
  isBusy(): boolean {
    return this.isSpeaking || this.audioQueue.length > 0;
  }

  // Set voice (for ElevenLabs)
  setVoice(voiceId: string): void {
    this.config.voiceId = voiceId;
  }

  // Update config
  updateConfig(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.apiKey && config.provider === 'elevenlabs') {
      this.elevenlabs = new ElevenLabsClient({ apiKey: config.apiKey });
    }
  }
}
