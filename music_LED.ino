#include "src/audio/AudioSampler.h"
#include "src/visual/BeatDetector.h"
#include "src/visual/LedController.h"

namespace {
BeatDetector beatDetector;
}

void setup() {
  setupLedOutputs();
}

void loop() {
  const AudioFrame frame = sampleAudio();
  const BeatState beatState = beatDetector.update(frame, millis());
  renderLeds(beatState, frame.frequencyCrossings);
}
