# Fourier demo Q&A bank

1. **What is the Fourier transform?** It represents a signal using sinusoidal frequency components instead of values over time.
2. **Why show both the continuous transform and DFT?** The continuous form introduces the idea; the ESP32 records a finite sample vector, so its actual computation is the DFT.
3. **What is the FFT?** It is an algorithm that computes the same DFT coefficients with structured reuse. It is not a different transform.
4. **Where is the linear algebra?** For `N` samples, the DFT is `X = F x`, where `F` is an `N × N` complex Fourier matrix and both `x` and `X` are `N × 1` vectors.
5. **What does one Fourier-matrix row do?** Its complex inner product with the input measures the coefficient for one frequency-bin direction.
6. **Why are complex numbers needed?** Their real and imaginary parts encode amplitude and phase relative to cosine and sine components.
7. **Why do real signals produce paired coefficients?** They have conjugate symmetry: the upper-half coefficient is the negative-frequency partner of a lower-half coefficient.
8. **What sign and normalization do you use?** The forward exponent is negative and the forward transform is unnormalized. The inverse therefore includes `1/N`.
9. **Is the entire sound-to-colour system linear?** No. The DFT is linear, but magnitude, thresholding, clipping, and RGB mapping introduce nonlinear steps.
10. **How did you verify correctness?** Known inputs have expected coefficients, DFT and FFT full complex outputs agree at four sizes, and a numerical superposition test verifies linearity.
11. **Why is the live frame 128 samples?** It is a power of two for radix-2 FFT and gives a short 20 ms nominal frame at 6400 samples per second.
12. **Why are bins 50 Hz apart?** Bin spacing is `f_s/N = 6400/128 = 50 Hz`.
13. **Does 50 Hz bin spacing mean any two tones 50 Hz apart are always resolved?** No. Resolution also depends on frame length, windowing, signal strength, noise, and leakage.
14. **What is the Nyquist frequency?** Half the sample rate, 3200 Hz here. Frequencies above it can alias into lower apparent frequencies.
15. **Does the project have a verified anti-alias filter?** No verified external filter is claimed, so controlled tones stay below Nyquist and music results are qualitative.
16. **Why subtract the frame mean?** It removes the microphone's DC offset so the zero-frequency coefficient does not dominate.
17. **Why apply a Hamming window?** It reduces leakage from discontinuities at the frame edges, while broadening peaks and changing magnitude scaling.
18. **What happens at 225 Hz?** It lies between 200 and 250 Hz bin centres, so its energy spreads across nearby coefficients rather than occupying one bin.
19. **Why should DFT be `O(N²)`?** It calculates `N` output rows, each using `N` input terms.
20. **Why should FFT be `O(N log N)`?** Radix-2 recursion has `log₂N` stages with about `N` work per stage.
21. **Does the timing table prove asymptotic complexity?** No. It measures these implementations at finite sizes and supports the structural explanation.
22. **What exactly is timed?** Only the transform call. Acquisition, preprocessing, output magnitude, serial printing, LED updates, and test-signal construction are outside the timed region. The current FFT call includes its internal copy and twiddle calculations.
23. **How is measurement noise handled?** Runs are warmed up and repeated; the median, minimum, and maximum are reported, and a checksum consumes outputs.
24. **How are frequencies mapped to colour?** Bins 1–5 contribute red, 6–20 green, and 21–50 blue. DC and higher bins do not contribute.
25. **Why use fixed gains?** Fixed calibration preserves comparisons. Independent per-band normalization could make a weak component look falsely equal to a strong one.
26. **Why might equal generated tones not look yellow?** The speaker, room, microphone, electronics, and LED channels have different responses, so physical calibration is required.
27. **Can the LED reconstruct the sound?** No. Three brightness values summarize selected band strengths; most coefficient amplitude and all phase detail are discarded.
28. **What if the live demonstration fails?** The team can use labelled saved device output and the synthetic benchmark while still explaining the complete mathematics and limitation.
