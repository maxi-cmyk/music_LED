#pragma once

#include <Arduino.h>

#include "../spotify/PlaybackState.h"

bool setupBridgeClient();
bool refreshPlayback(PlaybackState* state);
const char* bridgeError();
