#include "AudioReactive.h"

#include <Arduino.h>
#include <string.h>

#include "../config/AudioConfig.h"
#include "../config/FourierConfig.h"
#include "../demo/FourierDiagnostics.h"
#include "../fourier/FastFourierTransform.h"
#include "../fourier/SpectrumAnalysis.h"
#include "../lighting/FrequencyToColor.h"
#include "../lighting/RgbLedOutput.h"
#include "AudioSampler.h"
#include "SamplePreprocessing.h"

namespace {

fourier::AudioSamples raw_audio_samples{};
fourier::AudioSamples prepared_audio_samples{};
fourier::FrequencySpectrum frequency_domain_coefficients{};
fourier::SpectrumMagnitudes frequency_magnitudes{};
LiveAudioDiagnostics diagnostics{};
float fixed_noise_floor_root_mean_square
        = audio_config::MINIMUM_NOISE_FLOOR_RMS;
uint32_t last_frame_start_milliseconds = 0;
uint32_t last_serial_report_milliseconds = 0;
uint32_t last_spectrum_serial_report_milliseconds = 0;
uint32_t spectrum_frame_sequence = 0;
uint32_t capture_sequence = 0;
bool live_frame_comparison_printed = false;
bool sample_capture_requested = false;
constexpr size_t SERIAL_COMMAND_BUFFER_CAPACITY = 32;
char serial_command_buffer[SERIAL_COMMAND_BUFFER_CAPACITY]{};
size_t serial_command_length = 0;

void read_serial_commands() {
    while (Serial.available() > 0) {
        const char received_character = static_cast<char>(Serial.read());
        if (received_character == '\r') {
            continue;
        }
        if (received_character == '\n') {
            serial_command_buffer[serial_command_length] = '\0';
            if (strcmp(serial_command_buffer, "CAPTURE_FRAME") == 0) {
                sample_capture_requested = true;
            }
            serial_command_length = 0;
            continue;
        }
        if (serial_command_length + 1 < sizeof(serial_command_buffer)) {
            serial_command_buffer[serial_command_length++] = received_character;
        } else {
            serial_command_length = 0;
        }
    }
}

constexpr size_t CAPTURE_VALUES_PER_CHUNK = 16;

void print_capture_values(const char *message_type, uint32_t capture_id,
                          const float *values, size_t value_count) {
    for (size_t start_index = 0; start_index < value_count;
         start_index += CAPTURE_VALUES_PER_CHUNK) {
        const size_t remaining_value_count = value_count - start_index;
        const size_t chunk_count
                = remaining_value_count < CAPTURE_VALUES_PER_CHUNK
                          ? remaining_value_count
                          : CAPTURE_VALUES_PER_CHUNK;
        Serial.print(message_type);
        Serial.print(",id=");
        Serial.print(capture_id);
        Serial.print(",start=");
        Serial.print(start_index);
        Serial.print(",count=");
        Serial.print(chunk_count);
        Serial.print(",values=");
        Serial.print(values[start_index], 3);
        for (size_t offset = 1; offset < chunk_count; ++offset) {
            Serial.print('|');
            Serial.print(values[start_index + offset], 3);
        }
        Serial.println();
    }
}

void print_capture_header(
        uint32_t capture_id,
        const SamplePreprocessingResults &preprocessing_results) {
    Serial.print("CAPTURE_BEGIN,id=");
    Serial.print(capture_id);
    Serial.print(",n=");
    Serial.print(fourier_config::NUMBER_OF_SAMPLES);
    Serial.print(",sample_rate_hz=");
    Serial.print(diagnostics.achieved_sampling_frequency_hz, 2);
    Serial.print(",sample_span_us=");
    Serial.print(diagnostics.sample_span_microseconds);
    Serial.print(",mean=");
    Serial.print(preprocessing_results.frame_mean, 3);
    Serial.print(",rms=");
    Serial.print(diagnostics.centered_root_mean_square, 3);
    Serial.print(",noise_floor=");
    Serial.print(diagnostics.noise_floor_root_mean_square, 3);
    Serial.print(",silence_threshold=");
    Serial.print(diagnostics.silence_threshold_root_mean_square, 3);
    Serial.print(",above_silence=");
    Serial.println(diagnostics.signal_above_silence_threshold ? 1 : 0);
}

void print_capture_samples(uint32_t capture_id) {
    constexpr size_t NONNEGATIVE_BIN_COUNT
            = fourier_config::NUMBER_OF_SAMPLES / 2 + 1;
    print_capture_values("CAPTURE_RAW", capture_id, raw_audio_samples.amplitude,
                         fourier_config::NUMBER_OF_SAMPLES);
    print_capture_values("CAPTURE_PREPARED", capture_id,
                         prepared_audio_samples.amplitude,
                         fourier_config::NUMBER_OF_SAMPLES);
    print_capture_values("CAPTURE_REAL", capture_id,
                         frequency_domain_coefficients.real,
                         NONNEGATIVE_BIN_COUNT);
    print_capture_values("CAPTURE_IMAGINARY", capture_id,
                         frequency_domain_coefficients.imaginary,
                         NONNEGATIVE_BIN_COUNT);
    print_capture_values("CAPTURE_MAGNITUDES", capture_id,
                         frequency_magnitudes.magnitude, NONNEGATIVE_BIN_COUNT);
}

void print_capture_output(uint32_t capture_id,
                          const fourier::DominantFrequency &dominant_frequency,
                          const FrequencyBandStrengths &band_strengths,
                          const RgbBrightness &brightness) {
    Serial.print("CAPTURE_OUTPUT,id=");
    Serial.print(capture_id);
    Serial.print(",dominant_bin=");
    Serial.print(dominant_frequency.frequency_bin_index);
    Serial.print(",dominant_hz=");
    Serial.print(dominant_frequency.frequency_hz, 2);
    Serial.print(",bass=");
    Serial.print(band_strengths.bass, 3);
    Serial.print(",mid=");
    Serial.print(band_strengths.midrange, 3);
    Serial.print(",treble=");
    Serial.print(band_strengths.treble, 3);
    Serial.print(",rgb=");
    Serial.print(brightness.red);
    Serial.print('|');
    Serial.print(brightness.green);
    Serial.print('|');
    Serial.println(brightness.blue);
    Serial.print("CAPTURE_END,id=");
    Serial.println(capture_id);
}

void print_synchronized_capture(
        uint32_t capture_id,
        const SamplePreprocessingResults &preprocessing_results,
        const fourier::DominantFrequency &dominant_frequency,
        const FrequencyBandStrengths &band_strengths,
        const RgbBrightness &brightness) {
    print_capture_header(capture_id, preprocessing_results);
    print_capture_samples(capture_id);
    print_capture_output(capture_id, dominant_frequency, band_strengths,
                         brightness);
}

float clamp_float(float value, float minimum, float maximum) {
    if (value < minimum) {
        return minimum;
    }
    if (value > maximum) {
        return maximum;
    }
    return value;
}

void clear_frequency_and_color_diagnostics() {
    diagnostics.dominant_frequency_bin_index = 0;
    diagnostics.dominant_frequency_hz = 0.0f;
    diagnostics.dominant_magnitude = 0.0f;
    diagnostics.bass_strength = 0.0f;
    diagnostics.midrange_strength = 0.0f;
    diagnostics.treble_strength = 0.0f;
    diagnostics.red_brightness = 0;
    diagnostics.green_brightness = 0;
    diagnostics.blue_brightness = 0;
}

void copy_sampling_diagnostics(
        const AudioSamplingDiagnostics &sampling_diagnostics) {
    diagnostics.sample_span_microseconds
            = sampling_diagnostics.sample_span_microseconds;
    diagnostics.expected_sample_span_microseconds
            = sampling_diagnostics.expected_sample_span_microseconds;
    diagnostics.maximum_lateness_microseconds
            = sampling_diagnostics.maximum_lateness_microseconds;
    diagnostics.missed_sample_deadlines = sampling_diagnostics.missed_deadlines;
    diagnostics.clipped_samples = sampling_diagnostics.clipped_samples;
    diagnostics.achieved_sampling_frequency_hz
            = sampling_diagnostics.achieved_sampling_frequency_hz;
}

void print_serial_diagnostics_if_due(uint32_t now_milliseconds) {
    if (now_milliseconds - last_serial_report_milliseconds
        < audio_config::SERIAL_REPORT_INTERVAL_MILLISECONDS) {
        return;
    }
    last_serial_report_milliseconds = now_milliseconds;

    Serial.print("LIVE_FRAME,sample_span_us=");
    Serial.print(diagnostics.sample_span_microseconds);
    Serial.print(",expected_span_us=");
    Serial.print(diagnostics.expected_sample_span_microseconds);
    Serial.print(",sample_rate_hz=");
    Serial.print(diagnostics.achieved_sampling_frequency_hz, 2);
    Serial.print(",max_late_us=");
    Serial.print(diagnostics.maximum_lateness_microseconds);
    Serial.print(",missed_deadlines=");
    Serial.print(diagnostics.missed_sample_deadlines);
    Serial.print(",clipped_samples=");
    Serial.print(diagnostics.clipped_samples);
    Serial.print(",rms=");
    Serial.print(diagnostics.centered_root_mean_square, 2);
    Serial.print(",noise_floor=");
    Serial.print(diagnostics.noise_floor_root_mean_square, 2);
    Serial.print(",dominant_bin=");
    Serial.print(diagnostics.dominant_frequency_bin_index);
    Serial.print(",dominant_hz=");
    Serial.print(diagnostics.dominant_frequency_hz, 1);
    Serial.print(",bass=");
    Serial.print(diagnostics.bass_strength, 1);
    Serial.print(",mid=");
    Serial.print(diagnostics.midrange_strength, 1);
    Serial.print(",treble=");
    Serial.print(diagnostics.treble_strength, 1);
    Serial.print(",rgb=");
    Serial.print(diagnostics.red_brightness);
    Serial.print('|');
    Serial.print(diagnostics.green_brightness);
    Serial.print('|');
    Serial.println(diagnostics.blue_brightness);
}

void print_spectrum_bins(const fourier::SpectrumMagnitudes *magnitudes) {
    constexpr size_t NYQUIST_BIN = fourier_config::NUMBER_OF_SAMPLES / 2;
    const float first_magnitude
            = magnitudes == nullptr ? 0.0f : magnitudes->magnitude[0];
    Serial.print(static_cast<uint32_t>(first_magnitude + 0.5f));
    for (size_t frequency_bin_index = 1; frequency_bin_index <= NYQUIST_BIN;
         ++frequency_bin_index) {
        Serial.print('|');
        const float magnitude
                = magnitudes == nullptr
                          ? 0.0f
                          : magnitudes->magnitude[frequency_bin_index];
        Serial.print(static_cast<uint32_t>(magnitude + 0.5f));
    }
    Serial.println();
}

void print_spectrum_diagnostics_if_due(
        uint32_t now_milliseconds,
        const fourier::SpectrumMagnitudes *magnitudes) {
    if (now_milliseconds - last_spectrum_serial_report_milliseconds
        < audio_config::SPECTRUM_SERIAL_REPORT_INTERVAL_MILLISECONDS) {
        return;
    }
    last_spectrum_serial_report_milliseconds = now_milliseconds;

    Serial.print("SPECTRUM_FRAME,sequence=");
    Serial.print(++spectrum_frame_sequence);
    Serial.print(",sample_rate_hz=");
    Serial.print(diagnostics.achieved_sampling_frequency_hz, 2);
    Serial.print(",rms=");
    Serial.print(diagnostics.centered_root_mean_square, 2);
    Serial.print(",noise_floor=");
    Serial.print(diagnostics.noise_floor_root_mean_square, 2);
    Serial.print(",silence_threshold=");
    Serial.print(diagnostics.silence_threshold_root_mean_square, 2);
    Serial.print(",dominant_bin=");
    Serial.print(diagnostics.dominant_frequency_bin_index);
    Serial.print(",dominant_hz=");
    Serial.print(diagnostics.dominant_frequency_hz, 1);
    Serial.print(",bass=");
    Serial.print(diagnostics.bass_strength, 1);
    Serial.print(",mid=");
    Serial.print(diagnostics.midrange_strength, 1);
    Serial.print(",treble=");
    Serial.print(diagnostics.treble_strength, 1);
    Serial.print(",rgb=");
    Serial.print(diagnostics.red_brightness);
    Serial.print('|');
    Serial.print(diagnostics.green_brightness);
    Serial.print('|');
    Serial.print(diagnostics.blue_brightness);
    Serial.print(",bins=");

    print_spectrum_bins(magnitudes);
}

bool acquire_prepared_frame(SamplePreprocessingResults &preprocessing_results) {
    AudioSamplingDiagnostics sampling_diagnostics{};
    if (!collect_audio_samples(&raw_audio_samples, &sampling_diagnostics)
        || !prepare_audio_samples(raw_audio_samples, WindowFunction::Hamming,
                                  &prepared_audio_samples,
                                  &preprocessing_results)) {
        stop_audio_reactive();
        return false;
    }
    copy_sampling_diagnostics(sampling_diagnostics);
    diagnostics.centered_root_mean_square
            = preprocessing_results.centered_root_mean_square;
    diagnostics.noise_floor_root_mean_square
            = fixed_noise_floor_root_mean_square;
    diagnostics.silence_threshold_root_mean_square
            = fixed_noise_floor_root_mean_square
              * audio_config::SILENCE_THRESHOLD_MULTIPLIER;
    diagnostics.signal_above_silence_threshold
            = preprocessing_results.centered_root_mean_square
              >= diagnostics.silence_threshold_root_mean_square;

    return true;
}

RgbBrightness
update_frame_color(const fourier::DominantFrequency &dominant_frequency,
                   const FrequencyBandStrengths &band_strengths) {
    RgbBrightness brightness{};
    if (diagnostics.signal_above_silence_threshold) {
        diagnostics.dominant_frequency_bin_index
                = dominant_frequency.frequency_bin_index;
        diagnostics.dominant_frequency_hz = dominant_frequency.frequency_hz;
        diagnostics.dominant_magnitude = dominant_frequency.magnitude;
        diagnostics.bass_strength = band_strengths.bass;
        diagnostics.midrange_strength = band_strengths.midrange;
        diagnostics.treble_strength = band_strengths.treble;
        brightness = map_frequency_bands_to_rgb(band_strengths);
        diagnostics.red_brightness = brightness.red;
        diagnostics.green_brightness = brightness.green;
        diagnostics.blue_brightness = brightness.blue;
        write_rgb_brightness(brightness);
    } else {
        clear_frequency_and_color_diagnostics();
        turn_off_rgb_led();
    }

    return brightness;
}

bool transform_prepared_frame() {
    if (diagnostics.signal_above_silence_threshold
        && !live_frame_comparison_printed) {
        print_live_frame_transform_comparison(prepared_audio_samples);
        live_frame_comparison_printed = true;
    }

    if (!fourier::compute_fast_fourier_transform(prepared_audio_samples,
                                                 &frequency_domain_coefficients)
        || !fourier::calculate_spectrum_magnitudes(
                frequency_domain_coefficients, &frequency_magnitudes)) {
        stop_audio_reactive();
        return false;
    }

    return true;
}

} // namespace

