#include "BridgeClient.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "../config/NetworkConfig.h"

namespace {
String title;
String artist;
String lastError;
constexpr size_t kTextBitmapBytes = 128 * 14 / 8;
uint8_t titleBitmap[kTextBitmapBytes];
uint8_t artistBitmap[kTextBitmapBytes];
constexpr unsigned long kWifiTimeoutMs = 15'000;

int hexValue(char value) {
  if (value >= '0' && value <= '9') return value - '0';
  if (value >= 'a' && value <= 'f') return value - 'a' + 10;
  if (value >= 'A' && value <= 'F') return value - 'A' + 10;
  return -1;
}

bool decodeBitmap(JsonVariantConst value, uint8_t* output) {
  const char* encoded = value.as<const char*>();
  if (encoded == nullptr || strlen(encoded) != kTextBitmapBytes * 2) return false;
  for (size_t index = 0; index < kTextBitmapBytes; ++index) {
    const int high = hexValue(encoded[index * 2]);
    const int low = hexValue(encoded[index * 2 + 1]);
    if (high < 0 || low < 0) return false;
    output[index] = static_cast<uint8_t>((high << 4) | low);
  }
  return true;
}

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
  state->trackTitleBitmap = decodeBitmap(document["titleBitmap"], titleBitmap) ? titleBitmap : nullptr;
  state->artistNameBitmap = decodeBitmap(document["artistBitmap"], artistBitmap) ? artistBitmap : nullptr;
  state->elapsedMs = document["progressMs"] | 0UL;
  state->durationMs = document["durationMs"] | 1UL;
  state->volumePercent = document["volumePercent"] | 0;
  state->isPlaying = document["isPlaying"] | false;
  lastError = "";
  return true;
}

const char* bridgeError() { return lastError.c_str(); }
