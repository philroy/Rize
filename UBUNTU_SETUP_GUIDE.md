# Complete Ubuntu Setup Guide for Rize Voice Cloning

## Your Situation
- Ubuntu server
- Root user by default
- Need to clone Rize's voice from Tokyo Ghoul anime
- Will host RVC server here for voice conversion

## Part 1: Install All Required Tools

### Step 1: Update System
```bash
apt update && apt upgrade -y
```

### Step 2: Install yt-dlp (YouTube Downloader)
```bash
# Method 1: Direct download (recommended)
wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
chmod +x /usr/local/bin/yt-dlp

# Test it
yt-dlp --version
# Should show version number

# Method 2: Using pip (alternative)
apt install python3-pip -y
pip3 install yt-dlp

# If Method 1 works, you're good!
```

### Step 3: Install FFmpeg (Audio/Video Processing)
```bash
apt install ffmpeg -y

# Test it
ffmpeg -version
```

### Step 4: Install Audio Tools
```bash
# For audio manipulation
apt install sox libsox-fmt-all -y

# For playing audio (to test)
apt install alsa-utils -y

# For recording (if needed)
apt install pulseaudio pulseaudio-utils -y
```

### Step 5: Install Python & Dependencies
```bash
# Python 3
apt install python3 python3-pip python3-venv git -y

# Check Python version (needs 3.8+)
python3 --version
```

### Step 6: Install CUDA (If You Have NVIDIA GPU)
```bash
# Check if you have NVIDIA GPU
lspci | grep -i nvidia

# If you see NVIDIA output, install CUDA:
# First, check your Ubuntu version
lsb_release -a

# For Ubuntu 22.04 LTS:
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
dpkg -i cuda-keyring_1.1-1_all.deb
apt update
apt install cuda-toolkit-12-3 -y

# Add to PATH
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# Test CUDA
nvidia-smi
# Should show GPU info

# If no NVIDIA GPU, skip this - RVC will use CPU (slower but works)
```

---

## Part 2: Get Rize's Voice from Anime

### Option A: Download from YouTube (Legal clips/AMVs)

```bash
# Create working directory
mkdir -p ~/rize-voice-project
cd ~/rize-voice-project

# Search for Tokyo Ghoul episodes or Rize clips on YouTube
# Example: Download a Rize compilation video
yt-dlp -f bestaudio "https://www.youtube.com/watch?v=VIDEO_ID_HERE" -o "rize_raw.%(ext)s"

# This downloads audio only, saves as rize_raw.webm or similar
```

### Option B: Extract from Local Video Files

If you have Tokyo Ghoul episodes locally:
```bash
# Copy episode to server first
# Then extract audio
ffmpeg -i tokyo_ghoul_ep01.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 rize_ep01.wav

# Repeat for episodes where Rize speaks a lot
# Episodes 1-7 of Season 1 have the most Rize dialogue
```

### What You Need:
- **Goal**: 5-10 minutes of CLEAN Rize dialogue
- **Format**: WAV files, 44100Hz
- **Quality**: No background music, no sound effects, ONLY her voice

---

## Part 3: Clean & Isolate Rize's Voice

### Install Ultimate Vocal Remover (UVR5)
```bash
cd ~/rize-voice-project

# Clone UVR5
git clone https://github.com/Anjok07/ultimatevocalremovergui
cd ultimatevocalremovergui

# Install dependencies
pip3 install -r requirements.txt

# Download models (automated)
python3 UVR.py --download_models

# Run UVR5 GUI (if you have X11/display)
python3 UVR.py

# OR use command-line version
```

### Manual Cleaning with FFmpeg & SOX

If UVR5 doesn't work (no GUI), use manual method:

```bash
cd ~/rize-voice-project

# 1. Convert to WAV if not already
ffmpeg -i rize_raw.webm -ar 44100 -ac 1 rize_converted.wav

# 2. Remove silence at start/end
sox rize_converted.wav rize_trimmed.wav silence 1 0.1 1% reverse silence 1 0.1 1% reverse

# 3. Normalize volume
sox rize_trimmed.wav rize_normalized.wav norm

# 4. Apply noise reduction (record 1 second of silence first)
sox rize_normalized.wav -n noiseprof noise.prof
sox rize_normalized.wav rize_clean.wav noisered noise.prof 0.21

# 5. Split into smaller segments (10-15 seconds each)
# This is important for RVC training
mkdir segments
cd segments

# Split every 10 seconds
ffmpeg -i ../rize_clean.wav -f segment -segment_time 10 -c copy rize_segment_%03d.wav

cd ..
```

