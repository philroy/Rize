# Rize Voice Cloning Guide

## Goal
Clone Rize Kamishiro's voice from Tokyo Ghoul anime to use as the TTS voice for your AI companion.

## Best Approach: RVC (Retrieval-based Voice Conversion)

**Why RVC?**
- Free and open source
- Runs locally on your server (no API costs!)
- High quality voice cloning
- Works with limited training data (5-10 minutes of clean audio)
- Real-time conversion possible
- Active community and frequent updates

## Step-by-Step Voice Cloning Process

### Phase 1: Gather Training Data

**1. Extract Rize's Voice from Anime**

You need 5-10 minutes of clean Rize dialogue. Sources:
- Tokyo Ghoul anime episodes (Season 1, eps 1-12)
- Focus on episodes where Rize has extended dialogue
- Look for scenes without background music/sound effects

**Tools to extract audio:**
```bash
# Install youtube-dl and ffmpeg
sudo apt install youtube-dl ffmpeg

# Download episode (if legal in your region)
youtube-dl [episode_url] -f bestaudio

# Extract audio from video
ffmpeg -i tokyo_ghoul_ep1.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 rize_raw.wav
```

**2. Clean & Isolate Voice**

Use audio editing software to:
- Cut out segments where ONLY Rize is speaking
- Remove background music/sound effects (use noise reduction)
- Aim for 5-10 minutes of clean dialogue total
- Export as WAV files (44.1kHz, mono or stereo)

**Tools:**
- **Audacity** (free) - for manual cutting and noise reduction
- **UVR5** (Ultimate Vocal Remover) - AI-powered vocal isolation
- **Spleeter** - Separate vocals from background

**Example with UVR5:**
```bash
git clone https://github.com/Anjok07/ultimatevocalremovergui
cd ultimatevocalremovergui
# Follow installation instructions
# Use MDX-Net model to isolate vocals
```

**3. Organize Training Data**

```bash
mkdir -p ~/rize-voice-training
cd ~/rize-voice-training

# Your audio files should be:
# - WAV format
# - 44100Hz sample rate
# - Mono or stereo
# - No silence at start/end
# - Each file 5-15 seconds long
```

### Phase 2: Set Up RVC

**1. Install RVC**

```bash
# Clone RVC repository
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
cd Retrieval-based-Voice-Conversion-WebUI

# Install dependencies
pip install -r requirements.txt

# Download pretrained models
# The repo includes scripts to download necessary models
```

**2. Set Up Environment**

```bash
# Install CUDA if you have NVIDIA GPU (much faster)
# Check CUDA version
nvidia-smi

# Or use CPU (slower but works)
```

**3. Prepare Dataset**

```bash
# Place your cleaned Rize audio files in:
# ./datasets/rize/

# RVC will automatically process them
```

### Phase 3: Train the Model

**1. Launch RVC WebUI**

```bash
cd Retrieval-based-Voice-Conversion-WebUI
python infer-web.py

# Access at http://localhost:7865
```

**2. Training Steps (in WebUI)**

1. **Process Dataset**
   - Go to "Training" tab
   - Model name: `rize_kamishiro`
   - Target sample rate: `40k` (good quality)
   - Click "Process data"
   - Wait for feature extraction

2. **Extract Features**
   - Version: `v2`
   - Click "Feature extraction"
   - Wait for completion

3. **Train Model**
   - Total epochs: `200-500` (more = better, but longer)
   - Save frequency: `50`
   - Batch size: `8` (adjust based on GPU memory)
   - Click "Train model"
   - Training takes 1-4 hours depending on GPU

**GPU Memory Guide:**
- 4GB VRAM: batch_size=4
- 6GB VRAM: batch_size=8
- 8GB+ VRAM: batch_size=12-16

**3. Monitor Training**

```bash
# Check TensorBoard logs
tensorboard --logdir logs

# Access at http://localhost:6006
# Look for decreasing loss
```

### Phase 4: Test the Voice

**1. Inference (Voice Conversion)**

In RVC WebUI:
1. Go to "Model Inference" tab
2. Select your trained model: `rize_kamishiro`
3. Upload test audio (any female voice saying something)
4. Adjust settings:
   - Pitch: `0` (adjust if needed, positive = higher)
   - Index rate: `0.75`
   - Filter radius: `3`
