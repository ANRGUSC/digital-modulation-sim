/**
 * Quiz Component
 *
 * Interactive quiz to test understanding of digital modulation concepts.
 * Features:
 * - 10 questions (True/False and Multiple Choice)
 * - Autosave to localStorage
 * - Download answers as text file
 * - Easy navigation back to simulator
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// =============================================================================
// TYPES
// =============================================================================

interface Question {
  id: number;
  type: 'tf' | 'mcq';
  question: string;
  options?: string[];
  hint: string;
}

interface QuizAnswers {
  [key: number]: string | null;
}

// =============================================================================
// QUIZ DATA
// =============================================================================

const QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'tf',
    question: 'QPSK achieves twice the data rate of BPSK while having the same Bit Error Rate (BER) performance at a given Eb/N0.',
    hint: 'Verify: Compare BER curves for BPSK and QPSK at the same SNR',
  },
  {
    id: 2,
    type: 'mcq',
    question: 'How many bits are transmitted per symbol in 64-QAM?',
    options: ['4 bits', '6 bits', '8 bits', '64 bits'],
    hint: 'Verify: Check the statistics panel when 64-QAM is selected',
  },
  {
    id: 3,
    type: 'tf',
    question: 'At the same Eb/N0, 16-QAM has a lower BER than QPSK.',
    hint: 'Verify: Compare the BER curves or theoretical BER values at 10 dB',
  },
  {
    id: 4,
    type: 'mcq',
    question: 'What happens to the received constellation diagram as you decrease the SNR?',
    options: [
      'Points cluster more tightly around ideal positions',
      'Points scatter more widely around ideal positions',
      'The number of constellation points decreases',
      'The constellation rotates',
    ],
    hint: 'Verify: Adjust SNR slider from 15 dB down to 5 dB and observe',
  },
  {
    id: 5,
    type: 'tf',
    question: 'The bandwidth of a digitally modulated signal depends primarily on the symbol rate (1/T), not on whether you use QPSK or 64-QAM.',
    hint: 'Verify: Switch between modulation schemes and observe the frequency spectrum',
  },
  {
    id: 6,
    type: 'mcq',
    question: 'In 8-PSK, all constellation points lie on a circle because:',
    options: [
      'All symbols have the same amplitude but different phases',
      'All symbols have the same phase but different amplitudes',
      'It uses only the I channel',
      'It requires less bandwidth than QAM',
    ],
    hint: 'Verify: Observe the 8-PSK constellation diagram and passband waveforms',
  },
  {
    id: 7,
    type: 'tf',
    question: 'To achieve a BER of 10⁻⁵, 64-QAM requires approximately 6 dB higher Eb/N0 than QPSK.',
    hint: 'Verify: Find where each BER curve crosses 10⁻⁵ on the BER plot',
  },
  {
    id: 8,
    type: 'mcq',
    question: 'Gray coding is used in constellation mapping because:',
    options: [
      'It maximizes the data rate',
      'Adjacent symbols differ by only one bit, minimizing bit errors when symbol errors occur',
      'It reduces the required bandwidth',
      'It eliminates the need for the Q channel',
    ],
    hint: 'Verify: Examine bit labels on adjacent constellation points (e.g., in QPSK: 00, 01, 11, 10)',
  },
  {
    id: 9,
    type: 'tf',
    question: 'Raised cosine pulse shaping reduces the signal bandwidth compared to rectangular pulses, which helps minimize interference with adjacent channels.',
    hint: 'Verify: Toggle between Rectangular and Raised Cosine and compare the frequency spectrum width',
  },
  {
    id: 10,
    type: 'mcq',
    question: "If you've transmitted 50,000 bits and observed 50 bit errors, what is the simulated BER?",
    options: ['10⁻²', '10⁻³', '10⁻⁴', '10⁻⁵'],
    hint: 'Verify: Run simulation until ~50,000 bits and check the statistics panel calculation',
  },
];

const STORAGE_KEY = 'digital-modulation-quiz-answers';

// =============================================================================
// COMPONENT
// =============================================================================

export const Quiz: React.FC = () => {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [studentName, setStudentName] = useState('');
  const [showHints, setShowHints] = useState(true);

  // Load saved answers from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed.answers || {});
        setStudentName(parsed.studentName || '');
      } catch {
        // Invalid data, start fresh
      }
    }
  }, []);

  // Autosave to localStorage whenever answers or name change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, studentName }));
  }, [answers, studentName]);

  const handleAnswer = useCallback((questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const clearAnswers = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all answers?')) {
      setAnswers({});
      setStudentName('');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const downloadAnswers = useCallback(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = studentName
      ? `${studentName.replace(/\s+/g, '_')}_quiz_${timestamp}.txt`
      : `quiz_answers_${timestamp}.txt`;

    const filename = window.prompt('Enter filename for your answers:', defaultFilename);
    if (!filename) return;

    // Build the text content
    let content = 'Digital Modulation Simulator - Quiz Answers\n';
    content += '=============================================\n\n';
    content += `Student Name: ${studentName || '(not provided)'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n\n`;
    content += '---------------------------------------------\n\n';

    const answeredCount = Object.values(answers).filter(a => a !== null).length;
    content += `Questions Answered: ${answeredCount} / ${QUESTIONS.length}\n\n`;
    content += '---------------------------------------------\n\n';

    QUESTIONS.forEach((q) => {
      content += `Q${q.id}. ${q.question}\n`;
      if (q.type === 'mcq' && q.options) {
        q.options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          content += `    ${letter}) ${opt}\n`;
        });
      } else {
        content += `    Options: True / False\n`;
      }
      content += `\n    Your Answer: ${answers[q.id] || '(not answered)'}\n\n`;
    });

    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [answers, studentName]);

  const answeredCount = Object.values(answers).filter(a => a !== null).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">
                Modulation Quiz
              </h1>
              <p className="text-sm text-slate-400">
                Test your understanding of digital modulation concepts
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              <span>←</span>
              <span>Back to Simulator</span>
            </Link>
          </div>
        </header>

        {/* Student Info & Controls */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your name"
                className="w-full md:w-64 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowHints(!showHints)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  showHints
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {showHints ? 'Hide Hints' : 'Show Hints'}
              </button>
              <button
                onClick={clearAnswers}
                className="px-3 py-2 bg-slate-700 hover:bg-red-600 rounded-lg text-sm transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={downloadAnswers}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition-colors"
              >
                Download Answers
              </button>
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Progress: <span className="text-cyan-400">{answeredCount}</span> / {QUESTIONS.length} questions answered
            <span className="ml-2 text-slate-600">• Answers auto-saved</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {QUESTIONS.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              answer={answers[q.id] || null}
              onAnswer={handleAnswer}
              showHint={showHints}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm mb-3">
            Finished? Download your answers to submit.
          </p>
          <button
            onClick={downloadAnswers}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
          >
            Download Answers as Text File
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// QUESTION CARD COMPONENT
// =============================================================================

interface QuestionCardProps {
  question: Question;
  answer: string | null;
  onAnswer: (id: number, answer: string) => void;
  showHint: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, answer, onAnswer, showHint }) => {
  const isAnswered = answer !== null;

  return (
    <div className={`bg-slate-800 rounded-lg p-4 border transition-colors ${
      isAnswered ? 'border-green-600/50' : 'border-slate-700'
    }`}>
      {/* Question number and text */}
      <div className="flex gap-3 mb-4">
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isAnswered ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'
        }`}>
          {question.id}
        </span>
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wide">
            {question.type === 'tf' ? 'True / False' : 'Multiple Choice'}
          </span>
          <p className="text-slate-100 mt-1">{question.question}</p>
        </div>
      </div>

      {/* Answer options */}
      <div className="ml-11 space-y-2">
        {question.type === 'tf' ? (
          <div className="flex gap-3">
            {['True', 'False'].map((opt) => (
              <button
                key={opt}
                onClick={() => onAnswer(question.id, opt)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  answer === opt
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {question.options?.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const optionValue = `${letter}) ${opt}`;
              return (
                <button
                  key={idx}
                  onClick={() => onAnswer(question.id, optionValue)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    answer === optionValue
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span className="font-medium mr-2">{letter}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Hint */}
        {showHint && (
          <div className="mt-3 text-xs text-slate-500 italic">
            💡 {question.hint}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
