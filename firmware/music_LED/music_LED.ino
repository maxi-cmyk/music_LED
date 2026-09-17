#include "src/audio/AudioReactive.h"
#include "src/status/StatusLed.h"

void setup() {
  Serial.begin(115200);
  setupStatusLed();
  setupAudioReactive();
  Serial.println("Microphone-to-RGB frequency demo ready.");
}

void loop() {
  updateAudioReactive();
}
