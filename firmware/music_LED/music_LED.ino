#include "src/audio/AudioReactive.h"
#include "src/demo/FourierDiagnostics.h"
#include "src/lighting/RgbLedOutput.h"

namespace {
constexpr uint32_t SERIAL_BAUD_RATE = 115200;
constexpr uint32_t STARTUP_DELAY_MILLISECONDS = 300;
} // namespace

void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    delay(STARTUP_DELAY_MILLISECONDS);
    setup_rgb_led_output();
    run_rgb_led_self_test();
    print_startup_fourier_diagnostics();
    setup_audio_reactive();
    Serial.println("Microphone-to-RGB frequency demo ready.");
}

void loop() {
    update_audio_reactive();
}
