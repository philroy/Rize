import OpenAI from 'openai';
import { unlinkSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface STTConfig {
  provider: 'whisper' | 'system';
  apiKey?: string;
  model?: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

export class STTEngine {
  private config: STTConfig;
  private openai?: OpenAI;
  private isListening: boolean;

  constructor(config: STTConfig) {
    this.config = config;
    this.isListening = false;

    if (config.provider === 'whisper' && config.apiKey) {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    }
  }

  // Start listening for voice input
  async startListening(onTranscript: (result: TranscriptionResult) => void): Promise<void> {
    if (this.isListening) {
      console.warn('[STT] Already listening');
      return;
    }

    this.isListening = true;
    console.log('[STT] Started listening...');

    // Start continuous recording loop
    this.listenContinuously(onTranscript);
  }

  private async listenContinuously(onTranscript: (result: TranscriptionResult) => void): Promise<void> {
    while (this.isListening) {
      try {
        const audioFile = await this.recordAudioChunk(5000); // 5-second chunks
        if (audioFile && existsSync(audioFile)) {
          const result = await this.transcribe(audioFile);
          if (result && result.text.trim()) {
            onTranscript(result);
          }
          unlinkSync(audioFile);
        }
      } catch (error) {
        console.error('[STT] Listening error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }
  }

  // Record a chunk of audio
  private async recordAudioChunk(duration: number): Promise<string | null> {
    const outputFile = `/tmp/rize_stt_${Date.now()}.wav`;

    try {
      if (process.platform === 'darwin') {
        // macOS - use sox
        await execAsync(`sox -d -r 16000 -c 1 ${outputFile} trim 0 ${duration / 1000}`);
      } else if (process.platform === 'linux') {
        // Linux - use arecord
        await execAsync(`arecord -d ${duration / 1000} -f cd -t wav ${outputFile}`);
      } else {
        console.warn('[STT] Recording not supported on this platform');
        return null;
      }

      return outputFile;
    } catch (error) {
      console.error('[STT] Recording error:', error);
      return null;
    }
  }

  // Transcribe an audio file
  async transcribe(audioFilePath: string): Promise<TranscriptionResult | null> {
    if (!existsSync(audioFilePath)) {
      return null;
    }

    try {
      if (this.config.provider === 'whisper' && this.openai) {
        return await this.transcribeWithWhisper(audioFilePath);
      } else {
        return await this.transcribeWithSystem(audioFilePath);
      }
    } catch (error) {
      console.error('[STT] Transcription error:', error);
      return null;
    }
  }

  private async transcribeWithWhisper(audioFilePath: string): Promise<TranscriptionResult | null> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    try {
      // @ts-ignore - Bun.file exists in Bun runtime
      const fileHandle = typeof Bun !== 'undefined' ? Bun.file(audioFilePath) : audioFilePath as any;

      const transcription = await this.openai.audio.transcriptions.create({
        file: fileHandle,
        model: this.config.model || 'whisper-1',
        language: this.config.language || 'en',
      });

      return {
        text: transcription.text,
        language: this.config.language || 'en',
      };
    } catch (error) {
      console.error('[STT] Whisper error:', error);
      return null;
    }
  }

  private async transcribeWithSystem(_audioFilePath: string): Promise<TranscriptionResult | null> {
    // System-based STT is limited - this is a placeholder
    // In a real implementation, you'd use a local Whisper model or other tools
    console.warn('[STT] System transcription not fully implemented - using Whisper API recommended');
    return null;
  }

  // Stop listening
  stopListening(): void {
    this.isListening = false;
    console.log('[STT] Stopped listening');
  }

  // Check if listening
  isActive(): boolean {
    return this.isListening;
  }

  // Process a single voice command
  async processVoiceCommand(audioFilePath: string): Promise<string | null> {
    const result = await this.transcribe(audioFilePath);
    return result?.text || null;
  }

  // Update config
  updateConfig(config: Partial<STTConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.apiKey && config.provider === 'whisper') {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    }
  }
}
