#include "src/audio/AudioReactive.h"
#include "src/demo/FourierDiagnostics.h"
#include "src/lighting/RgbLedOutput.h"

void setup() {
  Serial.begin(115200);
  delay(300);
  setupRgbLedOutput();
  runRgbLedSelfTest();
  printStartupFourierDiagnostics();
  setupAudioReactive();
  Serial.println("Microphone-to-RGB frequency demo ready.");
}

void loop() { updateAudioReactive(); }