void setup_audio_reactive() {
    setup_audio_sampler();
    const float measured_noise_root_mean_square
            = measure_microphone_noise_rms();
    fixed_noise_floor_root_mean_square = clamp_float(
            measured_noise_root_mean_square
                    * audio_config::NOISE_FLOOR_CALIBRATION_MULTIPLIER,
            audio_config::MINIMUM_NOISE_FLOOR_RMS,
            audio_config::MAXIMUM_NOISE_FLOOR_RMS);
    diagnostics.noise_floor_root_mean_square
            = fixed_noise_floor_root_mean_square;
    diagnostics.silence_threshold_root_mean_square
            = fixed_noise_floor_root_mean_square
              * audio_config::SILENCE_THRESHOLD_MULTIPLIER;
    Serial.print("MICROPHONE_BASELINE,measured_rms=");
    Serial.print(measured_noise_root_mean_square, 2);
    Serial.print(",fixed_noise_floor=");
    Serial.print(fixed_noise_floor_root_mean_square, 2);
    Serial.print(",silence_threshold=");
    Serial.println(diagnostics.silence_threshold_root_mean_square, 2);
}

void stop_audio_reactive() {
    diagnostics.signal_above_silence_threshold = false;
    clear_frequency_and_color_diagnostics();
    turn_off_rgb_led();
}

