#pragma once

#include "../spotify/PlaybackState.h"

bool setupOled();
void showOledError(const char* message);
void renderPlayback(const PlaybackState& state);
