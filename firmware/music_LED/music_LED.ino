#include "src/audio/AudioReactive.h"
#include "src/config/NetworkConfig.h"
#include "src/display/OledDisplay.h"
#include "src/spotify/BridgeClient.h"
#include "src/status/StatusLed.h"

namespace {
const PlaybackState kSetupState = {
    "",          "Spotify bridge pending", "Add Wi-Fi and bridge URL", nullptr, 0,
    nullptr,     0,                         nullptr,                   0,       0,
    0,           1,                         0,                         false,   false};
PlaybackState playbackState = kSetupState;
unsigned long lastBridgeRefresh = 0;
constexpr unsigned long kBridgeRefreshMs = 2000;
bool bridgeHealthy = false;
bool playbackStateLogged = false;
bool lastLoggedPlaying = false;
unsigned long lastPlaybackLog = 0;
bool oledReady = false;
}

void setup() {
  Serial.begin(115200);
  setupStatusLed();
  setupAudioReactive();
  oledReady = setupOled();
  if (!oledReady) {
    setStatusLed(255, 0, 0);
    Serial.println("OLED not found. Check SDA, SCL, power, and I2C address.");
    return;
  }
  if (!setupBridgeClient()) {
    setStatusLed(120, 50, 0);
    renderConnectionStatus(bridgeError());
    return;
  }
  stopAudioReactive();
}

void loop() {
  if (!oledReady) {
    delay(1000);
    return;
  }
  updateAudioReactive(bridgeHealthy && playbackState.isPlaying);
  if (bridgeHealthy) {
    renderPlayback(playbackState);
  } else {
    renderConnectionStatus(bridgeError());
  }
  if (millis() - lastBridgeRefresh < kBridgeRefreshMs) return;
  lastBridgeRefresh = millis();
  if (refreshPlayback(&playbackState)) {
    bridgeHealthy = true;
    if (!playbackStateLogged || playbackState.isPlaying != lastLoggedPlaying ||
        millis() - lastPlaybackLog >= 10000UL) {
      Serial.print("Playback sync: ");
      Serial.print(playbackState.isPlaying ? "playing" : "paused");
      Serial.print(", Unicode bitmaps: ");
      const bool bitmapsReady =
          playbackState.trackTitleBitmap != nullptr && playbackState.artistNameBitmap != nullptr;
      Serial.println(bitmapsReady ? "ready" : "missing");
      playbackStateLogged = true;
      lastLoggedPlaying = playbackState.isPlaying;
      lastPlaybackLog = millis();
    }
    if (!playbackState.isPlaying) stopAudioReactive();
  } else {
    bridgeHealthy = false;
    stopAudioReactive();
    Serial.print("Bridge error: ");
    Serial.println(bridgeError());
    setStatusLed(120, 50, 0);
  }
}
