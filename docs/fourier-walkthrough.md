# From sound to colour: Fourier walkthrough

## The question

A microphone produces a sequence of amplitudes over time, so how do we dtermine **which frequencies are present in that sequence? is there a way to visualise those frequencies?**

The mathematical part of the signal path is:

\[
\text{time-domain vector}\;\mathbf{x}
\longrightarrow
\text{frequency-domain vector}\;\mathbf{X}.
\]

## Continuous and discrete Fourier transforms

For a continuous signal \(x(t)\), the Fourier transform describes its frequency content by

\[
X(f)=\int_{-\infty}^{\infty}x(t)e^{-2\pi i f t}\,dt.
\]

In this demonstration, we will be using an ESP32 which does not receive every value of a continuous signal. It records a finite vector of \(N\) samples. The discrete Fourier transform is therefore the transform used by this project:

\[
X[k]=\sum_{n=0}^{N-1}x[n]e^{-2\pi i kn/N},
\qquad k=0,1,\ldots,N-1.
\]

The continuous equation establishes the idea. The finite sum and its matrix form are the linear algebra demonstrated in the presentation.

## The DFT as matrix multiplication

Define the Fourier matrix entry

\[
F[k,n]=e^{-2\pi i kn/N}.
\]

Then the complete DFT is

\[
\mathbf{X}=F\mathbf{x}.
\]

Row \(k\) of \(F\) represents one complex sinusoidal frequency pattern. Multiplying that row by \(\mathbf{x}\) produces coefficient \(X[k]\). The nested loops in `computeDirectDFT` perform exactly these row-by-vector products without storing the whole matrix.

Equivalently, define the positive-exponent basis vector

\[
s_k[n]=e^{2\pi i kn/N}.
\]

Using the complex inner product, which conjugates its first vector,

\[
\langle \mathbf{s}_k,\mathbf{x}\rangle
=\sum_{n=0}^{N-1}\overline{s_k[n]}x[n]
=\sum_{n=0}^{N-1}x[n]e^{-2\pi i kn/N}
=X[k].
\]

Thus each DFT coefficient measures the input vector along one complex sinusoidal basis direction.

## Worked four-sample example

For \(N=4\), use

\[
F=
\begin{bmatrix}
1&1&1&1\\
1&-i&-1&i\\
1&-1&1&-1\\
1&i&-1&-i
\end{bmatrix},
\qquad
\mathbf{x}=
\begin{bmatrix}
1\\0\\-1\\0
\end{bmatrix}.
\]

The second row gives \(X[1]\):

\[
X[1]=1(1)+0(-i)+(-1)(-1)+0(i)=2.
\]

Repeating the row calculation gives

\[
\mathbf{X}=F\mathbf{x}=
\begin{bmatrix}
0\\2\\0\\2
\end{bmatrix}.
\]

The two nonzero entries form a conjugate pair. For real input, bin 1 represents the positive-frequency component and bin 3 represents its negative-frequency partner. They do not mean that two unrelated tones were present.

## Orthogonality and recovery

Different Fourier rows correspond to orthogonal complex sinusoidal patterns. With the unnormalized convention used here,

\[
F^*F=NI,
\]

where \(F^*\) is the conjugate transpose. Therefore,

\[
\mathbf{x}=\frac{1}{N}F^*\mathbf{X}.
\]

This is why the full set of complex DFT coefficients retains enough information to recover the sample vector.

## Linearity and superposition

For sample vectors \(\mathbf{x}\) and \(\mathbf{y}\) and scalars \(a\) and \(b\),

\[
F(a\mathbf{x}+b\mathbf{y})
=aF\mathbf{x}+bF\mathbf{y}.
\]

The DFT of a mixture is the same mixture of the individual DFTs. This explains why a 200 Hz tone and a 1000 Hz tone can both appear in the output coefficients. The automated tests verify this property numerically before magnitudes are calculated.

