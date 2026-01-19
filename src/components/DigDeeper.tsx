/**
 * Dig Deeper Component
 *
 * Educational page showing how key simulation algorithms are implemented.
 * Designed for grad students who want to understand the code behind the visualizations.
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

// =============================================================================
// CODE EXAMPLES DATA
// =============================================================================

interface MathEquation {
  label: string;
  formula: string;
}

interface MathTableData {
  title: string;
  equations: MathEquation[];
}

interface CodeExample {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  keyPoints: string[];
  code: string;
  sourceFile: string;
  mathFormula?: string;
  mathTable?: MathTableData;
}

const CODE_EXAMPLES: CodeExample[] = [
  {
    id: 1,
    title: 'The Q-Function',
    subtitle: 'Foundation of BER Calculations',
    description: `The Q-function gives the probability that a standard Gaussian random variable exceeds a threshold. It's fundamental to all BER calculations because errors occur when noise exceeds the decision boundary.`,
    keyPoints: [
      'Q(x) = P(Z > x) where Z ~ N(0,1)',
      'For BPSK: BER = Q(√(2·Eb/N0))',
      'Uses Abramowitz & Stegun polynomial approximation',
      'Accurate to ~10⁻⁷',
    ],
    mathFormula: 'Q(x) = \\frac{1}{\\sqrt{2\\pi}} \\int_x^{\\infty} e^{-t^2/2} dt',
    code: `function qFunction(x: number): number {
  // Handle negative x using symmetry: Q(-x) = 1 - Q(x)
  if (x < 0) {
    return 1 - qFunction(-x);
  }

  // For very large x, Q(x) ≈ 0
  if (x > 8) {
    return 0;
  }

  // Abramowitz & Stegun approximation (Formula 26.2.17)
  const t = 1 / (1 + 0.2316419 * x);

  // Polynomial coefficients
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  // Standard normal PDF at x
  const pdf = 0.3989422804 * Math.exp(-0.5 * x * x);

  // Horner's method for polynomial evaluation
  const polynomial = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));

  return pdf * polynomial;
}`,
    sourceFile: 'src/utils/math.ts',
  },
  {
    id: 2,
    title: 'Theoretical BER Formulas',
    subtitle: 'Closed-Form Error Probability',
    description: `Each modulation scheme has a theoretical BER formula derived from the geometry of the constellation and the statistics of Gaussian noise. These formulas let us validate simulations and predict performance.`,
    keyPoints: [
      'BPSK/QPSK have identical BER per bit',
      'Higher-order modulation requires higher SNR',
      'Gray coding ensures adjacent symbol errors cause only 1 bit error',
      'Formulas assume AWGN channel and perfect synchronization',
    ],
    mathTable: {
      title: 'BER Formulas for AWGN Channel',
      equations: [
        { label: 'BPSK', formula: 'P_b = Q\\left(\\sqrt{2 \\cdot E_b/N_0}\\right)' },
        { label: 'QPSK', formula: 'P_b = Q\\left(\\sqrt{2 \\cdot E_b/N_0}\\right) \\quad \\text{(same as BPSK!)}' },
        { label: '8-PSK', formula: 'P_b \\approx \\frac{2}{3} \\cdot Q\\left(\\sqrt{6 \\cdot E_b/N_0} \\cdot \\sin\\frac{\\pi}{8}\\right)' },
        { label: '16-QAM', formula: 'P_b \\approx \\frac{3}{4} \\cdot Q\\left(\\sqrt{\\frac{4}{5} \\cdot E_b/N_0}\\right)' },
        { label: '64-QAM', formula: 'P_b \\approx \\frac{7}{12} \\cdot Q\\left(\\sqrt{\\frac{2}{7} \\cdot E_b/N_0}\\right)' },
      ],
    },
    code: `// BPSK: Simplest and most robust
function berBPSK(ebN0: number): number {
  return qFunction(Math.sqrt(2 * ebN0));
}

// QPSK: Same BER as BPSK but 2x data rate!
function berQPSK(ebN0: number): number {
  return qFunction(Math.sqrt(2 * ebN0));
}

// M-QAM general formula
function berMQAM(M: number, ebN0: number): number {
  const k = Math.log2(M);        // bits per symbol
  const sqrtM = Math.sqrt(M);

  // Factor: (4/k)(1 - 1/√M)
  const factor = (4 / k) * (1 - 1 / sqrtM);

  // Argument: √(3k·Eb/N0 / (M-1))
  const arg = Math.sqrt((3 * k * ebN0) / (M - 1));

  return factor * qFunction(arg);
}`,
    sourceFile: 'src/utils/theory.ts',
  },
  {
    id: 3,
    title: 'Constellation Generation',
    subtitle: 'Gray-Coded Symbol Mapping',
    description: `Constellation points map bit sequences to I/Q coordinates. Gray coding ensures adjacent points differ by only one bit, minimizing bit errors when symbol errors occur to neighboring points.`,
    keyPoints: [
      'QPSK: 4 points at 45°, 135°, 225°, 315°',
      'QAM: Rectangular grid with amplitude + phase variation',
      'Gray code: adjacent symbols differ by 1 bit',
      'Normalized for unit average symbol energy',
    ],
    code: `// QPSK constellation with Gray coding
function generateQPSK(): ConstellationPoint[] {
  const scale = 1 / Math.sqrt(2);  // Normalize to unit energy

  return [
    { I:  scale, Q:  scale, bits: '00' },  // Quadrant I  (45°)
    { I: -scale, Q:  scale, bits: '01' },  // Quadrant II (135°)
    { I: -scale, Q: -scale, bits: '11' },  // Quadrant III (225°)
    { I:  scale, Q: -scale, bits: '10' },  // Quadrant IV (315°)
  ];
}

// 16-QAM: 4x4 grid with Gray coding on each axis
function generate16QAM(): ConstellationPoint[] {
  const gray2 = ['00', '01', '11', '10'];  // 2-bit Gray code
  const coords = [-3, -1, 1, 3];
  const scale = 1 / Math.sqrt(10);  // Normalize for unit avg energy

  const points: ConstellationPoint[] = [];
  for (let qi = 0; qi < 4; qi++) {
    for (let ii = 0; ii < 4; ii++) {
      points.push({
        I: coords[ii] * scale,
        Q: coords[qi] * scale,
        bits: gray2[ii] + gray2[qi],  // I bits + Q bits
      });
    }
  }
  return points;
}`,
    sourceFile: 'src/utils/modulation.ts',
  },
  {
    id: 4,
    title: 'AWGN Channel Model',
    subtitle: 'Adding Realistic Noise',
    description: `The Additive White Gaussian Noise channel is the fundamental model for thermal noise. The received signal is r = s + n, where n is complex Gaussian noise with variance determined by SNR.`,
    keyPoints: [
      'Noise variance σ² = 1/(Es/N0) for normalized symbols',
      'Es/N0 = Eb/N0 × bits_per_symbol',
      'Complex noise: independent Gaussian on I and Q',
      'Circularly symmetric (equal power in all directions)',
    ],
    mathFormula: 'r = s + n, \\quad n \\sim \\mathcal{CN}(0, N_0)',
    code: `// Calculate noise variance from SNR
function calculateNoiseVariance(
  ebN0Db: number,
  scheme: ModulationScheme
): number {
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];

  // Convert Eb/N0 from dB to linear
  const ebN0Linear = Math.pow(10, ebN0Db / 10);

  // Convert to Es/N0: Es = Eb × k
  const esN0Linear = ebN0Linear * bitsPerSymbol;

  // Noise variance = 1/Es/N0 (for normalized symbols)
  return 1 / esN0Linear;
}

// Add AWGN to transmitted symbols
function addAWGN(
  symbols: Complex[],
  ebN0Db: number,
  scheme: ModulationScheme
): Complex[] {
  const noiseVariance = calculateNoiseVariance(ebN0Db, scheme);

  return symbols.map(symbol => {
    const noise = complexGaussianRandom(noiseVariance);
    return {
      I: symbol.I + noise.I,
      Q: symbol.Q + noise.Q,
    };
  });
}`,
    sourceFile: 'src/utils/channel.ts',
  },
  {
    id: 5,
    title: 'Raised Cosine Pulse Shaping',
    subtitle: 'Bandwidth-Efficient Transmission',
    description: `The raised cosine filter shapes symbol pulses to control bandwidth while achieving zero inter-symbol interference (ISI) at sampling points. In the frequency domain, it has a flat passband and smooth roll-off, with total bandwidth B = (1+α)/2T. The roll-off factor α trades bandwidth for time-domain smoothness.`,
    keyPoints: [
      'Satisfies Nyquist criterion: zero ISI at sample times',
      'Roll-off α=0: minimum bandwidth 1/2T (ideal sinc, infinite time duration)',
      'Roll-off α=1: maximum smoothness, bandwidth = 1/T (2× minimum)',
      'Practical systems use α = 0.2 to 0.5 (good tradeoff)',
      'Frequency response has flat passband |f| < (1-α)/2T',
      'Smooth cosine roll-off in transition band (1-α)/2T < |f| < (1+α)/2T',
    ],
    mathTable: {
      title: 'Raised Cosine Filter (Time & Frequency Domain)',
      equations: [
        { label: 'Time Domain', formula: 'p(t) = \\text{sinc}\\left(\\frac{t}{T}\\right) \\cdot \\frac{\\cos(\\pi\\alpha t/T)}{1-(2\\alpha t/T)^2}' },
        { label: 'Freq Domain', formula: 'P(f) = \\begin{cases} T & |f| \\leq \\frac{1-\\alpha}{2T} \\\\ \\frac{T}{2}\\left[1 + \\cos\\left(\\frac{\\pi T}{\\alpha}\\left(|f| - \\frac{1-\\alpha}{2T}\\right)\\right)\\right] & \\frac{1-\\alpha}{2T} < |f| \\leq \\frac{1+\\alpha}{2T} \\\\ 0 & |f| > \\frac{1+\\alpha}{2T} \\end{cases}' },
        { label: 'Bandwidth', formula: 'B = \\frac{1+\\alpha}{2T} \\quad \\text{where } T = \\text{symbol period}' },
      ],
    },
    code: `// Raised cosine pulse shape
function raisedCosinePulse(t: number, alpha: number = 0.5): number {
  // Special case at t = 0
  if (Math.abs(t) < 1e-10) {
    return 1;
  }

  // Special case at t = ±1/(2α)
  const specialPoint = 1 / (2 * alpha);
  if (alpha > 0 && Math.abs(Math.abs(t) - specialPoint) < 1e-10) {
    return (Math.PI / 4) * sinc(specialPoint);
  }

  // General formula: sinc(t) × cos(πα·t) / (1 - (2α·t)²)
  const sincTerm = sinc(t);
  const cosTerm = Math.cos(Math.PI * alpha * t);
  const denominator = 1 - Math.pow(2 * alpha * t, 2);

  return sincTerm * cosTerm / denominator;
}

// Sinc function: sin(πx)/(πx)
function sinc(x: number): number {
  if (Math.abs(x) < 1e-10) return 1;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}`,
    sourceFile: 'src/utils/waveform.ts',
  },
  {
    id: 6,
    title: 'Box-Muller Transform',
    subtitle: 'Generating Gaussian Random Numbers',
    description: `The Box-Muller transform converts uniform random numbers into Gaussian random numbers. This is how we generate the noise samples that simulate a real communication channel.`,
    keyPoints: [
      'Transforms U₁, U₂ ~ Uniform(0,1) to Z₁, Z₂ ~ N(0,1)',
      'Produces two independent Gaussian samples',
      'Thermal noise follows Gaussian distribution (Central Limit Theorem)',
      'Efficient: only needs log, sqrt, sin, cos',
    ],
    mathFormula: 'Z_1 = \\sqrt{-2\\ln U_1} \\cos(2\\pi U_2)',
    code: `// Generate complex Gaussian noise using Box-Muller
function complexGaussianRandom(variance: number = 1): Complex {
  // Each I/Q component gets half the total variance
  const stdDev = Math.sqrt(variance / 2);

  // Box-Muller transform
  const u1 = Math.max(Math.random(), 1e-10);  // Avoid log(0)
  const u2 = Math.random();

  const magnitude = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;

  // Two independent Gaussian samples
  const I = stdDev * magnitude * Math.cos(angle);
  const Q = stdDev * magnitude * Math.sin(angle);

  return { I, Q };
}

// Why Gaussian? The Central Limit Theorem:
// Sum of many small random effects → Gaussian distribution
// Thermal noise = sum of electron movements = Gaussian!`,
    sourceFile: 'src/utils/math.ts',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const DigDeeper: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(1);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">
                Dig Deeper: Implementation Details
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Explore the code behind the simulation - key algorithms explained
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              <span>&larr;</span>
              <span>Back to Simulator</span>
            </Link>
          </div>
        </header>

        {/* Introduction */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-300">
            This page presents the core algorithms that power the Digital Modulation Simulator.
            Each example shows actual TypeScript code from the project, with explanations of the
            underlying mathematics and engineering principles. Click on any topic to expand it.
          </p>
        </div>

        {/* Code Examples */}
        <div className="space-y-4">
          {CODE_EXAMPLES.map((example) => (
            <CodeExampleCard
              key={example.id}
              example={example}
              isExpanded={expandedId === example.id}
              onToggle={() => toggleExpand(example.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center text-sm text-slate-500">
          <p>
            All code is available in the project repository. These examples are simplified
            versions focusing on the core concepts.
          </p>
          <p className="mt-2">
            <Link to="/quiz" className="text-cyan-400 hover:text-cyan-300">
              Take the Quiz
            </Link>
            {' '}&middot;{' '}
            <Link to="/" className="text-cyan-400 hover:text-cyan-300">
              Return to Simulator
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
};

// =============================================================================
// CODE EXAMPLE CARD COMPONENT
// =============================================================================

interface CodeExampleCardProps {
  example: CodeExample;
  isExpanded: boolean;
  onToggle: () => void;
}

const CodeExampleCard: React.FC<CodeExampleCardProps> = ({ example, isExpanded, onToggle }) => {
  return (
    <div className={`bg-slate-800 rounded-lg border transition-colors ${
      isExpanded ? 'border-cyan-600' : 'border-slate-700'
    }`}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-start gap-4 hover:bg-slate-750"
      >
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isExpanded ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'
        }`}>
          {example.id}
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-100">{example.title}</h2>
          <p className="text-sm text-cyan-400">{example.subtitle}</p>
        </div>
        <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Description */}
          <p className="text-slate-300 ml-12">{example.description}</p>

          {/* Key Points */}
          <div className="ml-12">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Key Points:</h3>
            <ul className="space-y-1">
              {example.keyPoints.map((point, idx) => (
                <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">&#8226;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Math Formula (if present) */}
          {example.mathFormula && (
            <div className="ml-12 bg-slate-900 rounded-lg p-3 border border-slate-700">
              <span className="text-xs text-slate-500 block mb-2">Mathematical Formula:</span>
              <div className="text-cyan-300">
                <BlockMath math={example.mathFormula} />
              </div>
            </div>
          )}

          {/* Math Table (if present) */}
          {example.mathTable && (
            <div className="ml-12 bg-slate-900 rounded-lg p-4 border border-slate-700">
              <span className="text-xs text-slate-500 block mb-3">{example.mathTable.title}:</span>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-sm text-slate-400 pb-2 w-28"></th>
                    <th className="text-left text-sm text-slate-400 pb-2">Formula</th>
                  </tr>
                </thead>
                <tbody>
                  {example.mathTable.equations.map((eq, idx) => (
                    <tr key={idx} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 text-cyan-400 font-medium text-sm align-middle">{eq.label}</td>
                      <td className="py-2 text-slate-200 overflow-x-auto">
                        <BlockMath math={eq.formula} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Code Block */}
          <div className="ml-12">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-400">Implementation:</h3>
              <span className="text-xs text-slate-500 font-mono">{example.sourceFile}</span>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-700">
              <code className="text-sm font-mono text-slate-300 whitespace-pre">
                {example.code}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigDeeper;