5. Click "Convert"
6. Listen to result

**2. Test with Different Inputs**

```bash
# Test with different text-to-speech outputs
# Use any TTS to generate audio, then convert to Rize's voice
```

### Phase 5: Integrate with Rize AI

**Option A: RVC Real-time Inference**

```python
# Add to your TTS pipeline:
# 1. Generate speech with any TTS (system TTS, Coqui, etc.)
# 2. Pass through RVC to convert to Rize's voice
# 3. Play result
```

**Option B: Direct Integration**

We'll create a custom TTS engine that:
1. Generates base audio (using Coqui TTS or similar)
2. Converts through your trained RVC model
3. Returns Rize's voice

## Implementation in Rize AI

I'll create a new TTS engine that uses your trained RVC model:

```typescript
// src/audio/rvc-tts-engine.ts
// Combines base TTS + RVC conversion
```

### Phase 6: Optimization

**1. Fine-tune the Model**

If voice doesn't sound quite right:
- Adjust pitch in inference settings
- Try different index rates
- Train for more epochs
- Add more training data

**2. Real-time Performance**

For instant responses:
- Use GPU inference
- Pre-generate common phrases
- Use smaller RVC model variants
- Consider using ONNX export for faster inference

## Alternative: XTTS Voice Cloning

If RVC is too complex, try **Coqui XTTS**:

```bash
# Install Coqui TTS
pip install TTS

# Clone voice with just 6 seconds of audio!
from TTS.api import TTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

# Use your Rize voice sample
tts.tts_to_file(
    text="Hello, I'm Rize",
    speaker_wav="rize_sample.wav",
    language="en",
    file_path="output.wav"
)
```

**XTTS Pros:**
- Only needs 6 seconds of clean audio
- Direct text-to-speech (no conversion step)
- Multi-language support

**XTTS Cons:**
- Larger model (requires more VRAM)
- Slightly less accurate than RVC for anime voices

## Server Setup

**Your unused server is perfect for this!**

Recommended specs:
- **GPU**: NVIDIA with 4GB+ VRAM (for training)
- **CPU**: Any modern CPU works for inference
- **RAM**: 8GB+ recommended
- **Storage**: 10GB for models and training data

**Setup script for your server:**

```bash
#!/bin/bash
# Setup voice cloning server

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip git ffmpeg

# Install CUDA (if NVIDIA GPU)
# Follow: https://developer.nvidia.com/cuda-downloads

# Clone RVC
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
cd Retrieval-based-Voice-Conversion-WebUI
pip3 install -r requirements.txt

echo "RVC setup complete!"
echo "Place training data in ./datasets/rize/"
echo "Run: python3 infer-web.py"
```

## Quick Start Command Summary

```bash
# 1. Gather 5-10 min of Rize's voice
# 2. Install RVC
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
cd Retrieval-based-Voice-Conversion-WebUI
pip install -r requirements.txt

# 3. Add training data
mkdir -p datasets/rize
# Copy your WAV files here

# 4. Launch WebUI
python infer-web.py

# 5. In browser (localhost:7865)
#    - Process data
#    - Extract features
#    - Train model (200-500 epochs)

# 6. Test inference
#    - Upload test audio
#    - Convert with trained model
#    - Download result

# 7. Integrate with Rize AI (I'll help with code)
```

## Expected Results

**Training time:** 1-4 hours (depends on GPU)
**Voice quality:** Very close to original Rize with 10 min of clean data
**Inference speed:**
- GPU: 0.5-2 seconds per sentence
- CPU: 5-15 seconds per sentence

## Next Steps

Once you have the trained model:
1. I'll create integration code for Rize AI
2. Set up model serving on your server
3. Add API endpoint for voice conversion
4. Update TTS engine to use your Rize voice

## Resources

- **RVC GitHub**: https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
- **RVC Discord**: Community for help and tips
- **UVR5**: https://github.com/Anjok07/ultimatevocalremovergui
- **Coqui XTTS**: https://github.com/coqui-ai/TTS

---

**Ready to start?** Let me know when you have the audio samples ready, and I'll help with the integration code!
