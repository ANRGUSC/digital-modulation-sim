# Digital Modulation Simulator

An interactive, educational web application for exploring digital modulation schemes in wireless communications. Built for graduate students studying wireless networks and digital communications.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-brightgreen.svg)](https://digital-modulation-sim.vercel.app)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue.svg)](LICENSE.md)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

**[Try the Live Demo →](https://digital-modulation-sim.vercel.app)**

## Overview

This simulator makes abstract modulation concepts tangible through real-time visualization. Students can experiment with different modulation schemes, adjust signal-to-noise ratios, and observe how these changes affect bit error rates, constellation diagrams, and waveforms.

### Key Features

- **5 Modulation Schemes**: BPSK, QPSK, 8-PSK, 16-QAM, and 64-QAM
- **Real-time Simulation**: Watch symbols transmit, add noise, and get decoded
- **Constellation Diagrams**: See ideal points and noisy received symbols
- **BER Performance Curves**: Compare simulated vs theoretical bit error rates
- **Time-Domain Waveforms**: Visualize transmitted and received I/Q signals
- **Passband Waveforms**: See actual RF signal shapes for each symbol
- **Frequency Spectrum**: Understand bandwidth and pulse shaping effects
- **Interactive Controls**: Adjust SNR, playback speed, and pulse shaping

## Educational Value

This tool helps students understand:

| Concept | What You'll Learn |
|---------|-------------------|
| **Constellation Mapping** | How bits map to I/Q symbols using Gray coding |
| **AWGN Channel** | How noise affects received symbols |
| **BER vs SNR** | The fundamental trade-off in digital communications |
| **Modulation Trade-offs** | Higher order = more bits/symbol but needs more SNR |
| **Spectral Efficiency** | Why bandwidth depends on symbol rate, not modulation order |
| **Pulse Shaping** | How raised cosine reduces bandwidth vs rectangular pulses |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ANRGUSC/digital-modulation-sim.git
cd digital-modulation-sim

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage Guide

### 1. Select a Modulation Scheme

Click on BPSK, QPSK, 8-PSK, 16-QAM, or 64-QAM to change the modulation. Notice how:
- The constellation diagram updates with new symbol positions
- The BER curve changes (higher order schemes need more SNR)
- The passband waveforms show different phase/amplitude patterns

### 2. Adjust the SNR

Use the Eb/N0 slider to change the signal-to-noise ratio:
- **Low SNR (-5 to 5 dB)**: High noise, constellation points scatter widely, many errors
- **Medium SNR (5-15 dB)**: Transition region, some errors occur
- **High SNR (15+ dB)**: Low noise, clean constellation, few errors

### 3. Run the Simulation

- **Play**: Continuously generate and transmit symbols
- **Step**: Advance one symbol at a time
- **Reset**: Clear statistics and start fresh
- **Speed**: Adjust symbols per second

### 4. Observe the Results

- **Waveforms**: See how noise corrupts the transmitted signal
- **Constellation**: Watch received symbols scatter around ideal points
- **BER Plot**: See simulated BER converge toward theoretical curve
- **Statistics**: Track bit errors and compare simulated vs theoretical BER

### 5. Explore Pulse Shaping

In the Modulation Waveform Reference section:
- Toggle between **Rectangular** and **Raised Cosine** pulse shaping
- Observe the frequency spectrum change
- Note how raised cosine has finite bandwidth while rectangular has infinite (sinc) spectrum

## Project Structure

```
digital-modulation-sim/
├── src/
│   ├── components/          # React UI components
│   │   ├── BERPlot.tsx           # BER vs SNR chart
│   │   ├── ConstellationDiagram.tsx
│   │   ├── ModulationSelector.tsx
│   │   ├── ModulationWaveforms.tsx  # Passband & spectrum
│   │   ├── PlaybackControls.tsx
│   │   ├── SNRSlider.tsx
│   │   ├── StatisticsPanel.tsx
│   │   └── WaveformDisplay.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useSimulation.ts      # Core simulation logic
│   │   └── useAnimationFrame.ts
│   ├── utils/               # Signal processing utilities
│   │   ├── math.ts              # Q-function, complex math
│   │   ├── modulation.ts        # Constellation generation, mod/demod
│   │   ├── channel.ts           # AWGN noise
│   │   ├── theory.ts            # Theoretical BER formulas
│   │   └── waveform.ts          # Time-domain signal generation
│   ├── types/               # TypeScript definitions
│   ├── App.tsx              # Main application
│   └── index.css            # Tailwind styles
├── questions.txt            # Review questions for students
├── LICENSE.md               # PolyForm Noncommercial License
└── README.md
```

## Technical Details

### Theoretical BER Formulas

The simulator uses these closed-form expressions for AWGN channels:

| Scheme | BER Formula |
|--------|-------------|
| BPSK | Pb = Q(√(2·Eb/N0)) |
| QPSK | Pb = Q(√(2·Eb/N0)) — same as BPSK! |
| 8-PSK | Pb ≈ (2/3)·Q(√(6·Eb/N0)·sin(π/8)) |
| 16-QAM | Pb ≈ (3/4)·Q(√(0.8·Eb/N0)) |
| 64-QAM | Pb ≈ (7/12)·Q(√(2/7·Eb/N0)) |

### Gray Coding

All constellation mappings use Gray coding, where adjacent symbols differ by only one bit. This minimizes bit errors when symbol errors occur (since errors typically go to adjacent symbols).

### Technologies Used

- **React 18** with hooks for UI
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Recharts** for the BER plot
- **HTML Canvas** for waveforms and constellation diagrams

## Review Questions

See `questions.txt` for 10 review questions that students can answer after using the simulator. Topics include:
- QPSK vs BPSK performance
- Bits per symbol calculations
- Effects of SNR on constellation
- Gray coding benefits
- Bandwidth and pulse shaping

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).

- **Non-commercial use**: Free for educational, research, and personal use
- **Commercial use**: Requires a separate commercial license

For commercial licensing inquiries, please contact the author.

## Author

**Bhaskar Krishnamachari**
University of Southern California
EE597 - Wireless Networks

Developed with Claude Code, January 2026

## Acknowledgments

- Built as an educational tool for USC's wireless networks curriculum
- Theoretical formulas based on standard digital communications textbooks (Proakis, Sklar)
