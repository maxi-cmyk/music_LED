#pragma once

#include <Arduino.h>

#include "../spotify/PlaybackState.h"

struct AudioVisualState;

bool setupBridgeClient();
bool refreshPlayback(PlaybackState* state);
bool reportTelemetry(const AudioVisualState& state);
const char* bridgeError();
