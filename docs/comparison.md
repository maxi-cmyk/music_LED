# Comparing the DFT and FFT

The discrete Fourier transform (DFT) defines the frequency-domain vector. The fast Fourier transform (FFT) is an algorithm for calculating that same vector with less repeated work.

This distinction is the main idea:

$$
\boxed{\text{DFT} = \text{the transformation}}
\qquad
\boxed{\text{FFT} = \text{a faster way to compute it}}.
$$

The direct DFT and the radix-2 FFT in this project use the same negative-exponent, unnormalized convention. Given the same input vector, they should therefore produce the same complex coefficient vector, apart from small floating-point rounding differences.

## 1. The direct DFT is the reference calculation

For an input vector with $N$ samples, the DFT coefficient at frequency bin $k$ is

$$
X[k] = \sum_{n=0}^{N-1} x[n]e^{-2\pi i kn/N}.
$$

Define the twiddle factor

$$
W_N=e^{-2\pi i/N}.
$$

The same equation can then be written more compactly as

$$
X[k] = \sum_{n=0}^{N-1}x[n]W_N^{kn}.
$$

The direct implementation evaluates this complete sum for every $k$. There are $N$ output coefficients and each uses $N$ input terms, so its work grows as

$$
O(N^2).
$$

This calculation is valuable because it mirrors the Fourier-matrix equation $\mathbf{X}=F\mathbf{x}$ one row at a time. Its weakness is that related matrix entries are recalculated instead of reused.

## 2. Split one DFT into even and odd samples

Assume that $N$ is even. Every sample index is either $n=2r$ or $n=2r+1$, so split the DFT sum into those two groups:

$$
\begin{aligned}
X[k]
&=\sum_{r=0}^{N/2-1}x[2r]W_N^{k(2r)}
+\sum_{r=0}^{N/2-1}x[2r+1]W_N^{k(2r+1)} \\
&=\sum_{r=0}^{N/2-1}x[2r]\left(W_N^2\right)^{kr}
+W_N^k\sum_{r=0}^{N/2-1}x[2r+1]\left(W_N^2\right)^{kr}.
\end{aligned}
$$

Because

$$
W_N^2=e^{-2\pi i/(N/2)}=W_{N/2},
$$

the two sums are themselves DFTs of length $N/2$. Name them

$$
E[k]=\sum_{r=0}^{N/2-1}x[2r]W_{N/2}^{kr},
\qquad
O[k]=\sum_{r=0}^{N/2-1}x[2r+1]W_{N/2}^{kr}.
$$

Therefore,

$$
X[k]=E[k]+W_N^kO[k].
$$

The FFT has not changed the transformation. It has recognized two smaller DFTs already contained inside the original sum.

## 3. One butterfly produces two coefficients

The length-$N/2$ results repeat with period $N/2$, while

$$
W_N^{k+N/2}=W_N^k e^{-\pi i}=-W_N^k.
$$

That gives the paired output

$$
X[k+N/2]=E[k]-W_N^kO[k].
$$

Together, the two butterfly equations are

$$
\begin{aligned}
X[k]&=E[k]+W_N^kO[k], \\
X[k+N/2]&=E[k]-W_N^kO[k].
\end{aligned}
$$

The rotated odd result $W_N^kO[k]$ is calculated once and reused: addition gives one output and subtraction gives its paired output. This reuse is the basic FFT butterfly.

## 4. Worked comparison for four samples

Use a vector with nonzero even and odd subsequences:

$$
\mathbf{x}=
\begin{bmatrix}
1 \\ 2 \\ 3 \\ 4
\end{bmatrix}.
$$

### Direct DFT

Multiplying by the four-point Fourier matrix gives

$$
\begin{aligned}
\mathbf{X}_{\mathrm{DFT}}
&=
\begin{bmatrix}
1 & 1 & 1 & 1 \\
1 & -i & -1 & i \\
1 & -1 & 1 & -1 \\
1 & i & -1 & -i
\end{bmatrix}
\begin{bmatrix}
1 \\ 2 \\ 3 \\ 4
\end{bmatrix} \\
&=
\begin{bmatrix}
10 \\ -2+2i \\ -2 \\ -2-2i
\end{bmatrix}.
\end{aligned}
$$

### Radix-2 FFT

First separate the input by index parity:

$$
\mathbf{x}_{\mathrm{even}}=
\begin{bmatrix}1\\3\end{bmatrix},
\qquad
\mathbf{x}_{\mathrm{odd}}=
\begin{bmatrix}2\\4\end{bmatrix}.
$$

Their two-point DFTs are

$$
\mathbf{E}=
\begin{bmatrix}4\\-2\end{bmatrix},
\qquad
\mathbf{O}=
\begin{bmatrix}6\\-2\end{bmatrix}.
$$

For $k=0$, $W_4^0=1$:

$$
X[0]=4+6=10,
\qquad
X[2]=4-6=-2.
$$

For $k=1$, $W_4^1=-i$ and $W_4^1O[1]=(-i)(-2)=2i$:

$$
X[1]=-2+2i,
\qquad
X[3]=-2-2i.
$$

Both methods therefore produce the same result:

