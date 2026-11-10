# FFT code (C++) — quick reference

All the C++ that computes the spectrum on the ESP32, in the order the data flows. Every block is copied from the firmware source; nothing here is rewritten.

```
ADC samples ──► prepare_audio_samples ──► compute_fast_fourier_transform ──► calculate_spectrum_magnitudes ──► band strengths ──► LED
 (128 floats)   remove mean + Hamming        bit-reverse + 7 butterfly stages      |X[k]| = sqrt(re² + im²)       sqrt(Σ|X[k]|²)
```

| Step | Function | File |
|---|---|---|
| 1. Settings | `NUMBER_OF_SAMPLES`, `SAMPLING_FREQUENCY_HZ`, `is_supported_fft_size` | `config/FourierConfig.h` |
| 2. Data types | `AudioSamples`, `FrequencySpectrum` | `fourier/FourierTypes.h` |
| 3. Preprocessing | `prepare_audio_samples`, `window_coefficient` | `audio/SamplePreprocessing.cpp` |
| 4. **The FFT** | `compute_fast_fourier_transform` and its helpers | `fourier/FastFourierTransform.cpp` |
| 5. Magnitudes | `calculate_spectrum_magnitudes`, `frequency_for_bin_hz` | `fourier/SpectrumAnalysis.cpp` |
| 6. Dominant bin and band strength | `find_dominant_nonnegative_frequency`, `calculate_band_strength` | `fourier/SpectrumAnalysis.cpp` |
| 7. Bands to LED | `calculate_frequency_band_strengths` | `lighting/FrequencyToColor.cpp` |
| 8. Where it is called | `transform_prepared_frame` | `audio/AudioReactive.cpp` |
| Reference | `compute_direct_dft` (the slow $O(N^2)$ version) | `fourier/DirectDFT.cpp` |

---

## 1. Settings

`firmware/music_LED/src/config/FourierConfig.h` — sampling constants

```cpp
constexpr size_t NUMBER_OF_SAMPLES = 128;
constexpr size_t MAXIMUM_NUMBER_OF_SAMPLES = 256;
constexpr uint32_t SAMPLING_FREQUENCY_HZ = 6400;
constexpr uint32_t MICROSECONDS_PER_SECOND = 1000000;
```

`firmware/music_LED/src/config/FourierConfig.h` — bin spacing, frame length, Nyquist

```cpp
constexpr float FREQUENCY_BIN_SPACING_HZ
        = static_cast<float>(SAMPLING_FREQUENCY_HZ)
          / static_cast<float>(NUMBER_OF_SAMPLES);

constexpr float FRAME_DURATION_SECONDS
        = static_cast<float>(NUMBER_OF_SAMPLES)
          / static_cast<float>(SAMPLING_FREQUENCY_HZ);
constexpr float NYQUIST_FREQUENCY_HZ
        = static_cast<float>(SAMPLING_FREQUENCY_HZ) / 2.0f;
```

`firmware/music_LED/src/config/FourierConfig.h` — pi and the size checks

```cpp
constexpr float FOURIER_PI = 3.14159265358979323846f;

constexpr bool is_power_of_two(size_t value) {
    return value != 0 && (value & (value - 1)) == 0;
}

constexpr bool is_supported_sample_count(size_t number_of_samples) {
    return number_of_samples >= 2
           && number_of_samples <= MAXIMUM_NUMBER_OF_SAMPLES;
}

constexpr bool is_supported_fft_size(size_t number_of_samples) {
    return is_supported_sample_count(number_of_samples)
           && is_power_of_two(number_of_samples);
}
```

---

## 2. Data types

Everything is split into separate `real[]` and `imaginary[]` arrays. There is no complex-number class.

`firmware/music_LED/src/fourier/FourierTypes.h` — data types