Taking magnitudes, applying a silence threshold, clipping brightness, and mapping bands to RGB are generally nonlinear operations. The complete sound-to-colour pipeline should not be described as one linear transformation.

## DFT and FFT

The direct DFT performs \(N\) row calculations, each containing \(N\) terms, so its operation count grows as \(O(N^2)\).

The radix-2 fast Fourier transform separates the input into smaller even-indexed and odd-indexed transforms, then combines them with butterfly operations. Reusing those smaller results reduces growth to \(O(N\log N)\).

The FFT is not a different transform. With the same sign and normalization conventions, it must produce the same complex coefficient vector as the direct DFT. The tests compare every real and imaginary component to establish this before any timing claim is made.

For one radix-2 butterfly, let (E[k]) be a coefficient from the even-indexed samples, (O[k]) a coefficient from the odd-indexed samples, and (W_N^k=e^{-2\pi i k/N}). One multiplication is reused to produce two outputs:

\[
X[k]=E[k]+W_N^kO[k],
\qquad
X[k+N/2]=E[k]-W_N^kO[k].
\]

For example, if (E[k]=3) and (W_N^kO[k]=i), the paired outputs are (3+i) and (3-i). The implementation repeats this combine pattern across (log_2N) stages instead of recomputing every matrix term independently.

## Project configuration

For the live demonstration:

| Quantity | Value |
|---|---:|
| Sample count \(N\) | 128 |
| Target sampling frequency \(f_s\) | 6400 Hz |
| Nominal frame duration \(N/f_s\) | 20 ms |
| Bin spacing \(f_s/N\) | 50 Hz |
| Nyquist frequency \(f_s/2\) | 3200 Hz |

A tone at 200 Hz aligns with bin 4, 1000 Hz with bin 20, and 2000 Hz with bin 40. Integer-bin tones make the controlled demonstration easier to read. Real microphone measurements will still be affected by timing, room acoustics, microphone response, and windowing.

## Why the approach matters

The direct DFT makes the matrix multiplication visible and defensible. The FFT reorganizes the same calculation so a small embedded device can repeatedly analyse live sound. The RGB module then makes selected regions of the coefficient vector visible: bass as red, midrange as green, and treble as blue.

The short continuous-transform introduction is prerequisite context. The project's main exploration goes further: it treats the DFT as a finite complex linear transformation, connects its coefficients to complex inner products and orthogonal basis directions, validates the matrix calculation in code, and studies the FFT factorization required for an embedded real-time application.

## Module map

| Module | Role in the signal path |
|---|---|
| `AudioSampler` | Acquires 128 ADC values on an explicit fractional-microsecond schedule and reports timing and clipping. |
| `SamplePreprocessing` | Removes the frame mean, measures centered RMS, and optionally applies a Hamming window. |
| `DirectDFT` | Exposes the Fourier-matrix row sums used for explanation and comparison. |
| `FastFourierTransform` | Computes the same complex output using bit reversal and butterflies. |
| `SpectrumAnalysis` | Calculates magnitudes, bin frequencies, peaks, and band strengths. |
| `FrequencyToColor` | Maps fixed bass, midrange, and treble bands to red, green, and blue values. |
| `RgbLedOutput` | Contains GPIO and PWM details plus the startup channel self-test. |
| `FourierDiagnostics` | Runs synthetic timing/equivalence evidence outside the continuous live loop. |

## Suggested reading order

1. `music_LED.ino` for the top-level device flow.
2. This worked matrix example.
3. `DirectDFT.cpp` for the matrix-row calculation.
4. `SpectrumAnalysis.cpp` and `FrequencyToColor.cpp` for the meaning assigned to coefficients.
5. The butterfly example above, then `FastFourierTransform.cpp` for bit reversal and its repeated combine stages.
6. `fourier_tests.cpp` for known results, equivalence, and linearity evidence.
7. `AudioSampler.cpp` and `AudioReactive.cpp` only after the mathematical path is understood.
