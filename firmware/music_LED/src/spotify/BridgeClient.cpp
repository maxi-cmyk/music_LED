#include "BridgeClient.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "../config/NetworkConfig.h"

namespace {
String title;
String artist;
String lastError;
constexpr unsigned long kWifiTimeoutMs = 15'000;

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(MUSIC_LED_WIFI_SSID, MUSIC_LED_WIFI_PASSWORD);
  const unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < kWifiTimeoutMs) delay(250);
  if (WiFi.status() != WL_CONNECTED) {
    lastError = "Wi-Fi unavailable";
    return false;
  }
  return true;
}
}  // namespace

bool setupBridgeClient() {
  if (!kNetworkConfigured) {
    lastError = "Add Secrets.h";
    return false;
  }
  return connectWifi();
}

bool refreshPlayback(PlaybackState* state) {
  if (!kNetworkConfigured || !connectWifi()) return false;

  HTTPClient request;
  request.begin(MUSIC_LED_BRIDGE_URL);
  request.addHeader("X-Bridge-Key", MUSIC_LED_BRIDGE_KEY);
  const int status = request.GET();
  if (status != HTTP_CODE_OK) {
    lastError = "Bridge HTTP " + String(status);
    request.end();
    return false;
  }

  // Let HTTPClient decode transfer framing (including chunked responses)
  // before ArduinoJson parses the payload.
  const String responseBody = request.getString();
  request.end();

  JsonDocument document;
  const DeserializationError parseError = deserializeJson(document, responseBody);
  if (parseError) {
    lastError = "Bridge JSON: " + String(parseError.c_str());
    return false;
  }

  title = document["title"].as<const char*>() ?: "Unknown track";
  artist = document["artist"].as<const char*>() ?: "Unknown artist";
  state->trackTitle = title.c_str();
  state->artistName = artist.c_str();
  state->elapsedMs = document["progressMs"] | 0UL;
  state->durationMs = document["durationMs"] | 1UL;
  state->volumePercent = document["volumePercent"] | 0;
  state->isPlaying = document["isPlaying"] | false;
  lastError = "";
  return true;
}

const char* bridgeError() { return lastError.c_str(); }