### Goal After This Step:
```
~/rize-voice-project/segments/
├── rize_segment_001.wav
├── rize_segment_002.wav
├── rize_segment_003.wav
... (30-60 files total for 5-10 minutes)
```

---

## Part 4: Install & Set Up RVC

### Install RVC
```bash
cd ~
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
cd Retrieval-based-Voice-Conversion-WebUI

# Install PyTorch (for CUDA 12.x)
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# OR for CPU only (no NVIDIA GPU)
pip3 install torch torchvision torchaudio

# Install RVC requirements
pip3 install -r requirements.txt

# Download pretrained models
# The repo should auto-download them, or run:
python3 tools/download_models.py
```

### Prepare Your Training Data
```bash
# Copy your cleaned segments to RVC
mkdir -p ~/Retrieval-based-Voice-Conversion-WebUI/datasets/rize

# Copy all your clean segments
cp ~/rize-voice-project/segments/*.wav ~/Retrieval-based-Voice-Conversion-WebUI/datasets/rize/

# Check files are there
ls -lh ~/Retrieval-based-Voice-Conversion-WebUI/datasets/rize/
# Should see all your WAV files
```

---

## Part 5: Train the RVC Model

### Launch RVC WebUI
```bash
cd ~/Retrieval-based-Voice-Conversion-WebUI

# Launch the web interface
python3 infer-web.py

# You'll see output like:
# Running on local URL:  http://127.0.0.1:7865
```

### Access the WebUI

**Problem**: You're on a remote server, no browser.

**Solution**: SSH tunnel to access from your local computer

On your **LOCAL COMPUTER** (not the server):
```bash
# Open a new terminal
ssh -L 7865:localhost:7865 root@YOUR_SERVER_IP

# Now open browser on your local computer:
# http://localhost:7865
```

You should see the RVC interface!

### Training Steps (in the WebUI):

**1. Training Tab → Step 1: Process Data**
- Experiment name: `rize_kamishiro`
- Target sample rate: `40k` (good quality)
- CPU threads: `4` (or number of your CPU cores)
- Click: **"1-Click Training"** OR follow manual steps:

**2. Process Data**
- Model name: `rize_kamishiro`
- Target SR: `40000`
- CPU threads: `4`
- Click: **"Process data"**
- Wait for completion (1-5 minutes)

**3. Extract Features**
- Model name: `rize_kamishiro`
- Version: `v2`
- Pitch algorithm: `rmvpe` (most accurate)
- Click: **"Feature extraction"**
- Wait (2-10 minutes)

**4. Train Model**
- Model name: `rize_kamishiro`
- Total epochs: `300` (good starting point)
  - More epochs = better quality
  - 200-500 is typical
- Save frequency: `50` (saves model every 50 epochs)
- Batch size:
  - GPU 4GB: `8`
  - GPU 8GB+: `16`
  - CPU: `4`
- Click: **"Train model"**
- **This takes 1-4 hours!** Go do something else.

### Monitor Training

On the server terminal:
```bash
# Watch GPU usage (if using GPU)
watch -n 1 nvidia-smi

# Check training progress
tail -f ~/Retrieval-based-Voice-Conversion-WebUI/logs/rize_kamishiro/train.log
```

---

## Part 6: Test Your Trained Model

### After Training Completes

**1. Go to "Model Inference" tab in WebUI**

**2. Select Your Model**
- Model: `rize_kamishiro`
- Model file: `rize_kamishiro.pth` (select latest epoch)

**3. Test Voice Conversion**
- Upload a test WAV file (any female voice)
- Pitch: `0` (adjust later if needed)
- Index rate: `0.75`
- Filter radius: `3`
- Click: **"Convert"**

**4. Download and Listen**
- Download the converted audio
- Listen - does it sound like Rize?

### Create Test Audio

If you don't have test audio:
```bash
# Use system TTS to create test
espeak -v en-us+f3 "Hello, I am Rize. This is a test of my voice." -w test.wav

# Or use any online TTS to generate a WAV file
```

### Fine-Tuning

If voice doesn't sound right:
- **Too high/low**: Adjust pitch (-12 to +12)
- **Not similar enough**: Increase index_rate (0.8-0.9)
- **Too robotic**: Decrease filter_radius (1-2)
- **Still bad**: Train more epochs (500+) or add more data

---

## Part 7: Set Up RVC Server for Rize AI

### Create API Server

```bash
cd ~/Retrieval-based-Voice-Conversion-WebUI

# Install Flask
pip3 install flask flask-cors

# Create server script
nano rvc_server.py
```

