# RVC Server Setup for Rize Voice

This guide helps you set up an RVC inference server on your unused server to serve Rize's cloned voice.

## Architecture

```
Rize AI (Your Computer)
    ↓
    Text to speak
    ↓
Base TTS (System/Coqui)
    ↓
    WAV audio file
    ↓
[HTTP Request] → RVC Server (Your Server)
    ↓
    Voice converted to Rize
    ↓
[HTTP Response] ← WAV with Rize's voice
    ↓
Play through Bluetooth speaker
```

## Part 1: Train Your RVC Model

Follow `VOICE_CLONING_GUIDE.md` first to train your Rize voice model.

You should end up with:
- `rize_kamishiro.pth` - Your trained model file
- `added_index.index` - Index file for better quality

## Part 2: Set Up RVC Server

### Install RVC on Your Server

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip git ffmpeg

# Install NVIDIA drivers (if you have GPU)
# Check if you have NVIDIA GPU
lspci | grep -i nvidia

# If yes, install CUDA
# Follow: https://developer.nvidia.com/cuda-downloads

# Clone RVC
cd ~
git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
cd Retrieval-based-Voice-Conversion-WebUI

# Install requirements
pip3 install -r requirements.txt

# Install Flask for API server
pip3 install flask flask-cors
```

### Create API Server

Create `rvc_server.py`:

```python
#!/usr/bin/env python3
"""
RVC Inference Server for Rize Voice
Provides HTTP API for voice conversion
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import base64
import tempfile
import logging
from pathlib import Path

# Import RVC modules (adjust based on RVC structure)
# You may need to modify this based on the actual RVC API
try:
    from vc_infer_pipeline import VC
    from infer_pack.models import SynthesizerTrnMs256NSFsid
    import torch
except ImportError:
    print("Warning: RVC modules not found. Make sure you're in the RVC directory.")

app = Flask(__name__)
CORS(app)

# Configuration
MODEL_PATH = "weights/rize_kamishiro.pth"  # Your trained model
INDEX_PATH = "logs/rize_kamishiro/added_index.index"  # Your index file
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
IS_HALF = True if DEVICE == "cuda" else False

# Initialize RVC model
vc_model = None

def load_model():
    """Load RVC model on startup"""
    global vc_model
    try:
        vc_model = VC(MODEL_PATH, INDEX_PATH, device=DEVICE, is_half=IS_HALF)
        print(f"✓ Model loaded successfully on {DEVICE}")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        vc_model = None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': vc_model is not None,
        'device': DEVICE
    })

@app.route('/convert', methods=['POST'])
def convert():
    """
    Convert audio to Rize's voice

    Request JSON:
    {
        "audio": "base64_encoded_wav",
        "model": "rize_kamishiro",
        "pitch": 0,
        "index_rate": 0.75,
        "filter_radius": 3
    }

    Returns: WAV file
    """
    try:
        if vc_model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        # Parse request
        data = request.json
        audio_b64 = data.get('audio')
        pitch = data.get('pitch', 0)
        index_rate = data.get('index_rate', 0.75)
        filter_radius = data.get('filter_radius', 3)

        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_b64)

        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_input:
            temp_input.write(audio_bytes)
            input_path = temp_input.name

        # Create temp output file
        output_path = tempfile.mktemp(suffix='.wav')

        # Run RVC inference
        vc_model.vc_single(
            sid=0,  # Speaker ID (0 for single-speaker model)
            input_audio_path=input_path,
            f0_up_key=pitch,  # Pitch shift
            f0_file=None,
            f0_method="harvest",  # F0 extraction method
            file_index=INDEX_PATH,
            index_rate=index_rate,
            filter_radius=filter_radius,
            resample_sr=0,
            rms_mix_rate=0.25,
            protect=0.33,
            output_path=output_path
        )

        # Clean up input
        os.unlink(input_path)

        # Return converted audio
        return send_file(
            output_path,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='rize_voice.wav'
        )

    except Exception as e:
        logging.error(f"Conversion error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    return jsonify({
        'models': ['rize_kamishiro'],
        'active_model': 'rize_kamishiro'
    })

if __name__ == '__main__':
    print("Starting RVC Server for Rize Voice...")
    print(f"Device: {DEVICE}")

    # Load model
    load_model()

    # Start server
    app.run(
        host='0.0.0.0',  # Listen on all interfaces
        port=5000,
        debug=False
    )
```

### Copy Your Trained Model

```bash
# On your local machine (where you trained the model)
# Copy model to server
scp ~/rize-voice-training/weights/rize_kamishiro.pth user@your-server:/home/user/Retrieval-based-Voice-Conversion-WebUI/weights/
scp ~/rize-voice-training/logs/rize_kamishiro/added_index.index user@your-server:/home/user/Retrieval-based-Voice-Conversion-WebUI/logs/rize_kamishiro/
```

### Run the Server

```bash
# On your server
cd ~/Retrieval-based-Voice-Conversion-WebUI
python3 rvc_server.py

# Should see:
# Starting RVC Server for Rize Voice...
# Device: cuda (or cpu)
# ✓ Model loaded successfully
# * Running on http://0.0.0.0:5000
```

### Make Server Persistent (systemd)

Create `/etc/systemd/system/rvc-rize.service`:

```ini
[Unit]
Description=RVC Server for Rize Voice
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/Retrieval-based-Voice-Conversion-WebUI
ExecStart=/usr/bin/python3 /home/your-username/Retrieval-based-Voice-Conversion-WebUI/rvc_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable rvc-rize
sudo systemctl start rvc-rize
sudo systemctl status rvc-rize
```

## Part 3: Configure Rize AI

On your main computer, update `.env`:

```bash
# Add RVC server configuration
RVC_SERVER_URL=http://your-server-ip:5000
RVC_MODEL_NAME=rize_kamishiro
RVC_PITCH=0
RVC_INDEX_RATE=0.75
TTS_PROVIDER=rvc  # Use RVC TTS engine
```

## Part 4: Test the Setup

```bash
# Test RVC server health
curl http://your-server-ip:5000/health

# Should return:
# {"status":"ok","model_loaded":true,"device":"cuda"}

# Test voice conversion
# (Create a test WAV file first)
curl -X POST http://your-server-ip:5000/convert \
  -H "Content-Type: application/json" \
  -d '{"audio":"'$(base64 test.wav)'","pitch":0,"index_rate":0.75}' \
  --output rize_test.wav

# Play result
afplay rize_test.wav  # macOS
# or
aplay rize_test.wav   # Linux
```

## Part 5: Firewall Configuration

```bash
# Allow port 5000 on your server
sudo ufw allow 5000/tcp

# Or if using iptables
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

## Part 6: Use in Rize AI

Update `src/index-enhanced.ts` to use RVC TTS:

```typescript
import { RVCTTSEngine } from './audio/rvc-tts-engine.js';

// In RizeEnhancedApp constructor:
if (this.voiceEnabled && process.env.TTS_PROVIDER === 'rvc') {
  this.tts = new RVCTTSEngine({
    rvcServerUrl: process.env.RVC_SERVER_URL,
    rvcModelName: process.env.RVC_MODEL_NAME || 'rize_kamishiro',
    pitch: parseInt(process.env.RVC_PITCH || '0'),
    indexRate: parseFloat(process.env.RVC_INDEX_RATE || '0.75'),
  });
}
```

## Optimization Tips

### For Faster Inference

1. **Use GPU**: MUCH faster (0.5s vs 5s per sentence)
2. **Batch Processing**: Pre-generate common phrases
3. **Model Quantization**: Use ONNX export for faster CPU inference
4. **Caching**: Cache converted audio for repeated phrases

### For Better Quality

1. **Train Longer**: 500+ epochs for best quality
2. **More Training Data**: 10-15 minutes is ideal
3. **Clean Data**: Remove all background noise
4. **Fine-tune Pitch**: Adjust `RVC_PITCH` in .env (-2 to +2 range)
5. **Index Rate**: Try 0.6-0.9 for different character

## Troubleshooting

**Server won't start:**
- Check if port 5000 is available: `sudo netstat -tulpn | grep 5000`
- Check Python version: `python3 --version` (needs 3.8+)
- Check CUDA: `nvidia-smi` (if using GPU)

**Poor voice quality:**
- Increase training epochs
- Adjust `pitch` parameter
- Try different `index_rate` values
- Check training data quality

**Slow inference:**
- Use GPU instead of CPU
- Reduce audio length (split long sentences)
- Use ONNX model export
- Consider pre-generating common phrases

**Connection refused:**
- Check firewall: `sudo ufw status`
- Check server is running: `systemctl status rvc-rize`
- Check server IP is correct
- Try `curl http://localhost:5000/health` on server

## Next Steps

Once working:
1. Fine-tune pitch and index rate for perfect Rize sound
2. Set up HTTPS for secure connection (optional)
3. Add authentication to API (optional)
4. Monitor server performance
5. Set up automatic backups of trained model

---

**Expected Performance:**
- **GPU**: 0.5-2 seconds per sentence
- **CPU**: 5-15 seconds per sentence
- **Quality**: Very close to original Rize voice

**Enjoy talking to Rize in her actual voice!** 🎤