| Bin $k$ | Direct DFT | Radix-2 FFT | Difference |
|---:|---:|---:|---:|
| 0 | $10$ | $10$ | $0$ |
| 1 | $-2+2i$ | $-2+2i$ | $0$ |
| 2 | $-2$ | $-2$ | $0$ |
| 3 | $-2-2i$ | $-2-2i$ | $0$ |

The calculation paths differ, but the meaning and order of the output coefficients do not.

## 5. Recursing produces the speedup

If each smaller DFT is split again, a power-of-two input eventually reaches two-point butterflies. At recursion level $\ell$ there are $2^\ell$ subproblems, each of size $N/2^\ell$, so the total work per level remains proportional to $N$:

$$
2^\ell\left(\frac{N}{2^\ell}\right)=N.
$$

There are $\log_2N$ levels. The recurrence and resulting growth are

$$
\begin{aligned}
T(N)&=2T(N/2)+O(N), \\
T(N)&=O(N\log_2N).
\end{aligned}
$$

For the project's $N=128$ frame:

| Comparison | Direct DFT | Radix-2 FFT |
|---|---:|---:|
| Growth model | $O(N^2)$ | $O(N\log_2N)$ |
| Growth indicator at $N=128$ | $128^2=16{,}384$ | $128\log_2(128)=896$ |
| Structure | 128 complete row sums | 7 stages of butterflies |

The numbers $16{,}384$ and $896$ illustrate growth; they are not equivalent counts of processor instructions. A radix-2 stage contains $N/2=64$ butterflies here, giving $64\times7=448$ butterflies in total. Actual elapsed time also depends on copying, trigonometric calculations, memory access, compiler optimization, and the processor.

## 6. Why this implementation uses a power of two

The project's FFT repeatedly halves the problem, so its supported sizes are powers of two. The live frame uses $N=128=2^7$.

The iterative firmware implementation performs the same factorization without recursive function calls:

1. Copy the real samples into a complex working array.
2. Reorder entries by bit-reversed index so each small subproblem becomes adjacent.
3. Apply length-2 butterflies.
4. Double the block size and apply the next butterfly stage.
5. Continue through block sizes 4, 8, 16, 32, 64, and 128.

The direct DFT can accept non-power-of-two sizes because its formula does not require repeated halving. Other FFT algorithms can support other factorizations, but this project deliberately uses the simpler radix-2 case.

## 7. Comparing numerical results

Exact arithmetic would make both algorithms identical. Firmware uses finite-precision floating-point numbers, and the two methods add and multiply values in different orders, so very small numerical differences are expected.

The automated tests compare every real and imaginary component, not only magnitudes. Across the tested known signals, the direct DFT and FFT agree within an absolute tolerance of $0.02$ plus a relative tolerance of $0.0002$ times the coefficient magnitude.

The largest recorded complex difference in the host checks was approximately $0.002285$ for a 256-sample cosine. That is within the stated tolerance and is evidence of floating-point ordering effects, not a different frequency result.

The provisional host benchmark provides a separate performance comparison:

| $N$ | Maximum complex error | Direct DFT median | FFT median | Measured speedup |
|---:|---:|---:|---:|---:|
| 32 | 0.000037 | 8.625 µs | 0.417 µs | 20.7× |
| 64 | 0.000284 | 39.292 µs | 0.917 µs | 42.8× |
| 128 | 0.000902 | 178.042 µs | 2.042 µs | 87.2× |
| 256 | 0.002175 | 695.042 µs | 4.709 µs | 147.6× |

These timings were measured on the development computer. They demonstrate the expected trend and exercise the benchmark pipeline, but they must not be presented as ESP32 timing. The final hardware comparison must use the on-device benchmark described in [`validation-results.md`](validation-results.md).

## 8. What the live system actually does

The direct DFT exists as a readable reference and diagnostic implementation. The continuous audio path uses the FFT:

```text
128 prepared samples
        ↓
radix-2 FFT
        ↓
128 complex DFT coefficients
        ↓
magnitudes and frequency bands
        ↓
RGB output
```

The LED output is not evidence that the FFT is correct. Correctness comes from known transform results and direct DFT/FFT coefficient comparison. The LED is a later visualization of selected coefficient magnitudes.

## 9. Code and evidence map

| File | Purpose |
|---|---|
| `firmware/music_LED/src/fourier/DirectDFT.cpp` | Evaluates every DFT row sum directly. |
| `firmware/music_LED/src/fourier/FastFourierTransform.cpp` | Computes the same coefficients using bit reversal and iterative butterflies. |
| `firmware/music_LED/src/demo/FourierDiagnostics.cpp` | Compares complex outputs and measures both implementations on the ESP32. |
| `tests/fourier_tests.cpp` | Checks known transforms, full complex agreement, and linearity. |
| `tests/fourier_benchmark.cpp` | Produces the provisional host timing comparison. |
| [`validation-results.md`](validation-results.md) | Records test tolerances, observed errors, timing boundaries, and hardware status. |

Read [`fourier-walkthrough.md`](fourier-walkthrough.md) first for the transform and matrix interpretation, then use this comparison to understand why the live implementation can calculate the same result more efficiently.
