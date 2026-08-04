#include "src/config/NetworkConfig.h"
#include "src/display/OledDisplay.h"
#include "src/status/StatusLed.h"

namespace {
const PlaybackState kSetupState = {
    "Spotify bridge pending",
    "Add Wi-Fi and bridge URL",
    0,
    1,
    0,
    false,
};

unsigned long lastDisplayRefresh = 0;
constexpr unsigned long kDisplayRefreshMs = 1000;
}

void setup() {
  Serial.begin(115200);
  setupStatusLed();

  if (!setupOled()) {
    setStatusLed(255, 0, 0);
    Serial.println("OLED not found. Check SDA, SCL, power, and I2C address.");
    return;
  }

  if (kNetworkConfigured) {
    setStatusLed(0, 120, 0);
  } else {
    setStatusLed(120, 50, 0);
  }
  renderPlayback(kSetupState);
}

void loop() {
  if (millis() - lastDisplayRefresh < kDisplayRefreshMs) {
    return;
  }
  lastDisplayRefresh = millis();

  // The Spotify bridge client will replace this setup state once credentials exist.
  renderPlayback(kSetupState);
}
