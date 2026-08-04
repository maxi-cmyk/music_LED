#include "OledDisplay.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>

#include "../audio/AudioReactive.h"
#include "../config/PinConfig.h"

namespace {
constexpr int16_t kScreenWidth = 128;
constexpr int16_t kScreenHeight = 64;
constexpr uint8_t kTitleBitmapHeight = 14;
constexpr uint8_t kArtistBitmapHeight = 12;
constexpr uint16_t kMarqueeGap = 24;
constexpr unsigned long kAnimationIntervalMs = 50;
constexpr unsigned long kMarqueeStartHoldMs = 1400;
constexpr unsigned long kMarqueeEndHoldMs = 1000;
constexpr unsigned long kWipeDurationMs = 350;
constexpr unsigned long kDimAfterMs = 60'000;
constexpr unsigned long kSleepAfterMs = 5UL * 60UL * 1000UL;
constexpr int16_t kAvatarLeft = 112;
constexpr int16_t kAvatarTop = 41;
constexpr int16_t kProgressWidth = 108;
constexpr int16_t kTextLeft = 36;
constexpr int16_t kTextWidth = 76;

struct MarqueeState {
  uint16_t offset = 0;
  unsigned long holdUntil = 0;
  bool endHeld = false;
};

// Eight hand-drawn 16x14 frames. Keeping them as bitmap sprites makes the
// figure bolder and more legible than one-pixel procedural stick limbs.
constexpr uint16_t kDancerFrames[8][14] PROGMEM = {
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x2184, 0x1308, 0x0DB0, 0x03C0, 0x0180,
     0x03C0, 0x0660, 0x0C30, 0x1818, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x2100, 0x1380, 0x0F84, 0x0388, 0x0190,
     0x03A0, 0x0660, 0x0C20, 0x1810, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x0084, 0x01C8, 0x01B0, 0x03C0, 0x0780,
     0x0D80, 0x1980, 0x3180, 0x6000, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x2084, 0x11C8, 0x0DB0, 0x03C0, 0x0180,
     0x03C0, 0x0620, 0x0C60, 0x180C, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x1008, 0x0C30, 0x07E0, 0x03C0, 0x0180,
     0x03C0, 0x0660, 0x0C30, 0x1818, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x0084, 0x01C8, 0x21B0, 0x13C0, 0x0980,
     0x05C0, 0x0660, 0x0430, 0x0818, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x2100, 0x1380, 0x0F80, 0x03C0, 0x01E0,
     0x01B0, 0x0198, 0x018C, 0x0006, 0x0000},
    {0x03C0, 0x07E0, 0x03C0, 0x0180, 0x2084, 0x11C8, 0x0DB0, 0x03C0, 0x0180,
     0x03C0, 0x0460, 0x0630, 0x300C, 0x0000},
};

Adafruit_SSD1306 display(kScreenWidth, kScreenHeight, &Wire, -1);
String lastTitle;
String lastArtist;
String lastTrackKey;
MarqueeState titleMarquee;
MarqueeState artistMarquee;
unsigned long lastAnimationMs = 0;
unsigned long wipeStartedAt = 0;
unsigned long celebrateUntil = 0;
unsigned long lastActiveMs = 0;
bool displaySleeping = false;
bool displayDimmed = false;
uint8_t displayOffset = 0;

