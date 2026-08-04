#pragma once

struct AudioFrame {
  int amplitude;
  int frequencyCrossings;
};

AudioFrame sampleAudio();
