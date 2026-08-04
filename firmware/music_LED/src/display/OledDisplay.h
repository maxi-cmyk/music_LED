#pragma once

#include "../spotify/PlaybackState.h"

bool setupOled();
void showOledError(const char* message);
void renderConnectionStatus(const char* detail);
void renderPlayback(const PlaybackState& state);
