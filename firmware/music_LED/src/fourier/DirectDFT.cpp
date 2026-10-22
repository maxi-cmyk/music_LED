#include "DirectDFT.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace fourier {

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

} // namespace fourier
