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
  correctAnswer: string;
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
    correctAnswer: 'True',
  },
  {
    id: 2,
    type: 'mcq',
    question: 'How many bits are transmitted per symbol in 64-QAM?',
    options: ['4 bits', '6 bits', '8 bits', '64 bits'],
    hint: 'Verify: Check the statistics panel when 64-QAM is selected',
    correctAnswer: 'B) 6 bits',
  },
  {
    id: 3,
    type: 'tf',
    question: 'At the same Eb/N0, 16-QAM has a lower BER than QPSK.',
    hint: 'Verify: Compare the BER curves or theoretical BER values at 10 dB',
    correctAnswer: 'False',
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
    correctAnswer: 'B) Points scatter more widely around ideal positions',
  },
  {
    id: 5,
    type: 'tf',
    question: 'The bandwidth of a digitally modulated signal depends primarily on the symbol rate (1/T), not on whether you use QPSK or 64-QAM.',
    hint: 'Verify: Switch between modulation schemes and observe the frequency spectrum',
    correctAnswer: 'True',
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
    correctAnswer: 'A) All symbols have the same amplitude but different phases',
  },
  {
    id: 7,
    type: 'tf',
    question: 'To achieve a BER of 10⁻⁵, 64-QAM requires approximately 6 dB higher Eb/N0 than QPSK.',
    hint: 'Verify: Find where each BER curve crosses 10⁻⁵ on the BER plot',
    correctAnswer: 'True',
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
    correctAnswer: 'B) Adjacent symbols differ by only one bit, minimizing bit errors when symbol errors occur',
  },
  {
    id: 9,
    type: 'tf',
    question: 'Raised cosine pulse shaping reduces the signal bandwidth compared to rectangular pulses, which helps minimize interference with adjacent channels.',
    hint: 'Verify: Toggle between Rectangular and Raised Cosine and compare the frequency spectrum width',
    correctAnswer: 'True',
  },
  {
    id: 10,
    type: 'mcq',
    question: "If you've transmitted 50,000 bits and observed 50 bit errors, what is the simulated BER?",
    options: ['10⁻²', '10⁻³', '10⁻⁴', '10⁻⁵'],
    hint: 'Verify: Run simulation until ~50,000 bits and check the statistics panel calculation',
    correctAnswer: 'B) 10⁻³',
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
  const [submitted, setSubmitted] = useState(false);

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
      setSubmitted(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const unanswered = QUESTIONS.length - Object.values(answers).filter(a => a !== null).length;
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }
    setSubmitted(true);
  }, [answers]);

  const resetQuiz = useCallback(() => {
    setSubmitted(false);
  }, []);

  const getScore = useCallback(() => {
    let correct = 0;
    QUESTIONS.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  }, [answers]);

  const isCorrect = useCallback((questionId: number): boolean => {
    const question = QUESTIONS.find(q => q.id === questionId);
    return question ? answers[questionId] === question.correctAnswer : false;
  }, [answers]);

  const downloadAnswers = useCallback(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = studentName
      ? `${studentName.replace(/\s+/g, '_')}_quiz_${timestamp}.txt`
      : `quiz_answers_${timestamp}.txt`;

    const filename = window.prompt('Enter filename for your answers:', defaultFilename);
    if (!filename) return;

    const score = getScore();

    // Build the text content
    let content = 'Digital Modulation Simulator - Quiz Answers\n';
    content += '=============================================\n\n';
    content += `Student Name: ${studentName || '(not provided)'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n\n`;
    content += '---------------------------------------------\n\n';

    const answeredCount = Object.values(answers).filter(a => a !== null).length;
    content += `Questions Answered: ${answeredCount} / ${QUESTIONS.length}\n`;

    if (submitted) {
      content += `Score: ${score} / ${QUESTIONS.length} (${Math.round(score / QUESTIONS.length * 100)}%)\n`;
    }
    content += '\n---------------------------------------------\n\n';

    QUESTIONS.forEach((q) => {
      const userAnswer = answers[q.id];
      const correct = userAnswer === q.correctAnswer;

      content += `Q${q.id}. ${q.question}\n`;
      if (q.type === 'mcq' && q.options) {
        q.options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          content += `    ${letter}) ${opt}\n`;
        });
      } else {
        content += `    Options: True / False\n`;
      }
      content += `\n    Your Answer: ${userAnswer || '(not answered)'}`;

      if (submitted) {
        if (userAnswer) {
          content += correct ? ' ✓ CORRECT' : ' ✗ INCORRECT';
        }
        if (!correct) {
          content += `\n    Correct Answer: ${q.correctAnswer}`;
        }
      }
      content += '\n\n';
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
  }, [answers, studentName, submitted, getScore]);

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

          {/* Score display after submission */}
          {submitted && (
            <div className="mt-4 p-4 rounded-lg bg-slate-700 border border-slate-600">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Your Score: <span className={getScore() >= QUESTIONS.length * 0.7 ? 'text-green-400' : getScore() >= QUESTIONS.length * 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                      {getScore()} / {QUESTIONS.length}
                    </span>
                    <span className="text-slate-400 text-sm ml-2">
                      ({Math.round(getScore() / QUESTIONS.length * 100)}%)
                    </span>
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {getScore() === QUESTIONS.length
                      ? 'Perfect score! Excellent understanding of digital modulation.'
                      : getScore() >= QUESTIONS.length * 0.7
                        ? 'Great job! Review the incorrect answers below.'
                        : 'Review the material and try again. Check the hints for guidance.'}
                  </p>
                </div>
                <button
                  onClick={resetQuiz}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
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
              submitted={submitted}
              isCorrect={isCorrect(q.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
          {!submitted ? (
            <>
              <p className="text-slate-400 text-sm mb-3">
                Ready to check your answers? Click submit to see your score.
              </p>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors"
              >
                Submit Quiz
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-3">
                Download your graded answers to keep a record.
              </p>
              <button
                onClick={downloadAnswers}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
              >
                Download Graded Answers
              </button>
            </>
          )}
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
  submitted: boolean;
  isCorrect: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, answer, onAnswer, showHint, submitted, isCorrect }) => {
  const isAnswered = answer !== null;

  // Determine border color based on state
  const getBorderClass = () => {
    if (submitted && isAnswered) {
      return isCorrect ? 'border-green-500' : 'border-red-500';
    }
    return isAnswered ? 'border-green-600/50' : 'border-slate-700';
  };

  // Determine number badge style based on state
  const getBadgeClass = () => {
    if (submitted && isAnswered) {
      return isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
    }
    return isAnswered ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300';
  };

  // Get button style for True/False and MCQ options
  const getOptionClass = (optionValue: string) => {
    const isSelected = answer === optionValue;
    const isCorrectAnswer = question.correctAnswer === optionValue;

    if (submitted) {
      if (isCorrectAnswer) {
        return 'bg-green-600 text-white';
      }
      if (isSelected && !isCorrectAnswer) {
        return 'bg-red-600 text-white';
      }
      return 'bg-slate-700 text-slate-400 opacity-60';
    }

    return isSelected
      ? 'bg-cyan-600 text-white'
      : 'bg-slate-700 text-slate-300 hover:bg-slate-600';
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-4 border transition-colors ${getBorderClass()}`}>
      {/* Question number and text */}
      <div className="flex gap-3 mb-4">
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getBadgeClass()}`}>
          {submitted && isAnswered ? (isCorrect ? '✓' : '✗') : question.id}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide">
              {question.type === 'tf' ? 'True / False' : 'Multiple Choice'}
            </span>
            {submitted && isAnswered && (
              <span className={`text-xs font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            )}
          </div>
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
                onClick={() => !submitted && onAnswer(question.id, opt)}
                disabled={submitted}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getOptionClass(opt)} ${submitted ? 'cursor-default' : ''}`}
              >
                {opt}
                {submitted && question.correctAnswer === opt && ' ✓'}
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
                  onClick={() => !submitted && onAnswer(question.id, optionValue)}
                  disabled={submitted}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${getOptionClass(optionValue)} ${submitted ? 'cursor-default' : ''}`}
                >
                  <span className="font-medium mr-2">{letter}.</span>
                  {opt}
                  {submitted && question.correctAnswer === optionValue && ' ✓'}
                </button>
              );
            })}
          </div>
        )}

        {/* Hint - show always when enabled, or show for incorrect answers after submission */}
        {(showHint || (submitted && !isCorrect && isAnswered)) && (
          <div className={`mt-3 text-xs italic ${submitted && !isCorrect ? 'text-yellow-400' : 'text-slate-500'}`}>
            💡 {question.hint}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