void update_audio_reactive() {
    read_serial_commands();
    const uint32_t now_milliseconds = millis();
    if (now_milliseconds - last_frame_start_milliseconds
        < audio_config::MINIMUM_FRAME_INTERVAL_MILLISECONDS) {
        return;
    }
    last_frame_start_milliseconds = now_milliseconds;

    SamplePreprocessingResults preprocessing_results{};
    if (!acquire_prepared_frame(preprocessing_results)) {
        return;
    }

    const bool capture_this_frame = sample_capture_requested;
    sample_capture_requested = false;

    if (!diagnostics.signal_above_silence_threshold && !capture_this_frame) {
        clear_frequency_and_color_diagnostics();
        turn_off_rgb_led();
        print_spectrum_diagnostics_if_due(millis(), nullptr);
        print_serial_diagnostics_if_due(millis());
        return;
    }

    if (!transform_prepared_frame()) {
        return;
    }

    fourier::DominantFrequency dominant_frequency{};
    fourier::find_dominant_nonnegative_frequency(
            frequency_magnitudes,
            static_cast<float>(fourier_config::SAMPLING_FREQUENCY_HZ),
            &dominant_frequency);
    const FrequencyBandStrengths band_strengths
            = calculate_frequency_band_strengths(frequency_magnitudes);
    const RgbBrightness brightness
            = update_frame_color(dominant_frequency, band_strengths);

    if (capture_this_frame) {
        print_synchronized_capture(++capture_sequence, preprocessing_results,
                                   dominant_frequency, band_strengths,
                                   brightness);
    }
    print_spectrum_diagnostics_if_due(millis(),
                                      diagnostics.signal_above_silence_threshold
                                              ? &frequency_magnitudes
                                              : nullptr);
    print_serial_diagnostics_if_due(millis());
}

const LiveAudioDiagnostics &live_audio_diagnostics() {
    return diagnostics;
}