```cpp
// A real-valued time-domain vector. amplitude[sample_index] represents x[n].
// Values are raw mathematical coefficients unless the caller documents a unit.
struct AudioSamples {
    size_t number_of_samples = 0;
    float amplitude[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
};

// The unnormalized complex forward transform. For each frequency_bin_index,
// real and imaginary together represent X[k]. Magnitude is deliberately not
// stored here because taking a magnitude is a separate, nonlinear operation.
struct FrequencySpectrum {
    size_t number_of_samples = 0;
    float real[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
    float imaginary[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
};
```

---

## 3. Preprocessing (before the FFT)

Subtract the frame mean (removes the microphone's DC offset), then multiply by a Hamming window to reduce spectral leakage.

`firmware/music_LED/src/audio/SamplePreprocessing.cpp` — window_coefficient (Hamming window)

```cpp
float window_coefficient(WindowFunction window_function, size_t sample_index,
                         size_t number_of_samples) {
    if (window_function == WindowFunction::None || number_of_samples <= 1) {
        return 1.0f;
    }
    constexpr float HAMMING_OFFSET = 0.54f;
    constexpr float HAMMING_COSINE_WEIGHT = 0.46f;
    return HAMMING_OFFSET
           - HAMMING_COSINE_WEIGHT
                     * cosf(2.0f * fourier_config::FOURIER_PI
                            * static_cast<float>(sample_index)
                            / static_cast<float>(number_of_samples - 1));
}
```

`firmware/music_LED/src/audio/SamplePreprocessing.cpp` — prepare_audio_samples

```cpp
bool prepare_audio_samples(const fourier::AudioSamples &raw_samples,
                           WindowFunction window_function,
                           fourier::AudioSamples *prepared_samples,
                           SamplePreprocessingResults *results) {
    if (prepared_samples == nullptr || results == nullptr
        || !fourier_config::is_supported_sample_count(
                raw_samples.number_of_samples)) {
        if (prepared_samples != nullptr) {
            prepared_samples->number_of_samples = 0;
        }
        return false;
    }

    *results = SamplePreprocessingResults{};
    const size_t number_of_samples = raw_samples.number_of_samples;
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        results->frame_mean += raw_samples.amplitude[sample_index];
    }
    results->frame_mean /= static_cast<float>(number_of_samples);

    prepared_samples->number_of_samples = number_of_samples;
    float sum_centered_squares = 0.0f;
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        const float centered_sample
                = raw_samples.amplitude[sample_index] - results->frame_mean;
        sum_centered_squares += centered_sample * centered_sample;
        prepared_samples->amplitude[sample_index]
                = centered_sample
                  * window_coefficient(window_function, sample_index,
                                       number_of_samples);
    }
    results->centered_root_mean_square = sqrtf(
            sum_centered_squares / static_cast<float>(number_of_samples));
    return true;
}
```

---

## 4. The FFT (iterative radix-2, decimation in time)

Three helpers and one entry point. Reading order: entry point, bit-reversal, stages, butterfly.

**Entry point.** Copy samples into the real part, set the imaginary part to 0, reorder, then run the stages.

`firmware/music_LED/src/fourier/FastFourierTransform.cpp` — compute_fast_fourier_transform

```cpp
bool compute_fast_fourier_transform(
        const AudioSamples &time_domain_samples,
        FrequencySpectrum *frequency_domain_coefficients) {
    if (frequency_domain_coefficients == nullptr) {
        return false;
    }
    frequency_domain_coefficients->number_of_samples = 0;

    const size_t number_of_samples = time_domain_samples.number_of_samples;
    if (!fourier_config::is_supported_fft_size(number_of_samples)) {
        return false;
    }

    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        frequency_domain_coefficients->real[sample_index]
                = time_domain_samples.amplitude[sample_index];
        frequency_domain_coefficients->imaginary[sample_index] = 0.0f;
    }

    frequency_domain_coefficients->number_of_samples = number_of_samples;
    reorder_bit_reversed_samples(*frequency_domain_coefficients);
    apply_fft_stages(*frequency_domain_coefficients);
    return true;
}
```

**Bit-reversal reordering.** Puts the samples in the order the butterflies expect, so the even and odd sub-transforms sit next to each other.

`firmware/music_LED/src/fourier/FastFourierTransform.cpp` — reorder_bit_reversed_samples

```cpp
void reorder_bit_reversed_samples(FrequencySpectrum &spectrum) {
    // Reversing the index bits pairs the correct even and odd subproblems.
    size_t reversed_index = 0;
    for (size_t original_index = 1; original_index < spectrum.number_of_samples;
         ++original_index) {
        size_t bit_position = spectrum.number_of_samples >> 1;
        while ((reversed_index & bit_position) != 0) {
            reversed_index ^= bit_position;
            bit_position >>= 1;
        }
        reversed_index ^= bit_position;

        if (original_index < reversed_index) {
            const float original_real = spectrum.real[original_index];
            const float original_imaginary = spectrum.imaginary[original_index];
            spectrum.real[original_index] = spectrum.real[reversed_index];
            spectrum.imaginary[original_index]
                    = spectrum.imaginary[reversed_index];
            spectrum.real[reversed_index] = original_real;
            spectrum.imaginary[reversed_index] = original_imaginary;
        }
    }
}
```

**Stages.** $\log_2 128 = 7$ stages; stage lengths are 2, 4, 8, …, 128. Each stage computes one twiddle step $e^{-2\pi i/L}$ and applies it to every block of length $L$.

`firmware/music_LED/src/fourier/FastFourierTransform.cpp` — apply_fft_stages

```cpp
void apply_fft_stages(FrequencySpectrum &spectrum) {
    // Each stage doubles the length by combining even and odd subtransforms.
    for (size_t transform_length = 2;
         transform_length <= spectrum.number_of_samples;
         transform_length <<= 1) {
        const float step_angle = -2.0f * fourier_config::FOURIER_PI
                                 / static_cast<float>(transform_length);
        const float step_real = cosf(step_angle);
        const float step_imaginary = sinf(step_angle);
        for (size_t start_index = 0; start_index < spectrum.number_of_samples;
             start_index += transform_length) {
            combine_subtransforms(spectrum, start_index, transform_length,
                                  step_real, step_imaginary);
        }
    }
}
```

**Butterfly.** One pass of $E + W^{k}O$ and $E - W^{k}O$ (the matrix $\begin{bmatrix} I & D \\ I & -D \end{bmatrix}$). `twiddle` is $W^{k}$, updated by complex multiplication with the step.

`firmware/music_LED/src/fourier/FastFourierTransform.cpp` — combine_subtransforms

```cpp
void combine_subtransforms(FrequencySpectrum &spectrum, size_t start_index,
                           size_t transform_length, float step_real,
                           float step_imaginary) {
    float twiddle_real = 1.0f;
    float twiddle_imaginary = 0.0f;
    for (size_t offset = 0; offset < transform_length / 2; ++offset) {
        const size_t even_index = start_index + offset;
        const size_t odd_index = even_index + transform_length / 2;
        const float rotated_real
                = spectrum.real[odd_index] * twiddle_real
                  - spectrum.imaginary[odd_index] * twiddle_imaginary;
        const float rotated_imaginary
                = spectrum.real[odd_index] * twiddle_imaginary
                  + spectrum.imaginary[odd_index] * twiddle_real;
        const float even_real = spectrum.real[even_index];
        const float even_imaginary = spectrum.imaginary[even_index];

        spectrum.real[even_index] = even_real + rotated_real;
        spectrum.imaginary[even_index] = even_imaginary + rotated_imaginary;
        spectrum.real[odd_index] = even_real - rotated_real;
        spectrum.imaginary[odd_index] = even_imaginary - rotated_imaginary;

        const float next_twiddle_real
                = twiddle_real * step_real - twiddle_imaginary * step_imaginary;
        twiddle_imaginary
                = twiddle_real * step_imaginary + twiddle_imaginary * step_real;
        twiddle_real = next_twiddle_real;
    }
}
```

Operation count for $N = 128$: 7 stages $\times$ 64 butterflies = **448 butterflies**, against $128 \times 128 = $ **16,384** complex products for the direct DFT.

---

## 5. Magnitudes

The FFT output is complex. The LED only cares about size, so take $\sqrt{\text{re}^2 + \text{im}^2}$ per bin.

`firmware/music_LED/src/fourier/SpectrumAnalysis.cpp` — calculate_spectrum_magnitudes

```cpp
bool calculate_spectrum_magnitudes(
        const FrequencySpectrum &frequency_domain_coefficients,
        SpectrumMagnitudes *magnitudes) {
    if (magnitudes == nullptr
        || !fourier_config::is_supported_sample_count(
                frequency_domain_coefficients.number_of_samples)) {
        if (magnitudes != nullptr) {
            magnitudes->number_of_samples = 0;
        }
        return false;
    }

    magnitudes->number_of_samples
            = frequency_domain_coefficients.number_of_samples;
    for (size_t frequency_bin_index = 0;
         frequency_bin_index < frequency_domain_coefficients.number_of_samples;
         ++frequency_bin_index) {
        const float real
                = frequency_domain_coefficients.real[frequency_bin_index];
        const float imaginary
                = frequency_domain_coefficients.imaginary[frequency_bin_index];
        magnitudes->magnitude[frequency_bin_index]
                = sqrtf(real * real + imaginary * imaginary);
    }
    return true;
}
```

`firmware/music_LED/src/fourier/SpectrumAnalysis.cpp` — frequency_for_bin_hz

```cpp
float frequency_for_bin_hz(size_t frequency_bin_index, size_t number_of_samples,
                           float sampling_frequency_hz) {
    if (number_of_samples == 0 || frequency_bin_index >= number_of_samples) {
        return 0.0f;
    }
    return static_cast<float>(frequency_bin_index) * sampling_frequency_hz
           / static_cast<float>(number_of_samples);
}
```

---

## 6. Dominant bin and band strength

Dominant bin: the loudest bin from 1 to $N/2$ (DC excluded). Band strength: $\sqrt{\sum |X[k]|^2}$ over a range of bins.

`firmware/music_LED/src/fourier/SpectrumAnalysis.cpp` — find_dominant_nonnegative_frequency

```cpp
bool find_dominant_nonnegative_frequency(
        const SpectrumMagnitudes &magnitudes, float sampling_frequency_hz,
        DominantFrequency *dominant_frequency) {
    if (dominant_frequency == nullptr || magnitudes.number_of_samples < 2) {
        return false;
    }

    *dominant_frequency = DominantFrequency{};
    const size_t nyquist_bin = magnitudes.number_of_samples / 2;
    for (size_t frequency_bin_index = 1; frequency_bin_index <= nyquist_bin;
         ++frequency_bin_index) {
        const float magnitude = magnitudes.magnitude[frequency_bin_index];
        if (magnitude > dominant_frequency->magnitude) {
            dominant_frequency->frequency_bin_index = frequency_bin_index;
            dominant_frequency->magnitude = magnitude;
        }
    }
    dominant_frequency->frequency_hz = frequency_for_bin_hz(
            dominant_frequency->frequency_bin_index,
            magnitudes.number_of_samples, sampling_frequency_hz);
    return true;
}
```

`firmware/music_LED/src/fourier/SpectrumAnalysis.cpp` — calculate_band_strength

```cpp
float calculate_band_strength(const SpectrumMagnitudes &magnitudes,
                              size_t first_frequency_bin_index,
                              size_t last_frequency_bin_index) {
    if (magnitudes.number_of_samples == 0
        || first_frequency_bin_index > last_frequency_bin_index
        || last_frequency_bin_index >= magnitudes.number_of_samples) {
        return 0.0f;
    }

    float sum_squared_magnitudes = 0.0f;
    for (size_t frequency_bin_index = first_frequency_bin_index;
         frequency_bin_index <= last_frequency_bin_index;
         ++frequency_bin_index) {
        const float magnitude = magnitudes.magnitude[frequency_bin_index];
        sum_squared_magnitudes += magnitude * magnitude;
    }
    return sqrtf(sum_squared_magnitudes);
}
```

---

## 7. Bands to the LED

Bins are 6400 / 128 = 50 Hz apart. Bass is bins 1–5, mids 6–20, treble 21–50.

`firmware/music_LED/src/config/LightingConfig.h` — band edges (bin numbers)

```cpp
constexpr size_t BASS_FIRST_BIN = 1;
constexpr size_t BASS_LAST_BIN = 5;
constexpr size_t MIDRANGE_FIRST_BIN = 6;
constexpr size_t MIDRANGE_LAST_BIN = 20;
constexpr size_t TREBLE_FIRST_BIN = 21;
constexpr size_t TREBLE_LAST_BIN = 50;
```

`firmware/music_LED/src/lighting/FrequencyToColor.cpp` — calculate_frequency_band_strengths

```cpp
FrequencyBandStrengths calculate_frequency_band_strengths(
        const fourier::SpectrumMagnitudes &magnitudes) {
    return {
            fourier::calculate_band_strength(magnitudes,
                                             lighting_config::BASS_FIRST_BIN,
                                             lighting_config::BASS_LAST_BIN),
            fourier::calculate_band_strength(
                    magnitudes, lighting_config::MIDRANGE_FIRST_BIN,
                    lighting_config::MIDRANGE_LAST_BIN),
            fourier::calculate_band_strength(magnitudes,
                                             lighting_config::TREBLE_FIRST_BIN,
                                             lighting_config::TREBLE_LAST_BIN),
    };
}
```

---

## 8. Where it is called

One frame: the prepared samples go through the FFT, then the magnitudes are computed. If either step fails, the LED is turned off.

`firmware/music_LED/src/audio/AudioReactive.cpp` — transform_prepared_frame

```cpp
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
```

---

## Reference: the direct DFT

The textbook definition, kept in the firmware for comparison and diagnostics (not used for the live LED). Two nested loops, $N^2$ complex products, and a `cosf` and `sinf` for every one.

`firmware/music_LED/src/fourier/DirectDFT.cpp` — compute_direct_dft

```cpp
bool compute_direct_dft(const AudioSamples &time_domain_samples,
                        FrequencySpectrum *frequency_domain_coefficients) {
    if (frequency_domain_coefficients == nullptr) {
        return false;
    }
    frequency_domain_coefficients->number_of_samples = 0;

    const size_t number_of_samples = time_domain_samples.number_of_samples;
    if (!fourier_config::is_supported_sample_count(number_of_samples)) {
        return false;
    }

    // Each outer-loop iteration is one row of the Fourier matrix multiplied by
    // the time-domain vector. Matrix entry F[k,n] is exp(-2 pi i k n / N).
    for (size_t frequency_bin_index = 0;
         frequency_bin_index < number_of_samples; ++frequency_bin_index) {
        float frequency_domain_real = 0.0f;
        float frequency_domain_imaginary = 0.0f;

        for (size_t sample_index = 0; sample_index < number_of_samples;
             ++sample_index) {
            const float angle_radians
                    = -2.0f * fourier_config::FOURIER_PI
                      * static_cast<float>(frequency_bin_index)
                      * static_cast<float>(sample_index)
                      / static_cast<float>(number_of_samples);
            const float time_domain_amplitude
                    = time_domain_samples.amplitude[sample_index];
            frequency_domain_real
                    += time_domain_amplitude * cosf(angle_radians);
            frequency_domain_imaginary
                    += time_domain_amplitude * sinf(angle_radians);
        }

        frequency_domain_coefficients->real[frequency_bin_index]
                = frequency_domain_real;
        frequency_domain_coefficients->imaginary[frequency_bin_index]
                = frequency_domain_imaginary;
    }

    frequency_domain_coefficients->number_of_samples = number_of_samples;
    return true;
}
```
