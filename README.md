# 🎵 Audio Reactive LED System

![Arduino](https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=Arduino&logoColor=white)
![C++](https://img.shields.io/badge/C%2B%2B-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)
![Hardware](https://img.shields.io/badge/Hardware-ESP32%2FArduino-181717?style=for-the-badge&logo=espressif&logoColor=white)

> An adaptive audio-visualizer that maps sound amplitude to brightness and frequency to colour using real-time signal processing.

<div align="center">
  <img src="./assets/demo.gif" width="600" alt="LED Demo" />
</div>

## 💡 How It Works
Unlike simple "sound sensors" that trigger on a fixed volume, this project uses a **Dynamic Threshold Algorithm** to detect beats accurately, even as the volume of the music changes.

### The Algorithm: Adaptive Beat Detection
The system samples audio in `50ms` windows (frames). It processes each frame through two distinct pipelines:

1.  **Amplitude (Beat Detection):**
    * Calculates the "Spike" ($V_{max} - V_{min}$).
    * Uses a **Decaying Threshold**: The trigger point jumps up when a beat is hit, then decays by a factor of `0.95` every cycle.
    * *Result:* The lights flash on the *kick drum* but don't stay stuck "on" during loud sections.

2.  **Frequency (Colour Mapping):**
    * Uses **Zero-Crossing Rate (ZCR)** analysis to estimate pitch.
    * Maps low frequencies (Bass) to Red/Green and high frequencies (Treble) to Blue/Purple.

## 🛠️ Hardware Setup

| Component | Pin Connection | Notes |
| :--- | :--- | :--- |
| **Microphone** | `A0` | Analog Output (KY-037 or Max4466) |
| **RGB LED - Red** | `Pin 9` | PWM Pin |
| **RGB LED - Green** | `Pin 10` | PWM Pin |
| **RGB LED - Blue** | `Pin 11` | PWM Pin |
| **Beat LEDs** | `Pins 4, 5, 6, 7` | Controlled via Port Manipulation (`PORTD`) |

## 🧩 Key Code Snippets

### The Audio Frame Struct
I organised the raw data into a structured frame to keep the signal processing clean:

```cpp
struct AudioFrame {
  int amplitude;      // Volume Spike (Max - Min)
  int freqCount;      // Pitch (Zero Crossings)
};
