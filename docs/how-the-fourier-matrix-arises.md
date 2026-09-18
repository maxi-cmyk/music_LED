# How the Fourier matrix and column vectors arise

This guide builds the discrete Fourier transform (DFT) from the measurements made by the ESP32. The matrix is not introduced as a formula to memorize: it appears naturally when the same frequency-measuring calculation is written for every output frequency.

## 1. Sampling produces a list of numbers

A microphone voltage changes continuously with time. The ESP32 cannot store every point on that continuous signal, so it measures the voltage at equally spaced times.

For a frame of $N$ measurements, name the samples

$$
x[0],\;x[1],\;x[2],\;\ldots,\;x[N-1].
$$

These values are written as a column vector:

$$
\mathbf{x} =
\begin{bmatrix}
x[0] \\
x[1] \\
x[2] \\
\vdots \\
x[N-1]
\end{bmatrix}.
$$

The vector is a compact way to treat one audio frame as a single mathematical object. It has $N$ rows and one column, so its dimensions are $N\times 1$.

Using a column rather than a row is a convention that lets a matrix act on the samples from the left. The physical samples do not arrive vertically; the column layout is how we organize them for matrix multiplication.

## 2. One frequency requires one weighted sum

Suppose we want to measure frequency bin $k$. We compare every sample $x[n]$ with the complex sinusoidal pattern for that bin.

The weight applied to sample $n$ is

$$
e^{-2\pi i kn/N}.
$$

Multiplying each sample by its weight and adding the results gives one DFT coefficient:

$$
X[k] = \sum_{n=0}^{N-1} x[n]e^{-2\pi i kn/N}.
$$

Writing the sum term by term makes its structure visible:

$$
X[k]
= e^{-2\pi i k(0)/N}x[0]
+ e^{-2\pi i k(1)/N}x[1]
+ \cdots
+ e^{-2\pi i k(N-1)/N}x[N-1].
$$

This is a row-by-column multiplication. The weights form a row vector and the samples form the column vector:

$$
X[k] =
\begin{bmatrix}
e^{-2\pi i k(0)/N} &
e^{-2\pi i k(1)/N} &
\cdots &
e^{-2\pi i k(N-1)/N}
\end{bmatrix}
\begin{bmatrix}
x[0] \\
x[1] \\
\vdots \\
x[N-1]
\end{bmatrix}.
$$

The result is one number, $X[k]$, describing how strongly the input matches frequency bin $k$, including phase information.

## 3. Every frequency produces another row

The DFT calculates $N$ output coefficients:

$$
X[0],\;X[1],\;X[2],\;\ldots,\;X[N-1].
$$

Each coefficient uses the same sample vector but a different set of frequency weights. Stacking all $N$ weight rows creates the Fourier matrix $F$:

$$
F =
\begin{bmatrix}
e^{-2\pi i(0)(0)/N} & e^{-2\pi i(0)(1)/N} & \cdots & e^{-2\pi i(0)(N-1)/N} \\
e^{-2\pi i(1)(0)/N} & e^{-2\pi i(1)(1)/N} & \cdots & e^{-2\pi i(1)(N-1)/N} \\
e^{-2\pi i(2)(0)/N} & e^{-2\pi i(2)(1)/N} & \cdots & e^{-2\pi i(2)(N-1)/N} \\
\vdots & \vdots & \ddots & \vdots \\
e^{-2\pi i(N-1)(0)/N} & e^{-2\pi i(N-1)(1)/N} & \cdots & e^{-2\pi i(N-1)(N-1)/N}
\end{bmatrix}.
$$

The entry in row $k$ and column $n$ is therefore

$$
F[k,n] = e^{-2\pi i kn/N}.
$$

The row index $k$ chooses the frequency bin. The column index $n$ chooses the time sample that receives the weight.

## 4. The output is also a column vector

Because every matrix row produces one coefficient, the results naturally stack into another column vector:

$$
\mathbf{X} =
\begin{bmatrix}
X[0] \\
X[1] \\
X[2] \\
\vdots \\
X[N-1]
\end{bmatrix}.
$$

The entire DFT can now be written as one matrix equation:

$$
\underbrace{\mathbf{X}}_{N\times 1}
=
\underbrace{F}_{N\times N}
\underbrace{\mathbf{x}}_{N\times 1}.
$$

The dimensions explain why the multiplication works:

$$
(N\times N)(N\times 1) = N\times 1.
$$

Each row of $F$ meets the complete input column $\mathbf{x}$ and produces one entry of the output column $\mathbf{X}$.

## 5. Four-sample example

For $N=4$, define

$$
\omega = e^{-2\pi i/4} = -i.
$$

The matrix entries are powers of $\omega$:

$$
F[k,n] = \omega^{kn}.
$$

Evaluating those powers gives

$$
F_4 =
\begin{bmatrix}
1 & 1 & 1 & 1 \\
1 & -i & -1 & i \\
1 & -1 & 1 & -1 \\
1 & i & -1 & -i
\end{bmatrix}.
$$

For the sample vector

$$
\mathbf{x} =
\begin{bmatrix}
1 \\ 0 \\ -1 \\ 0
\end{bmatrix},
$$

matrix multiplication produces

$$
\mathbf{X} = F_4\mathbf{x}
=
\begin{bmatrix}
0 \\ 2 \\ 0 \\ 2
\end{bmatrix}.
$$

For example, the second matrix row produces the second output entry:

$$
X[1]
= 1(1) + (-i)(0) + (-1)(-1) + i(0)
= 2.
$$

The code in `DirectDFT.cpp` performs this same calculation one row at a time. It computes each matrix entry when needed instead of storing the full matrix.

## 6. What the rows and columns mean

- A column of $\mathbf{x}$ contains amplitudes ordered by time.
- A row of $F$ contains the complex weights for one frequency bin.
- A column of $F$ shows how one time sample contributes to every frequency bin.
- A column of $\mathbf{X}$ contains complex coefficients ordered by frequency bin.

The input and output both contain $N$ entries, but their coordinates describe different things. The input uses time-sample coordinates; the output uses frequency-pattern coordinates.

## 7. Why the FFT gives the same vector

Direct matrix multiplication repeats many related calculations. The fast Fourier transform factors and reuses those calculations through smaller even-indexed and odd-indexed transforms.

The FFT does not create a different output or a different meaning for the vectors. With the same sign and normalization convention, it computes the same equation

$$
\mathbf{X} = F\mathbf{x}
$$

more efficiently.
