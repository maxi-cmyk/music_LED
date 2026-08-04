#include "src/config/NetworkConfig.h"
#include "src/display/OledDisplay.h"
#include "src/spotify/BridgeClient.h"
#include "src/status/StatusLed.h"

namespace {
const PlaybackState kSetupState = {"Spotify bridge pending", "Add Wi-Fi and bridge URL", 0, 1, 0, false};
PlaybackState playbackState = kSetupState;
unsigned long lastDisplayRefresh = 0;
constexpr unsigned long kDisplayRefreshMs = 2000;
}

void setup() {
  Serial.begin(115200);
  setupStatusLed();
  if (!setupOled()) {
    setStatusLed(255, 0, 0);
    Serial.println("OLED not found. Check SDA, SCL, power, and I2C address.");
    return;
  }
  if (!setupBridgeClient()) {
    setStatusLed(120, 50, 0);
    renderPlayback(kSetupState);
    return;
  }
  setStatusLed(0, 120, 0);
}

void loop() {
  if (millis() - lastDisplayRefresh < kDisplayRefreshMs) return;
  lastDisplayRefresh = millis();
  if (refreshPlayback(&playbackState)) {
    setStatusLed(0, 120, 0);
    renderPlayback(playbackState);
  } else {
    Serial.print("Bridge error: ");
    Serial.println(bridgeError());
    setStatusLed(120, 50, 0);
    renderPlayback(kSetupState);
  }
}
