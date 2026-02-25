struct AudioFrame {
  int amplitude;      // volume Spike (Max - Min)
  int freqCount;      // Pitch 
};

// --- 2. CONFIGURATION ---
#define MIC_PIN A0
#define SAMPLE_WINDOW 50   
#define NOISE_FLOOR 4       
#define CENTER_VOLTAGE 520 


#define RGB_R 9
#define RGB_G 10
#define RGB_B 11

float beatThreshold = 10.0;     // min to detect beat
float decayRate = 0.95;         // how fast the tripwire falls (0.90 = Fast, 0.99 = Slow)
int currentLed = 0;             // [0,3]
unsigned long lastBeatTime = 0; // prevent "double triggering"

void setup() {
  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);

  DDRD |= 0xF0; 

//debug
//   Serial.begin(9600);
//   Serial.println("System Ready");
// }

void loop() {
  AudioFrame currentFrame = sampleAudio();
  processAudio(currentFrame);
}

AudioFrame sampleAudio() {
  AudioFrame frame = {0, 0}; 
  
  unsigned long startMillis = millis();
  int maxVal = 0;
  int minVal = 1023;
  
  bool prevHighFreq = false;
  int crossings = 0;

  while (millis() - startMillis < SAMPLE_WINDOW) {
    int sample = analogRead(MIC_PIN);

    //volume
    if (sample > maxVal) maxVal = sample;
    if (sample < minVal) minVal = sample;

    //pitch
    bool isHigh = (sample > (CENTER_VOLTAGE + 10));
    
    if (isHigh && !prevHighFreq) {
      crossings++;
    }
    prevHighFreq = isHigh;
  }

  frame.amplitude = maxVal - minVal;
  frame.freqCount = crossings;
  
  return frame;
}

void processAudio(AudioFrame input) {
  bool isBeat = false;
  
  // check if volume spiked ABOVE dynamic threshold
  if (input.amplitude > beatThreshold && (millis() - lastBeatTime > 100)) {
    isBeat = true;
    lastBeatTime = millis();
    currentLed++; 
    
    if (currentLed > 3) currentLed = 0; //loop
    
    //change min to curr volume to prevent double 
    beatThreshold = input.amplitude; 
  } else {
    //lower the tripwire to catch the next beat
    beatThreshold = beatThreshold * decayRate;
    
    
    if (beatThreshold < NOISE_FLOOR + 2) beatThreshold = NOISE_FLOOR + 2;
  }

  //change which LED lights up based on beat 
  byte portState = PORTD & 0x0F; 
  portState |= (1 << (4 + currentLed)); 
  PORTD = portState;

  static float brightness = 0;
  if (isBeat) {
    brightness = 255; // Sudden flash
  } else {
    brightness *= 0.8; // Smooth fade
  }

  //RGB Color based on frequency
  int colorPos = map(constrain(input.freqCount, 0, 15), 0, 15, 0, 255);
  int r = 0, g = 0, b = 0;
  
  if (colorPos < 85) {
    r = 255 - colorPos * 3; g = colorPos * 3;
  } else if (colorPos < 170) {
    colorPos -= 85; g = 255 - colorPos * 3; b = colorPos * 3;
  } else {
    colorPos -= 170; b = 255 - colorPos * 3; r = colorPos * 3;
  }
  
  analogWrite(RGB_R, (int)(r * brightness / 255));
  analogWrite(RGB_G, (int)(g * brightness / 255));
  analogWrite(RGB_B, (int)(b * brightness / 255));
}

//debug
// void setup() {
//   Serial.begin(9600);
// }

// void loop() {
//   // Read the raw value
//   int val = analogRead(A0);
  
//   // Print it for the Serial Plotter
//   Serial.println(val);
  
//   // Fast sampling for smooth graph
//   delay(10); 
// }
