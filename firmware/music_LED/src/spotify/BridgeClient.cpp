#include "BridgeClient.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "../config/NetworkConfig.h"

namespace {
String title;
String artist;
String trackId;
String lastError;
constexpr uint16_t kMaxTextBitmapWidth = 2048;
constexpr uint8_t kTitleBitmapHeight = 14;
constexpr uint8_t kArtistBitmapHeight = 12;
constexpr size_t kTitleBitmapCapacity = kMaxTextBitmapWidth * kTitleBitmapHeight / 8;
constexpr size_t kArtistBitmapCapacity = kMaxTextBitmapWidth * kArtistBitmapHeight / 8;
uint8_t titleBitmap[kTitleBitmapCapacity];
uint8_t artistBitmap[kArtistBitmapCapacity];
constexpr uint8_t kAlbumArtWidth = 32;
constexpr uint8_t kAlbumArtHeight = 32;
uint8_t albumArtBitmap[kAlbumArtWidth * kAlbumArtHeight / 8];
constexpr unsigned long kWifiTimeoutMs = 15'000;

int hexValue(char value) {
  if (value >= '0' && value <= '9') return value - '0';
  if (value >= 'a' && value <= 'f') return value - 'a' + 10;
  if (value >= 'A' && value <= 'F') return value - 'A' + 10;
  return -1;
}

bool decodeBitmap(JsonVariantConst value, uint16_t width, uint8_t height, uint8_t* output,
                  size_t outputCapacity) {
  const char* encoded = value.as<const char*>();
  if (width == 0 || width > kMaxTextBitmapWidth || width % 8 != 0) return false;
  const size_t bitmapBytes = static_cast<size_t>(width) * height / 8;
  if (bitmapBytes > outputCapacity || encoded == nullptr || strlen(encoded) != bitmapBytes * 2) {
    return false;
  }
  for (size_t index = 0; index < bitmapBytes; ++index) {
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
  trackId = document["trackId"].as<const char*>() ?: "";
  state->trackId = trackId.c_str();
  state->trackTitle = title.c_str();
  state->artistName = artist.c_str();
  const uint16_t titleWidth = document["titleBitmapWidth"] | 0;
  const uint16_t artistWidth = document["artistBitmapWidth"] | 0;
  const bool titleReady = decodeBitmap(document["titleBitmap"], titleWidth, kTitleBitmapHeight,
                                       titleBitmap, sizeof(titleBitmap));
  const bool artistReady = decodeBitmap(document["artistBitmap"], artistWidth, kArtistBitmapHeight,
                                        artistBitmap, sizeof(artistBitmap));
  state->trackTitleBitmap = titleReady ? titleBitmap : nullptr;
  state->trackTitleBitmapWidth = titleReady ? titleWidth : 0;
  state->artistNameBitmap = artistReady ? artistBitmap : nullptr;
  state->artistNameBitmapWidth = artistReady ? artistWidth : 0;
  const uint8_t albumWidth = document["albumArtWidth"] | 0;
  const uint8_t albumHeight = document["albumArtHeight"] | 0;
  const bool albumReady =
      albumWidth == kAlbumArtWidth && albumHeight == kAlbumArtHeight &&
      decodeBitmap(document["albumArtBitmap"], albumWidth, albumHeight, albumArtBitmap,
                   sizeof(albumArtBitmap));
  state->albumArtBitmap = albumReady ? albumArtBitmap : nullptr;
  state->albumArtWidth = albumReady ? albumWidth : 0;
  state->albumArtHeight = albumReady ? albumHeight : 0;
  state->elapsedMs = document["progressMs"] | 0UL;
  state->durationMs = document["durationMs"] | 1UL;
  state->syncedAtMs = millis();
  state->available = document["available"] | false;
  state->isPlaying = document["isPlaying"] | false;
  lastError = "";
  return true;
}

const char* bridgeError() { return lastError.c_str(); }
