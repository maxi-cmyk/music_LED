# Project notation guide

This guide keeps equations, code, and spoken explanations consistent. Final presentation equations should still receive a direct audit against the CS103 textbook glossary in eLearn.

| Meaning | Equation notation | Code name |
|---|---|---|
| Number of samples | \(N\) | `numberOfSamples` |
| Sampling frequency | \(f_s\) | `samplingFrequencyHz` |
| Time sample index | \(n\) | `sampleIndex` |
| Frequency bin index | \(k\) | `frequencyBinIndex` |
| Time-domain sample | \(x[n]\) | `timeDomainSamples.amplitude[sampleIndex]` |
| DFT coefficient | \(X[k]\) | real and imaginary fields at `frequencyBinIndex` |
| Fourier matrix | \(F\) | computed entries inside `computeDirectDFT` |
| Imaginary unit | \(i\), where \(i^2=-1\) | real and imaginary arrays |
| Conjugate transpose | \(F^*\) | presentation mathematics only |

Use square brackets around displayed matrices and column vectors. Use adjacency for ordinary multiplication, such as \(F\mathbf{x}\), rather than adding a dot, cross, or asterisk. Use an explicit multiplication symbol only if the textbook glossary calls for it in that context.

The implementation uses zero-based indices: \(n,k\in\{0,1,\ldots,N-1\}\). Its forward exponent is negative and its forward transform is unnormalized. Under this convention,

\[
F^*F=NI
\]

and the inverse is

\[
\mathbf{x}=\frac{1}{N}F^*\mathbf{X}.
\]

Do not use the following terms interchangeably:

- A **complex coefficient** is \(X[k]\), containing real and imaginary parts.
- Its **magnitude** is \(|X[k]|\).
- Its **squared magnitude** is \(|X[k]|^2\).
- A raw ADC value or raw DFT magnitude is not a calibrated sound-pressure or decibel measurement.
