#include "OledDisplay.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>

#include "../config/PinConfig.h"

namespace {
constexpr int kScreenWidth = 128;
constexpr int kScreenHeight = 64;
Adafruit_SSD1306 display(kScreenWidth, kScreenHeight, &Wire, -1);

void drawTruncatedText(const char* text, int16_t x, int16_t y, uint8_t maxCharacters) {
  String value(text);
  if (value.length() > maxCharacters) {
    value = value.substring(0, maxCharacters - 3) + "...";
  }
  display.setCursor(x, y);
  display.print(value);
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

  drawTruncatedText(state.trackTitle, 0, 0, 21);
  drawTruncatedText(state.artistName, 0, 12, 21);

  display.setCursor(0, 27);
  display.print(state.isPlaying ? F("> ") : F("|| "));
  display.print(state.elapsedMs / 1000);
  display.print('/');
  display.print(state.durationMs / 1000);
  display.print(F(" s"));

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
