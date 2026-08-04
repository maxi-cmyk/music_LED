#include "OledDisplay.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>

#include "../config/PinConfig.h"

namespace {
constexpr int16_t kScreenWidth = 128;
constexpr int16_t kScreenHeight = 64;
constexpr uint8_t kTitleBitmapHeight = 14;
constexpr uint8_t kArtistBitmapHeight = 12;
constexpr uint16_t kMarqueeGap = 24;
constexpr unsigned long kAnimationIntervalMs = 50;
Adafruit_SSD1306 display(kScreenWidth, kScreenHeight, &Wire, -1);
String lastTitle;
String lastArtist;
uint16_t titleOffset = 0;
uint16_t artistOffset = 0;
unsigned long lastAnimationMs = 0;

void drawTruncatedText(const char* text, int16_t x, int16_t y, uint8_t maxCharacters) {
  String value(text);
  if (value.length() > maxCharacters) {
    value = value.substring(0, maxCharacters - 3) + "...";
  }
  display.setCursor(x, y);
  display.print(value);
}

bool bitmapPixel(const uint8_t* bitmap, uint16_t width, uint16_t x, uint8_t y) {
  const size_t byteIndex = static_cast<size_t>(y) * (width / 8) + x / 8;
  return (bitmap[byteIndex] & (0x80 >> (x % 8))) != 0;
}

void drawBitmapLine(const uint8_t* bitmap, uint16_t width, uint8_t height, int16_t y,
                    uint16_t offset) {
  if (bitmap == nullptr || width == 0) return;
  const uint16_t cycleWidth = width > kScreenWidth ? width + kMarqueeGap : width;
  for (int16_t screenX = 0; screenX < kScreenWidth; ++screenX) {
    uint16_t sourceX = screenX;
    if (width > kScreenWidth) {
      sourceX = (offset + screenX) % cycleWidth;
      if (sourceX >= width) continue;
    } else if (sourceX >= width) {
      continue;
    }
    for (uint8_t row = 0; row < height; ++row) {
      if (bitmapPixel(bitmap, width, sourceX, row)) {
        display.drawPixel(screenX, y + row, SSD1306_WHITE);
      }
    }
  }
}

void drawTime(unsigned long milliseconds) {
  const unsigned long totalSeconds = milliseconds / 1000UL;
  const unsigned long minutes = totalSeconds / 60UL;
  const unsigned long seconds = totalSeconds % 60UL;
  display.print(minutes);
  display.print(':');
  if (seconds < 10) display.print('0');
  display.print(seconds);
}

void resetMarqueeIfTextChanged(const PlaybackState& state) {
  if (lastTitle != state.trackTitle) {
    lastTitle = state.trackTitle;
    titleOffset = 0;
  }
  if (lastArtist != state.artistName) {
    lastArtist = state.artistName;
    artistOffset = 0;
  }
}
}  // namespace

bool setupOled() {
  Wire.begin(pins::kOledSda, pins::kOledScl);
  Wire.setClock(400000);
  if (!display.begin(SSD1306_SWITCHCAPVCC, pins::kOledI2cAddress)) {
    return false;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("Spotify display"));
  display.println(F("OLED connected"));
  display.display();
  return true;
}

void showOledError(const char* message) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("Display error"));
  display.println(message);
  display.display();
}

void renderPlayback(const PlaybackState& state) {
  const unsigned long now = millis();
  if (now - lastAnimationMs < kAnimationIntervalMs) return;
  lastAnimationMs = now;
  resetMarqueeIfTextChanged(state);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  if (state.trackTitleBitmap != nullptr) {
    drawBitmapLine(state.trackTitleBitmap, state.trackTitleBitmapWidth, kTitleBitmapHeight, 0,
                   titleOffset);
  } else {
    drawTruncatedText(state.trackTitle, 0, 0, 21);
  }
  if (state.artistNameBitmap != nullptr) {
    drawBitmapLine(state.artistNameBitmap, state.artistNameBitmapWidth, kArtistBitmapHeight, 15,
                   artistOffset);
  } else {
    drawTruncatedText(state.artistName, 0, 15, 21);
  }

  unsigned long displayedElapsed = state.elapsedMs;
  if (state.isPlaying) displayedElapsed += now - state.syncedAtMs;
  displayedElapsed = min(displayedElapsed, state.durationMs);
  display.setCursor(0, 30);
  display.print(state.isPlaying ? F("> ") : F("|| "));
  drawTime(displayedElapsed);
  display.print('/');
  drawTime(state.durationMs);

  const int progress = state.durationMs == 0
                           ? 0
                           : constrain(static_cast<int>((static_cast<uint64_t>(displayedElapsed) *
                                                         126ULL) /
                                                        state.durationMs),
                                       0, 126);
  display.drawRect(0, 45, 128, 10, SSD1306_WHITE);
  display.fillRect(1, 46, progress, 8, SSD1306_WHITE);
  display.display();

  if (state.trackTitleBitmapWidth > kScreenWidth) {
    titleOffset = (titleOffset + 1) % (state.trackTitleBitmapWidth + kMarqueeGap);
  }
  if (state.artistNameBitmapWidth > kScreenWidth) {
    artistOffset = (artistOffset + 1) % (state.artistNameBitmapWidth + kMarqueeGap);
  }
}
