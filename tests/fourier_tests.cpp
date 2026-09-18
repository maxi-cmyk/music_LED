#include <cmath>
#include <cstddef>
#include <iostream>
#include <string>

#include "../firmware/music_LED/src/audio/SamplePreprocessing.h"
#include "../firmware/music_LED/src/config/FourierConfig.h"
#include "../firmware/music_LED/src/demo/SyntheticSignals.h"
#include "../firmware/music_LED/src/fourier/DirectDFT.h"
#include "../firmware/music_LED/src/fourier/FastFourierTransform.h"
#include "../firmware/music_LED/src/fourier/SpectrumAnalysis.h"
#include "../firmware/music_LED/src/lighting/FrequencyToColor.h"

namespace {

constexpr float kAbsoluteTolerance = 0.02f;
constexpr float kRelativeTolerance = 0.0002f;

class TestRunner {
public:
  void check(bool condition, const std::string &description) {
    if (condition) {
      std::cout << "[PASS] " << description << '\n';
      return;
    }
    std::cout << "[FAIL] " << description << '\n';
    ++numberOfFailures_;
  }

  int numberOfFailures() const { return numberOfFailures_; }

private:
  int numberOfFailures_ = 0;
};

bool approximatelyEqual(float actual, float expected) {
  const float allowedError =
      kAbsoluteTolerance + kRelativeTolerance * std::fabs(expected);
  return std::fabs(actual - expected) <= allowedError;
}

bool coefficientApproximatelyEqual(const fourier::FrequencySpectrum &spectrum,
                                   size_t frequencyBinIndex, float expectedReal,
                                   float expectedImaginary) {
  return approximatelyEqual(spectrum.real[frequencyBinIndex], expectedReal) &&
         approximatelyEqual(spectrum.imaginary[frequencyBinIndex],
                            expectedImaginary);
}

float complexDifference(const fourier::FrequencySpectrum &first,
                        const fourier::FrequencySpectrum &second,
                        size_t frequencyBinIndex) {
  const float realDifference =
      first.real[frequencyBinIndex] - second.real[frequencyBinIndex];
  const float imaginaryDifference =
      first.imaginary[frequencyBinIndex] - second.imaginary[frequencyBinIndex];
  return std::sqrt(realDifference * realDifference +
                   imaginaryDifference * imaginaryDifference);
}

bool transformsApproximatelyEqual(
    const fourier::FrequencySpectrum &directDFTResult,
    const fourier::FrequencySpectrum &fastFourierTransformResult,
    float *maximumComplexError) {
  if (directDFTResult.numberOfSamples !=
      fastFourierTransformResult.numberOfSamples) {
    return false;
  }

  bool allCoefficientsMatch = true;
  *maximumComplexError = 0.0f;
  for (size_t frequencyBinIndex = 0;
       frequencyBinIndex < directDFTResult.numberOfSamples;
       ++frequencyBinIndex) {
    const float error = complexDifference(
        directDFTResult, fastFourierTransformResult, frequencyBinIndex);
    if (error > *maximumComplexError)
      *maximumComplexError = error;

    const float expectedMagnitude =
        std::sqrt(directDFTResult.real[frequencyBinIndex] *
                      directDFTResult.real[frequencyBinIndex] +
                  directDFTResult.imaginary[frequencyBinIndex] *
                      directDFTResult.imaginary[frequencyBinIndex]);
    const float allowedError =
        kAbsoluteTolerance + kRelativeTolerance * expectedMagnitude;
    if (error > allowedError)
      allCoefficientsMatch = false;
  }
  return allCoefficientsMatch;
}

void checkDirectAndFastAgreement(TestRunner *testRunner,
                                 const std::string &signalDescription,
                                 const fourier::AudioSamples &samples) {
  fourier::FrequencySpectrum directDFTResult{};
  fourier::FrequencySpectrum fastFourierTransformResult{};
  const bool directDFTSucceeded =
      fourier::computeDirectDFT(samples, &directDFTResult);
  const bool fastFourierTransformSucceeded =
      fourier::computeFastFourierTransform(samples,
                                           &fastFourierTransformResult);
  float maximumComplexError = 0.0f;
  const bool resultsMatch =
      directDFTSucceeded && fastFourierTransformSucceeded &&
      transformsApproximatelyEqual(directDFTResult, fastFourierTransformResult,
                                   &maximumComplexError);
  testRunner->check(resultsMatch,
                    signalDescription +
                        " DFT/FFT complex agreement (maximum error " +
                        std::to_string(maximumComplexError) + ")");
}

void checkFourPointWorkedExample(TestRunner *testRunner) {
  fourier::AudioSamples samples{};
  fourier::FrequencySpectrum spectrum{};
  const bool succeeded =
      synthetic_signals::generateFourPointWorkedExample(&samples) &&
      fourier::computeDirectDFT(samples, &spectrum);

  const bool expectedCoefficients =
      succeeded && coefficientApproximatelyEqual(spectrum, 0, 0.0f, 0.0f) &&
      coefficientApproximatelyEqual(spectrum, 1, 2.0f, 0.0f) &&
      coefficientApproximatelyEqual(spectrum, 2, 0.0f, 0.0f) &&
      coefficientApproximatelyEqual(spectrum, 3, 2.0f, 0.0f);
  testRunner->check(expectedCoefficients,
                    "four-point matrix example produces [0, 2, 0, 2]");
  checkDirectAndFastAgreement(testRunner, "four-point worked example", samples);
}

void checkKnownSignalsAtSize(TestRunner *testRunner, size_t numberOfSamples) {
  const std::string sizeLabel = "N=" + std::to_string(numberOfSamples);
  fourier::AudioSamples samples{};
  fourier::FrequencySpectrum spectrum{};

  bool succeeded =
      synthetic_signals::generateZeroSignal(numberOfSamples, &samples) &&
      fourier::computeDirectDFT(samples, &spectrum);
  bool zeroOutput = succeeded;
  for (size_t frequencyBinIndex = 0;
       zeroOutput && frequencyBinIndex < numberOfSamples; ++frequencyBinIndex) {
    zeroOutput =
        coefficientApproximatelyEqual(spectrum, frequencyBinIndex, 0.0f, 0.0f);
  }
  testRunner->check(zeroOutput, sizeLabel + " zero signal maps to zero");

  succeeded = synthetic_signals::generateImpulseSignal(numberOfSamples, 0, 1.0f,
                                                       &samples) &&
              fourier::computeDirectDFT(samples, &spectrum);
  bool impulseOutput = succeeded;
  for (size_t frequencyBinIndex = 0;
       impulseOutput && frequencyBinIndex < numberOfSamples;
       ++frequencyBinIndex) {
    impulseOutput =
        coefficientApproximatelyEqual(spectrum, frequencyBinIndex, 1.0f, 0.0f);
  }
  testRunner->check(impulseOutput,
                    sizeLabel + " sample-zero impulse maps to all ones");
  checkDirectAndFastAgreement(testRunner, sizeLabel + " impulse", samples);

  constexpr float kConstantAmplitude = 1.25f;
  succeeded = synthetic_signals::generateConstantSignal(
                  numberOfSamples, kConstantAmplitude, &samples) &&
              fourier::computeDirectDFT(samples, &spectrum);
  bool constantOutput =
      succeeded &&
      coefficientApproximatelyEqual(
          spectrum, 0, kConstantAmplitude * static_cast<float>(numberOfSamples),
          0.0f);
  for (size_t frequencyBinIndex = 1;
       constantOutput && frequencyBinIndex < numberOfSamples;
       ++frequencyBinIndex) {
    constantOutput =
        coefficientApproximatelyEqual(spectrum, frequencyBinIndex, 0.0f, 0.0f);
  }
  testRunner->check(constantOutput,
                    sizeLabel + " constant signal remains in the DC bin");

  const size_t cosineBin = 3;
  succeeded = synthetic_signals::generateCosineAtBin(numberOfSamples, cosineBin,
                                                     1.0f, 0.0f, &samples) &&
              fourier::computeDirectDFT(samples, &spectrum);
  const float expectedCosineCoefficient =
      static_cast<float>(numberOfSamples) / 2.0f;
  const bool cosineOutput =
      succeeded &&
      coefficientApproximatelyEqual(spectrum, cosineBin,
                                    expectedCosineCoefficient, 0.0f) &&
      coefficientApproximatelyEqual(spectrum, numberOfSamples - cosineBin,
                                    expectedCosineCoefficient, 0.0f);
  testRunner->check(cosineOutput,
                    sizeLabel + " cosine appears in its conjugate bin pair");
  checkDirectAndFastAgreement(testRunner, sizeLabel + " single cosine",
                              samples);

  constexpr float kPhaseRadians = 0.63f;
  succeeded = synthetic_signals::generateCosineAtBin(
                  numberOfSamples, cosineBin, 1.0f, kPhaseRadians, &samples) &&
              fourier::computeDirectDFT(samples, &spectrum);
  const float expectedPhaseReal =
      expectedCosineCoefficient * std::cos(kPhaseRadians);
  const float expectedPhaseImaginary =
      expectedCosineCoefficient * std::sin(kPhaseRadians);
  const bool phaseOutput =
      succeeded &&
      coefficientApproximatelyEqual(spectrum, cosineBin, expectedPhaseReal,
                                    expectedPhaseImaginary) &&
      coefficientApproximatelyEqual(spectrum, numberOfSamples - cosineBin,
                                    expectedPhaseReal, -expectedPhaseImaginary);
  testRunner->check(phaseOutput,
                    sizeLabel + " phase shift produces signed imaginary parts");
  checkDirectAndFastAgreement(testRunner, sizeLabel + " phase-shifted cosine",
                              samples);

  succeeded = synthetic_signals::generateTwoCosinesAtBins(
      numberOfSamples, 2, 0.75f, 0.0f, 5, 0.4f, -0.3f, &samples);
  testRunner->check(succeeded, sizeLabel + " two-tone vector generated");
  checkDirectAndFastAgreement(testRunner, sizeLabel + " two-tone signal",
                              samples);
}

void checkLinearity(TestRunner *testRunner) {
  constexpr size_t kNumberOfSamples = 128;
  constexpr float kFirstScalar = 1.7f;
  constexpr float kSecondScalar = -0.35f;
  fourier::AudioSamples firstSignal{};
  fourier::AudioSamples secondSignal{};
  fourier::AudioSamples linearCombination{};
  synthetic_signals::generateCosineAtBin(kNumberOfSamples, 4, 1.0f, 0.2f,
                                         &firstSignal);
  synthetic_signals::generateCosineAtBin(kNumberOfSamples, 20, 0.8f, -0.4f,
                                         &secondSignal);
  linearCombination.numberOfSamples = kNumberOfSamples;
  for (size_t sampleIndex = 0; sampleIndex < kNumberOfSamples; ++sampleIndex) {
    linearCombination.amplitude[sampleIndex] =
        kFirstScalar * firstSignal.amplitude[sampleIndex] +
        kSecondScalar * secondSignal.amplitude[sampleIndex];
  }

  fourier::FrequencySpectrum firstTransform{};
  fourier::FrequencySpectrum secondTransform{};
  fourier::FrequencySpectrum combinedTransform{};
  const bool succeeded =
      fourier::computeDirectDFT(firstSignal, &firstTransform) &&
      fourier::computeDirectDFT(secondSignal, &secondTransform) &&
      fourier::computeDirectDFT(linearCombination, &combinedTransform);
  bool linearityHolds = succeeded;
  for (size_t frequencyBinIndex = 0;
       linearityHolds && frequencyBinIndex < kNumberOfSamples;
       ++frequencyBinIndex) {
    const float expectedReal =
        kFirstScalar * firstTransform.real[frequencyBinIndex] +
        kSecondScalar * secondTransform.real[frequencyBinIndex];
    const float expectedImaginary =
        kFirstScalar * firstTransform.imaginary[frequencyBinIndex] +
        kSecondScalar * secondTransform.imaginary[frequencyBinIndex];
    linearityHolds = coefficientApproximatelyEqual(
        combinedTransform, frequencyBinIndex, expectedReal, expectedImaginary);
  }
  testRunner->check(linearityHolds,
                    "DFT satisfies F(a x + b y) = a F x + b F y");
}

void checkInputValidation(TestRunner *testRunner) {
  testRunner->check(fourier_config::isSupportedDiagnosticSize(32) &&
                        fourier_config::isSupportedDiagnosticSize(64) &&
                        fourier_config::isSupportedDiagnosticSize(128) &&
                        fourier_config::isSupportedDiagnosticSize(256),
                    "all four diagnostic sizes are enabled");
  testRunner->check(!fourier_config::isSupportedDiagnosticSize(16) &&
                        !fourier_config::isSupportedDiagnosticSize(30),
                    "diagnostic sizes remain intentionally bounded");

  fourier::AudioSamples unsupportedSamples{};
  unsupportedSamples.numberOfSamples = 30;
  fourier::FrequencySpectrum output{};
  testRunner->check(
      !fourier::computeFastFourierTransform(unsupportedSamples, &output) &&
          output.numberOfSamples == 0,
      "FFT rejects a non-power-of-two sample count");
  testRunner->check(fourier::computeDirectDFT(unsupportedSamples, &output) &&
                        output.numberOfSamples == 30,
                    "direct DFT accepts a non-power-of-two sample count");

  unsupportedSamples.numberOfSamples =
      fourier_config::kMaximumNumberOfSamples + 1;
  testRunner->check(
      !fourier::computeDirectDFT(unsupportedSamples, &output) &&
          output.numberOfSamples == 0 &&
          !fourier::computeFastFourierTransform(unsupportedSamples, &output) &&
          output.numberOfSamples == 0,
      "both transforms reject a sample count beyond allocated capacity");
}

void checkSamplePreprocessing(TestRunner *testRunner) {
  fourier::AudioSamples rawSamples{};
  rawSamples.numberOfSamples = 4;
  rawSamples.amplitude[0] = 5.0f;
  rawSamples.amplitude[1] = 5.0f;
  rawSamples.amplitude[2] = 5.0f;
  rawSamples.amplitude[3] = 5.0f;
  fourier::AudioSamples preparedSamples{};
  SamplePreprocessingResults results{};
  bool succeeded = prepareAudioSamples(rawSamples, WindowFunction::None,
                                       &preparedSamples, &results);
  bool constantRemoved =
      succeeded && approximatelyEqual(results.frameMean, 5.0f) &&
      approximatelyEqual(results.centeredRootMeanSquare, 0.0f);
  for (size_t sampleIndex = 0; constantRemoved && sampleIndex < 4;
       ++sampleIndex) {
    constantRemoved =
        approximatelyEqual(preparedSamples.amplitude[sampleIndex], 0.0f);
  }
  testRunner->check(constantRemoved,
                    "preprocessing removes a constant frame mean");

  rawSamples.amplitude[0] = 1.0f;
  rawSamples.amplitude[1] = -1.0f;
  rawSamples.amplitude[2] = 1.0f;
  rawSamples.amplitude[3] = -1.0f;
  succeeded = prepareAudioSamples(rawSamples, WindowFunction::Hamming,
                                  &preparedSamples, &results);
  testRunner->check(
      succeeded && approximatelyEqual(results.frameMean, 0.0f) &&
          approximatelyEqual(results.centeredRootMeanSquare, 1.0f) &&
          approximatelyEqual(rawSamples.amplitude[0], 1.0f) &&
          std::fabs(preparedSamples.amplitude[0]) < 1.0f,
      "Hamming preprocessing reports pre-window RMS and preserves input");
}

void checkSpectrumAndColorMapping(TestRunner *testRunner) {
  fourier::FrequencySpectrum coefficients{};
  coefficients.numberOfSamples = 128;
  coefficients.real[4] = 100.0f;
  coefficients.real[124] = 100.0f;
  fourier::SpectrumMagnitudes magnitudes{};
  fourier::DominantFrequency dominant{};
  const bool analysed =
      fourier::calculateSpectrumMagnitudes(coefficients, &magnitudes) &&
      fourier::findDominantNonnegativeFrequency(magnitudes, 6400.0f, &dominant);
  testRunner->check(analysed && dominant.frequencyBinIndex == 4 &&
                        approximatelyEqual(dominant.frequencyHz, 200.0f),
                    "bin 4 is labelled as 200 Hz at 6400 Hz and N=128");

  FrequencyBandStrengths bandStrengths =
      calculateFrequencyBandStrengths(magnitudes);
  RgbBrightness brightness = mapFrequencyBandsToRgb(bandStrengths);
  testRunner->check(bandStrengths.bass > 0.0f &&
                        approximatelyEqual(bandStrengths.midrange, 0.0f) &&
                        approximatelyEqual(bandStrengths.treble, 0.0f) &&
                        brightness.red > 0 && brightness.green == 0 &&
                        brightness.blue == 0,
                    "200 Hz contributes only to the red channel");

  coefficients.real[20] = 80.0f;
  coefficients.real[108] = 80.0f;
  fourier::calculateSpectrumMagnitudes(coefficients, &magnitudes);
  bandStrengths = calculateFrequencyBandStrengths(magnitudes);
  brightness = mapFrequencyBandsToRgb(bandStrengths);
  testRunner->check(brightness.red > 0 && brightness.green > 0 &&
                        brightness.blue == 0,
                    "200 Hz plus 1000 Hz produces red and green output");

  coefficients = fourier::FrequencySpectrum{};
  coefficients.numberOfSamples = 128;
  coefficients.real[40] = 90.0f;
  coefficients.real[88] = 90.0f;
  fourier::calculateSpectrumMagnitudes(coefficients, &magnitudes);
  brightness =
      mapFrequencyBandsToRgb(calculateFrequencyBandStrengths(magnitudes));
  testRunner->check(brightness.red == 0 && brightness.green == 0 &&
                        brightness.blue > 0,
                    "2000 Hz contributes only to the blue channel");
}

} // namespace

int main() {
  TestRunner testRunner;
  checkInputValidation(&testRunner);
  checkFourPointWorkedExample(&testRunner);

  constexpr size_t kDiagnosticSizes[] = {32, 64, 128, 256};
  for (size_t numberOfSamples : kDiagnosticSizes) {
    checkKnownSignalsAtSize(&testRunner, numberOfSamples);
  }
  checkLinearity(&testRunner);
  checkSamplePreprocessing(&testRunner);
  checkSpectrumAndColorMapping(&testRunner);

  if (testRunner.numberOfFailures() == 0) {
    std::cout << "[PASS] all Fourier validation checks completed\n";
    return 0;
  }
  std::cout << "[FAIL] " << testRunner.numberOfFailures()
            << " Fourier validation check(s) failed\n";
  return 1;
}
