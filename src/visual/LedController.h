#pragma once

#include "BeatDetector.h"

void setupLedOutputs();
void renderLeds(const BeatState& beatState, int frequencyCrossings);