void drawTruncatedText(const char* text, int16_t x, int16_t y, uint8_t maxCharacters) {
  String value(text ?: "");
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
                    uint16_t offset, int16_t viewportX = 0,
                    int16_t viewportWidth = kScreenWidth) {
  if (bitmap == nullptr || width == 0) return;
  const uint16_t cycleWidth = width > viewportWidth ? width + kMarqueeGap : width;
  for (int16_t screenX = 0; screenX < viewportWidth; ++screenX) {
    uint16_t sourceX = screenX;
    if (width > viewportWidth) {
      sourceX = (offset + screenX) % cycleWidth;
      if (sourceX >= width) continue;
    } else if (sourceX >= width) {
      continue;
    }
    for (uint8_t row = 0; row < height; ++row) {
      if (bitmapPixel(bitmap, width, sourceX, row)) {
        display.drawPixel(viewportX + screenX, y + row, SSD1306_WHITE);
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

void resetMarquee(MarqueeState* marquee, unsigned long now) {
  marquee->offset = 0;
  marquee->holdUntil = now + kMarqueeStartHoldMs;
  marquee->endHeld = false;
}

void updateMarquee(MarqueeState* marquee, uint16_t width, uint16_t viewportWidth,
                    unsigned long now) {
  if (width <= viewportWidth || now < marquee->holdUntil) return;
  const uint16_t endOffset = width - viewportWidth;
  if (marquee->offset < endOffset) {
    ++marquee->offset;
    return;
  }
  if (!marquee->endHeld) {
    marquee->endHeld = true;
    marquee->holdUntil = now + kMarqueeEndHoldMs;
    return;
  }
  ++marquee->offset;
  if (marquee->offset >= width + kMarqueeGap) {
    resetMarquee(marquee, now);
  }
}

void syncTrackState(const PlaybackState& state, unsigned long now) {
  if (lastTitle != state.trackTitle) {
    lastTitle = state.trackTitle;
    resetMarquee(&titleMarquee, now);
  }
  if (lastArtist != state.artistName) {
    lastArtist = state.artistName;
    resetMarquee(&artistMarquee, now);
  }

  String trackKey = state.trackId ?: "";
  if (trackKey.length() == 0 && state.available) {
    trackKey = String(state.trackTitle) + '|' + state.artistName;
  }
  if (trackKey.length() > 0 && trackKey != lastTrackKey) {
    lastTrackKey = trackKey;
    wipeStartedAt = now;
    celebrateUntil = now + 1200UL;
  } else if (!state.available) {
    lastTrackKey = "";
  }
}

void setDisplayOffset(uint8_t offset) {
  if (displayOffset == offset) return;
  display.ssd1306_command(SSD1306_SETDISPLAYOFFSET);
  display.ssd1306_command(offset);
  displayOffset = offset;
}

bool prepareDisplay(bool active, unsigned long now) {
  if (active) lastActiveMs = now;
  const unsigned long idleMs = now - lastActiveMs;
  if (!active && idleMs >= kSleepAfterMs) {
    if (!displaySleeping) {
      display.ssd1306_command(SSD1306_DISPLAYOFF);
      displaySleeping = true;
    }
    return false;
  }
  if (displaySleeping) {
    display.ssd1306_command(SSD1306_DISPLAYON);
    displaySleeping = false;
  }

  const bool shouldDim = !active && idleMs >= kDimAfterMs;
  if (shouldDim != displayDimmed) {
    display.dim(shouldDim);
    displayDimmed = shouldDim;
  }
  setDisplayOffset(shouldDim ? (now / 30'000UL) % 2 : 0);
  return true;
}

void drawSleepingDancer() {
  display.drawCircle(kAvatarLeft + 5, kAvatarTop + 9, 3, SSD1306_WHITE);
  display.drawLine(kAvatarLeft + 8, kAvatarTop + 11, kAvatarLeft + 14, kAvatarTop + 13,
                   SSD1306_WHITE);
  display.drawLine(kAvatarLeft + 11, kAvatarTop + 2, kAvatarLeft + 14, kAvatarTop + 2,
                   SSD1306_WHITE);
  display.drawLine(kAvatarLeft + 12, kAvatarTop + 4, kAvatarLeft + 14, kAvatarTop + 4,
                   SSD1306_WHITE);
}

void drawDancerSprite(uint8_t frame, int16_t y) {
  for (uint8_t row = 0; row < 14; ++row) {
    const uint16_t pixels = pgm_read_word(&kDancerFrames[frame][row]);
    for (uint8_t column = 0; column < 16; ++column) {
      if (pixels & (0x8000 >> column)) {
        display.drawPixel(kAvatarLeft + column, y + row, SSD1306_WHITE);
      }
    }
  }
}

void drawDancer(bool playbackActive, unsigned long now) {
  const AudioVisualState& audio = audioVisualState();
  if (!playbackActive || !audio.active) {
    drawSleepingDancer();
    return;
  }
  const uint16_t frameMs = max(audio.dancerFrameMs, static_cast<uint16_t>(45));
  uint8_t danceFrame = 0;
  if (now < celebrateUntil) {
    danceFrame = (now / 55UL) % 8;
  } else if (audio.bpm >= 140) {
    const uint8_t headbangFrames[] = {1, 5, 1, 7};
    danceFrame = headbangFrames[(now / frameMs + audio.beatCount) % 4];
  } else if (audio.bpm > 0 && audio.bpm <= 95) {
    const uint8_t swayFrames[] = {2, 3, 6, 7};
    danceFrame = swayFrames[(now / (frameMs + 45UL)) % 4];
  } else {
    danceFrame = (now / frameMs + audio.beatCount) % 8;
  }
  const float intensity = max(0.5f, audio.dancerIntensity / 128.0f);
  const int16_t hop = constrain(
      static_cast<int16_t>((audio.beatStrength / 96 + (danceFrame % 2)) * intensity), 0, 5);
  drawDancerSprite(danceFrame, kAvatarTop - hop);
  if (audio.treble > 150 || now < celebrateUntil) {
    display.drawPixel(kAvatarLeft, kAvatarTop, SSD1306_WHITE);
    display.drawPixel(kAvatarLeft + 15, kAvatarTop + 4, SSD1306_WHITE);
  }
}

void drawProgress(const PlaybackState& state, unsigned long displayedElapsed, unsigned long now) {
  const int progress = state.durationMs == 0
                           ? 0
                           : constrain(static_cast<int>((static_cast<uint64_t>(displayedElapsed) *
                                                         (kProgressWidth - 2)) /
                                                        state.durationMs),
                                       0, kProgressWidth - 2);
  const uint8_t pulse = state.isPlaying ? audioVisualState().beatStrength / 100 : 0;
  const int16_t top = 51 - min(pulse, static_cast<uint8_t>(1));
  const int16_t height = 9 + min(pulse, static_cast<uint8_t>(1)) * 2;
  display.drawRect(0, top, kProgressWidth, height, SSD1306_WHITE);
  display.fillRect(1, top + 1, progress, height - 2, SSD1306_WHITE);
  drawDancer(state.isPlaying, now);
}

void drawAlbumPlaceholder() {
  display.drawRect(0, 0, 32, 32, SSD1306_WHITE);
  display.drawCircle(8, 23, 4, SSD1306_WHITE);
  display.drawCircle(22, 18, 4, SSD1306_WHITE);
  display.drawLine(12, 22, 12, 8, SSD1306_WHITE);
  display.drawLine(26, 17, 26, 4, SSD1306_WHITE);
  display.drawLine(12, 8, 26, 4, SSD1306_WHITE);
}

void drawNothingPlaying() {
  display.drawCircle(12, 26, 6, SSD1306_WHITE);
  display.drawLine(18, 25, 18, 7, SSD1306_WHITE);
  display.drawLine(18, 7, 29, 4, SSD1306_WHITE);
  display.setCursor(38, 10);
  display.print(F("NOTHING"));
  display.setCursor(38, 20);
  display.print(F("PLAYING"));
  display.setCursor(19, 45);
  display.print(F("Open Spotify"));
}

void drawPlaybackDashboard(const PlaybackState& state, unsigned long displayedElapsed,
                           unsigned long now) {
  if (state.albumArtBitmap != nullptr) {
    display.drawBitmap(0, 0, state.albumArtBitmap, state.albumArtWidth, state.albumArtHeight,
                       SSD1306_WHITE);
  } else {
    drawAlbumPlaceholder();
  }
  display.drawFastVLine(34, 0, 40, SSD1306_WHITE);
  if (state.trackTitleBitmap != nullptr) {
    drawBitmapLine(state.trackTitleBitmap, state.trackTitleBitmapWidth, kTitleBitmapHeight, 0,
                   titleMarquee.offset, kTextLeft, kTextWidth);
  } else {
    drawTruncatedText(state.trackTitle, kTextLeft, 0, 12);
  }
  if (state.artistNameBitmap != nullptr) {
    drawBitmapLine(state.artistNameBitmap, state.artistNameBitmapWidth, kArtistBitmapHeight, 15,
                   artistMarquee.offset, kTextLeft, kTextWidth);
  } else {
    drawTruncatedText(state.artistName, kTextLeft, 15, 12);
  }
  display.setCursor(kTextLeft, 29);
  display.print(state.isPlaying ? F(">") : F("||"));
  drawTime(displayedElapsed);
  display.print('/');
  drawTime(state.durationMs);
  drawProgress(state, displayedElapsed, now);
}
}  // namespace

bool setupOled() {
  Wire.begin(pins::kOledSda, pins::kOledScl);
  Wire.setClock(400000);
  if (!display.begin(SSD1306_SWITCHCAPVCC, pins::kOledI2cAddress)) return false;

  lastActiveMs = millis();
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

void renderConnectionStatus(const char* detail) {
  const unsigned long now = millis();
  if (now - lastAnimationMs < kAnimationIntervalMs || !prepareDisplay(false, now)) return;
  lastAnimationMs = now;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(19, 5);
  display.print(F("RECONNECTING"));
  const uint8_t spinner = (now / 180UL) % 4;
  const int8_t x[] = {5, 10, 5, 0};
  const int8_t y[] = {0, 5, 10, 5};
  display.fillCircle(59 + x[spinner], 24 + y[spinner], 2, SSD1306_WHITE);
  drawTruncatedText(detail && detail[0] ? detail : "Starting Wi-Fi", 0, 42, 21);
  display.setCursor(0, 54);
  display.print(F("Retrying automatically"));
  display.display();
}

void renderPlayback(const PlaybackState& state) {
  const unsigned long now = millis();
  if (now - lastAnimationMs < kAnimationIntervalMs || !prepareDisplay(state.isPlaying, now)) {
    return;
  }
  lastAnimationMs = now;
  syncTrackState(state, now);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  unsigned long displayedElapsed = state.elapsedMs;
  if (state.isPlaying) displayedElapsed += now - state.syncedAtMs;
  displayedElapsed = min(displayedElapsed, state.durationMs);

  if (!state.available) {
    drawNothingPlaying();
  } else {
    drawPlaybackDashboard(state, displayedElapsed, now);
  }

  if (state.available && now >= wipeStartedAt && now - wipeStartedAt < kWipeDurationMs) {
    const int16_t revealed =
        static_cast<int16_t>((now - wipeStartedAt) * kScreenWidth / kWipeDurationMs);
    display.fillRect(revealed, 0, kScreenWidth - revealed, kScreenHeight, SSD1306_BLACK);
  }
  display.display();

  if (state.available) {
    updateMarquee(&titleMarquee, state.trackTitleBitmapWidth, kTextWidth, now);
    updateMarquee(&artistMarquee, state.artistNameBitmapWidth, kTextWidth, now);
  }
}
