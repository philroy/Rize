import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export interface RVCTTSConfig {
  // Base TTS provider for generating initial audio
  baseTTSProvider: 'system' | 'coqui';

  // RVC server configuration
  rvcServerUrl?: string;  // e.g., 'http://localhost:5000'
  rvcModelName?: string;  // Your trained Rize model name

  // RVC inference parameters
  pitch: number;          // Pitch shift (-12 to +12, 0 = no change)
  indexRate: number;      // Index rate (0.0 to 1.0, higher = more like training data)
  filterRadius: number;   // Smoothing (0-7, 3 is good default)

  // Voice settings
  voiceSpeed: number;     // Speaking speed (0.5-2.0, 1.0 = normal)
}

export class RVCTTSEngine {
  private config: RVCTTSConfig;
  private audioQueue: string[];
  private isSpeaking: boolean;

  constructor(config: Partial<RVCTTSConfig> = {}) {
    this.config = {
      baseTTSProvider: config.baseTTSProvider || 'system',
      rvcServerUrl: config.rvcServerUrl || 'http://localhost:5000',
      rvcModelName: config.rvcModelName || 'rize_kamishiro',
      pitch: config.pitch ?? 0,
      indexRate: config.indexRate ?? 0.75,
      filterRadius: config.filterRadius ?? 3,
      voiceSpeed: config.voiceSpeed ?? 1.0,
    };

    this.audioQueue = [];
    this.isSpeaking = false;
  }

  // Main speak function - generates audio with Rize's voice
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
      // Step 1: Generate base audio with any TTS
      const baseTempFile = await this.generateBaseAudio(text);

      // Step 2: Convert through RVC to get Rize's voice
      const rizeTempFile = await this.convertWithRVC(baseTempFile);

      // Step 3: Play the result
      await this.playAudioFile(rizeTempFile);

      // Clean up temp files
      if (existsSync(baseTempFile)) unlinkSync(baseTempFile);
      if (existsSync(rizeTempFile)) unlinkSync(rizeTempFile);
    } catch (error) {
      console.error('[RVC-TTS] Error speaking:', error);
      // Fallback: try base TTS without RVC
      await this.fallbackSpeak(text);
    }

    // Process next in queue
    await this.processQueue();
  }

  // Generate initial audio using base TTS
  private async generateBaseAudio(text: string): Promise<string> {
    const tempFile = `/tmp/rize_base_${Date.now()}.wav`;

    if (this.config.baseTTSProvider === 'coqui') {
      // Use Coqui TTS (if installed)
      try {
        await execAsync(`tts --text "${text.replace(/"/g, '\\"')}" --out_path "${tempFile}"`);
        return tempFile;
      } catch (error) {
        console.warn('[RVC-TTS] Coqui TTS failed, falling back to system');
      }
    }

    // System TTS (fallback)
    if (process.platform === 'darwin') {
      // macOS - use 'say' with Samantha voice (good female voice)
      await execAsync(`say -v Samantha -o "${tempFile}" --data-format=LEF32@22050 "${text.replace(/"/g, '\\"')}" && sox "${tempFile}" -r 40000 "${tempFile}.conv.wav" && mv "${tempFile}.conv.wav" "${tempFile}"`);
    } else if (process.platform === 'linux') {
      // Linux - use espeak with female voice
      await execAsync(`espeak -v en-us+f3 -s 150 -w "${tempFile}" "${text.replace(/"/g, '\\"')}"`);
    }

    return tempFile;
  }

  // Convert audio through RVC to get Rize's voice
  private async convertWithRVC(inputAudioPath: string): Promise<string> {
    const outputFile = `/tmp/rize_voice_${Date.now()}.wav`;

    // Check if RVC server is available
    if (this.config.rvcServerUrl) {
      try {
        // Use RVC API (you'll set this up)
        const audioData = readFileSync(inputAudioPath);

        // This assumes your RVC server has an API endpoint
        // You'll need to set this up based on how you deploy RVC
        const response = await axios.post(
          `${this.config.rvcServerUrl}/convert`,
          {
            audio: audioData.toString('base64'),
            model: this.config.rvcModelName,
            pitch: this.config.pitch,
            index_rate: this.config.indexRate,
            filter_radius: this.config.filterRadius,
          },
          {
            responseType: 'arraybuffer',
            timeout: 30000,
          }
        );

        writeFileSync(outputFile, Buffer.from(response.data));
        return outputFile;
      } catch (error) {
        console.error('[RVC-TTS] RVC server error:', error);
        // Fallback: return unconverted audio
        return inputAudioPath;
      }
    }

    // Alternative: Use RVC CLI directly (if installed locally)
    try {
      const rvcCommand = `python3 -m rvc.infer \
        --input "${inputAudioPath}" \
        --output "${outputFile}" \
        --model "${this.config.rvcModelName}" \
        --pitch ${this.config.pitch} \
        --index-rate ${this.config.indexRate} \
        --filter-radius ${this.config.filterRadius}`;

      await execAsync(rvcCommand);
      return outputFile;
    } catch (error) {
      console.warn('[RVC-TTS] RVC conversion failed, using base audio');
      return inputAudioPath;
    }
  }

  // Play audio file
  private async playAudioFile(filePath: string): Promise<void> {
    try {
      if (process.platform === 'darwin') {
        await execAsync(`afplay "${filePath}"`);
      } else if (process.platform === 'linux') {
        // Try multiple players
        await execAsync(`aplay "${filePath}" || paplay "${filePath}" || ffplay -nodisp -autoexit "${filePath}" 2>/dev/null`);
      } else if (process.platform === 'win32') {
        await execAsync(`powershell -c (New-Object Media.SoundPlayer "${filePath}").PlaySync()`);
      }
    } catch (error) {
      console.error('[RVC-TTS] Audio playback error:', error);
    }
  }

  // Fallback TTS without RVC
  private async fallbackSpeak(text: string): Promise<void> {
    try {
      if (process.platform === 'darwin') {
        await execAsync(`say -v Samantha "${text.replace(/"/g, '\\"')}"`);
      } else if (process.platform === 'linux') {
        await execAsync(`espeak -v en-us+f3 "${text.replace(/"/g, '\\"')}"`);
      }
    } catch (error) {
      console.error('[RVC-TTS] Fallback speak error:', error);
      console.log(`[RVC-TTS] ${text}`); // Ultimate fallback: just print
    }
  }

  // Stop speaking
  stop(): void {
    this.audioQueue = [];
    this.isSpeaking = false;
  }

  // Check if currently speaking
  isBusy(): boolean {
    return this.isSpeaking || this.audioQueue.length > 0;
  }

  // Update configuration
  updateConfig(config: Partial<RVCTTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Test RVC connection
  async testRVCConnection(): Promise<boolean> {
    if (!this.config.rvcServerUrl) return false;

    try {
      const response = await axios.get(`${this.config.rvcServerUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
