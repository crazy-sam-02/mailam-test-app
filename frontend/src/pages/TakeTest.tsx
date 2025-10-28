import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Test, Question, Answer, SuspiciousEvent, Attempt } from '@/types';
import { apiGetTest, apiStartAttempt } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TakeTest = () => {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Array<{ id: string; text: string; options: string[] }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedOption: number; timeTakenSec: number }>>([]);
  const [suspiciousEvents, setSuspiciousEvents] = useState<SuspiciousEvent[]>([]);
  const [startTime] = useState(new Date().toISOString());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    loadTest();
    enterFullscreen();
    setupAntiCheat();
    
    return () => {
      exitFullscreen();
    };
  }, [testId]);

  useEffect(() => {
    if (timeLeft <= 0 && test) {
      submitTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, test]);

  const loadTest = async () => {
    try {
      const res = await apiGetTest(String(testId));
      const t = res?.test;
      if (!t) throw new Error('Test not found');
      const qs = Array.isArray(t.questions) ? t.questions : [];
      const mappedQs = qs.map((q: any) => ({ id: String(q.id || q._id || ''), text: String(q.text || ''), options: (q.options || []).map((o: any) => String(o)) }));
      setTest(t);
      setQuestions(mappedQs);
      const durationMin = Number.isFinite(t.durationMinutes) ? t.durationMinutes : 30;
      setTimeLeft(durationMin * 60);
      setAnswers(mappedQs.map(q => ({ questionId: q.id, selectedOption: -1, timeTakenSec: 0 })));
      // Start attempt on server to obtain attemptId
      try {
        const s = await apiStartAttempt(String(testId));
        if (s && s.attemptId) setAttemptId(String(s.attemptId));
      } catch (e) {
        // Non-blocking: allow offline/local flow
      }
    } catch (e) {
      // Fallback to legacy local storage path
      const allTests = JSON.parse(localStorage.getItem('tests') || '[]');
      const foundTest = allTests.find((t: Test) => t.id === testId);
      if (!foundTest) {
        toast.error('Test not found');
        navigate('/dashboard');
        return;
      }
      const allQuestions = JSON.parse(localStorage.getItem('questions') || '[]');
      const testQuestions = allQuestions.filter((q: Question) => foundTest.questions.includes(q.id));
      setTest(foundTest);
      setQuestions(testQuestions.map((q: any) => ({ id: q.id, text: q.text, options: q.options })));
      setTimeLeft(foundTest.durationMinutes * 60);
      setAnswers(testQuestions.map((q: Question) => ({ questionId: q.id, selectedOption: -1, timeTakenSec: 0 })));
    }
  };

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.();
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(false);
  };

  const setupAntiCheat = () => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSuspiciousEvent('tab-switch');
        toast.error('Tab switching detected! Auto-submitting due to malpractice.');
        // Auto-submit once to prevent cheating
        if (!hasSubmitted) {
          setHasSubmitted(true);
          // give a tiny delay to ensure event flush
          setTimeout(() => submitTest(true), 50);
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logSuspiciousEvent('fullscreen-exit');
        toast.error('Please stay in fullscreen mode');
        setTimeout(enterFullscreen, 100);
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logSuspiciousEvent('copy-attempt');
      toast.error('Copying is not allowed');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logSuspiciousEvent('paste-attempt');
      toast.error('Pasting is not allowed');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSuspiciousEvent('context-menu');
      toast.error('Right-click is disabled');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        logSuspiciousEvent('inspect-attempt');
        toast.error('Developer tools are disabled during test');
      }

      // Detect screenshot attempts
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
        e.preventDefault();
        logSuspiciousEvent('screenshot-attempt');
        toast.error('Screenshots are not allowed');
      }

      // Prevent Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        logSuspiciousEvent('print-attempt');
        toast.error('Printing is not allowed');
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logSuspiciousEvent('copy-attempt');
      toast.error('Cut operation is not allowed');
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleSelectStart = (e: Event) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);

    // Disable developer tools detection
    const devToolsCheck = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        logSuspiciousEvent('inspect-attempt');
      }
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      clearInterval(devToolsCheck);
    };
  };

  const logSuspiciousEvent = (type: SuspiciousEvent['type']) => {
    setSuspiciousEvents((prev) => [
      ...prev,
      { type, timestamp: new Date().toISOString() },
    ]);
  };

  const handleAnswer = (optionIndex: number) => {
    const updated = [...answers];
    updated[currentQuestionIndex] = {
      ...updated[currentQuestionIndex],
      selectedOption: optionIndex,
    };
    setAnswers(updated);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitTest = async (auto = false) => {
    if (!test || !user) return;
    if (hasSubmitted) return;
    setHasSubmitted(true);
    let finalScore: number | null = null;
    // Try server submit first if attemptId exists
    if (attemptId) {
      try {
        const payload = {
          attemptId,
          answers: answers.map(a => ({ questionId: a.questionId, answer: String(a.selectedOption) })),
          suspiciousEvents,
        } as any;
        const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api';
        const resp = await fetch(`${API_BASE}/tests/${testId}/submit`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (resp.ok && typeof data.score === 'number') {
          finalScore = data.score;
        }
      } catch {}
    }

    // Fallback to local score if server did not score
    if (finalScore == null) {
      // We don't have correct answers from server; fallback to 0 or simple heuristic (0)
      finalScore = 0;
      // Optionally, persist attempt locally for UI
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        testId: String(test.id || testId),
        studentId: user.id,
        answers: answers as any,
        score: finalScore,
        startedAt: startTime,
        finishedAt: new Date().toISOString(),
        suspiciousEvents,
      };
      const allAttempts = JSON.parse(localStorage.getItem('attempts') || '[]');
      localStorage.setItem('attempts', JSON.stringify([...allAttempts, attempt]));
    }

    exitFullscreen();
    if (auto) {
      toast.error('Test auto-submitted due to malpractice.');
    } else {
      toast.success(`Test submitted!${finalScore != null ? ` Your score: ${finalScore}%` : ''}`);
    }
    navigate('/dashboard');
  };

  if (!test || questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="border-2 border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{test.title}</CardTitle>
              <div className="flex items-center gap-4">
                {suspiciousEvents.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {suspiciousEvents.length} warnings
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1 text-lg px-4 py-2">
                  <Clock className="w-5 h-5" />
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </Badge>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  currentAnswer.selectedOption === index
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      currentAnswer.selectedOption === index
                        ? 'border-accent bg-accent'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {currentAnswer.selectedOption === index && (
                      <div className="w-3 h-3 rounded-full bg-accent-foreground" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
          >
            Previous
          </Button>
          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={() => submitTest(false)} className="bg-accent hover:bg-accent/90">
              Submit Test
            </Button>
          ) : (
            <Button onClick={nextQuestion}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeTest;