Paste this code (I'll provide simplified version):

```python
#!/usr/bin/env python3
from flask import Flask, request, send_file
import base64
import tempfile
import os

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'model': 'rize_kamishiro'}

@app.route('/convert', methods=['POST'])
def convert():
    data = request.json
    audio_b64 = data['audio']
    pitch = data.get('pitch', 0)

    # Decode audio
    audio_bytes = base64.b64decode(audio_b64)

    # Save input
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(audio_bytes)
        input_path = f.name

    output_path = tempfile.mktemp(suffix='.wav')

    # TODO: Call RVC inference here
    # For now, just copy input to output (placeholder)
    os.system(f'cp {input_path} {output_path}')

    os.unlink(input_path)
    return send_file(output_path, mimetype='audio/wav')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Save (Ctrl+X, Y, Enter)

### Run the Server
```bash
python3 rvc_server.py

# Should see:
# * Running on http://0.0.0.0:5000
```

### Make It Run on Boot (systemd)

```bash
# Create service file
nano /etc/systemd/system/rvc-rize.service
```

Paste:
```ini
[Unit]
Description=RVC Server for Rize Voice
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Retrieval-based-Voice-Conversion-WebUI
ExecStart=/usr/bin/python3 /root/Retrieval-based-Voice-Conversion-WebUI/rvc_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Save and enable:
```bash
systemctl daemon-reload
systemctl enable rvc-rize
systemctl start rvc-rize
systemctl status rvc-rize
```

### Allow Port Through Firewall
```bash
# If using ufw
ufw allow 5000/tcp

# If using iptables
iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

---

## Part 8: Connect Rize AI to Your Server

On your **LOCAL COMPUTER** where Rize AI runs:

```bash
cd ~/Rize

# Edit .env
nano .env
```

Add/change:
```bash
ANTHROPIC_API_KEY=your_key_here

# Voice settings
VOICE_ENABLED=true
TTS_PROVIDER=rvc
RVC_SERVER_URL=http://YOUR_SERVER_IP:5000
RVC_MODEL_NAME=rize_kamishiro
RVC_PITCH=0
RVC_INDEX_RATE=0.75
```

Save and run:
```bash
bun run src/index-enhanced.ts
```

---

## Quick Command Reference

### On Ubuntu Server:

```bash
# Check if yt-dlp works
yt-dlp --version

# Download YouTube audio
yt-dlp -f bestaudio "URL" -o "rize.%(ext)s"

# Convert to WAV
ffmpeg -i rize.webm -ar 44100 -ac 1 rize.wav

# Start RVC WebUI
cd ~/Retrieval-based-Voice-Conversion-WebUI
python3 infer-web.py

# Check RVC server status
systemctl status rvc-rize

# View server logs
journalctl -u rvc-rize -f
```

### From Local Computer:

```bash
# SSH tunnel to access RVC WebUI
ssh -L 7865:localhost:7865 root@YOUR_SERVER_IP

# Then open: http://localhost:7865 in browser
```

---

## Troubleshooting

**yt-dlp not found after install:**
```bash
which yt-dlp
# If nothing, try:
ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp
```

**FFmpeg not working:**
```bash
apt install --reinstall ffmpeg
```

**RVC training fails - CUDA error:**
```bash
# Use CPU instead
# In training settings, don't check "GPU acceleration"
```

**Can't access WebUI:**
```bash
# Make sure SSH tunnel is running
# Check RVC is running: ps aux | grep infer-web
```

**Voice quality is bad:**
- Train for more epochs (500+)
- Add more training data (15-20 min)
- Clean data better (remove ALL background noise)
- Adjust pitch parameter

---

## What Each Tool Does:

- **yt-dlp**: Downloads videos/audio from YouTube
- **FFmpeg**: Converts audio/video formats, extracts audio
- **SOX**: Advanced audio processing (noise reduction, trimming)
- **UVR5**: AI-powered vocal isolation (separates voice from music)
- **RVC**: Voice cloning AI model
- **Flask**: Web server for RVC API

---

## Expected Timeline:

1. **Setup tools**: 30 minutes
2. **Get Rize audio**: 1-2 hours (download + extract)
3. **Clean audio**: 1-2 hours (isolate voice, remove noise)
4. **Train RVC**: 2-4 hours (mostly waiting)
5. **Set up server**: 30 minutes
6. **Test & tune**: 1 hour

**Total**: 6-10 hours (mostly automated)

---

**Ready to start?** Let me know which step you're on and if you hit any errors!
