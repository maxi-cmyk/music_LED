#include "OledDisplay.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>

#include "../config/PinConfig.h"

namespace {
constexpr int kScreenWidth = 128;
constexpr int kScreenHeight = 64;
constexpr int kTextBitmapWidth = 128;
constexpr int kTextBitmapHeight = 14;
Adafruit_SSD1306 display(kScreenWidth, kScreenHeight, &Wire, -1);

void drawTruncatedText(const char* text, int16_t x, int16_t y, uint8_t maxCharacters) {
  String value(text);
  if (value.length() > maxCharacters) {
    value = value.substring(0, maxCharacters - 3) + "...";
  }
  display.setCursor(x, y);
  display.print(value);
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
}  // namespace

bool setupOled() {
  Wire.begin(pins::kOledSda, pins::kOledScl);
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
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  if (state.trackTitleBitmap != nullptr) {
    display.drawBitmap(0, 0, state.trackTitleBitmap, kTextBitmapWidth, kTextBitmapHeight, SSD1306_WHITE);
  } else {
    drawTruncatedText(state.trackTitle, 0, 0, 21);
  }
  if (state.artistNameBitmap != nullptr) {
    display.drawBitmap(0, 14, state.artistNameBitmap, kTextBitmapWidth, kTextBitmapHeight, SSD1306_WHITE);
  } else {
    drawTruncatedText(state.artistName, 0, 14, 21);
  }

  display.setCursor(0, 29);
  display.print(state.isPlaying ? F("> ") : F("|| "));
  drawTime(state.elapsedMs);
  display.print('/');
  drawTime(state.durationMs);

  const int progress = state.durationMs == 0
                           ? 0
                           : constrain(static_cast<int>((state.elapsedMs * 126UL) / state.durationMs), 0, 126);
  display.drawRect(0, 42, 128, 8, SSD1306_WHITE);
  display.fillRect(1, 43, progress, 6, SSD1306_WHITE);

  display.setCursor(0, 55);
  display.print(F("VOL "));
  display.print(state.volumePercent);
  display.print('%');
  display.display();
}
