import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Test, SuspiciousEvent } from '@/types';
import { apiGetTest, apiStartAttempt, apiSubmitAttempt } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { AlertTriangle, Clock, Maximize2, Minimize2, Webcam, Wifi, WifiOff, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as faceapi from '@vladmandic/face-api';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

const STORAGE_KEY_PREFIX = 'scholar_shield_attempt_';

const TakeTest = () => {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Array<{ id: string; text: string; options: string[] }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // Map questionId -> optionIndex
  const [suspiciousEvents, setSuspiciousEvents] = useState<SuspiciousEvent[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [webcamActive, setWebcamActive] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [objectDetector, setObjectDetector] = useState<cocoSsd.ObjectDetection | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const autoSubmitRef = useRef(false);

  // Load Test & Restore State
  useEffect(() => {
    const initTest = async () => {
      if (!testId || !user) return;

      try {
        // 1. Fetch Test Data
        const res = await apiGetTest(testId);
        const t = res?.test;
        if (!t) throw new Error('Test not found');

        const qs = Array.isArray(t.questions)
          ? t.questions.map((q: any) => ({
            id: String(q.id || q._id || ''),
            text: String(q.text || ''),
            options: (q.options || []).map(String)
          }))
          : [];

        setTest(t);
        setQuestions(qs);

        // 2. Restore or Start Attempt
        const storageKey = `${STORAGE_KEY_PREFIX}${testId}_${user.id}`;
        const savedState = localStorage.getItem(storageKey);

        if (savedState) {
          const parsed = JSON.parse(savedState);
          setAnswers(parsed.answers || {});
          setSuspiciousEvents(parsed.suspiciousEvents || []);
          setTabSwitchCount(parsed.tabSwitchCount || 0);
          setAttemptId(parsed.attemptId);

          // Calculate remaining time based on absolute start time
          const startTime = new Date(parsed.startTime).getTime();
          const durationMs = (t.durationMinutes || 30) * 60 * 1000;
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
          setTimeLeft(remaining);

          if (remaining <= 0) {
            // If time expired while away, auto-submit immediately
            handleAutoSubmit('Time limit exceeded (resumed)');
            return;
          }
        } else {
          // New Attempt
          try {
            const s = await apiStartAttempt(testId);
            const newAttemptId = s?.attemptId || crypto.randomUUID();
            setAttemptId(newAttemptId);

            const durationSec = (t.durationMinutes || 30) * 60;
            setTimeLeft(durationSec);

            // Save initial state
            localStorage.setItem(storageKey, JSON.stringify({
              answers: {},
              suspiciousEvents: [],
              tabSwitchCount: 0,
              attemptId: newAttemptId,
              startTime: new Date().toISOString()
            }));
          } catch (err) {
            console.error('Failed to start attempt on server', err);
            toast.error('Network error. Starting in offline mode.');
            // Fallback for offline start
            const durationSec = (t.durationMinutes || 30) * 60;
            setTimeLeft(durationSec);
          }
        }
      } catch (err) {
        console.error('Error loading test:', err);
        toast.error('Failed to load test. Please try again.');
        navigate('/dashboard');
      }
    };

    initTest();
  }, [testId, user, navigate]);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timerRef.current);
          if (!autoSubmitRef.current) {
            handleAutoSubmit('Time limit exceeded');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  // Persist State on Change
  useEffect(() => {
    if (!testId || !user || !attemptId) return;
    const storageKey = `${STORAGE_KEY_PREFIX}${testId}_${user.id}`;

    // We don't save timeLeft directly, we rely on startTime. 
    // But we save answers and events.
    const currentState = localStorage.getItem(storageKey);
    if (currentState) {
      const parsed = JSON.parse(currentState);
      localStorage.setItem(storageKey, JSON.stringify({
        ...parsed,
        answers,
        suspiciousEvents,
        tabSwitchCount
      }));
    }
  }, [answers, suspiciousEvents, tabSwitchCount, testId, user, attemptId]);

  // Anti-Cheat: Tab Switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Ignore if already submitting
      if (autoSubmitRef.current) return;

      // Only count when hiding the page (leaving the tab)
      if (document.hidden) {
        // Debounce: Ignore if the last switch was less than 1 second ago
        const now = Date.now();
        const lastSwitch = parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}last_switch_${testId}`) || '0');
        if (now - lastSwitch < 1000) return;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}last_switch_${testId}`, String(now));

        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);

        const event: SuspiciousEvent = { type: 'tab-switch', timestamp: new Date().toISOString() };
        setSuspiciousEvents(prev => [...prev, event]);

        // Increased limit to 5 to reduce false positives
        if (newCount >= 5) {
          toast.error('Maximum tab switches exceeded. Auto-submitting test.', { duration: 5000 });
          handleAutoSubmit('Excessive tab switching (5+ times)');
        } else {
          toast.warning(`⚠️ Warning: You left the test window! (${newCount}/5)`, {
            description: 'Please stay on this screen to avoid auto-submission.',
            duration: 4000
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tabSwitchCount, testId]);

  // Anti-Cheat: Key Blocking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Screenshot Keys
      const isPrintScreen = e.key === 'PrintScreen';
      const isWindowsSnippet = e.metaKey && e.shiftKey && e.key.toLowerCase() === 's';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4');

      if (isPrintScreen || isWindowsSnippet || isMacScreenshot) {
        e.preventDefault();
        toast.error('Screenshots are disabled!', { description: 'This action has been logged.' });
        setSuspiciousEvents(prev => [...prev, { type: 'screenshot-attempt', timestamp: new Date().toISOString() }]);
        return;
      }

      // Block DevTools & Source View
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u')
      ) {
        e.preventDefault();
        toast.error('Developer tools are disabled.');
        setSuspiciousEvents(prev => [...prev, { type: 'inspect-attempt', timestamp: new Date().toISOString() }]);
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('Copy/Paste is disabled during the test!');
      setSuspiciousEvents(prev => [...prev, { type: 'copy-paste-attempt', timestamp: new Date().toISOString() }]);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyPaste);
    window.addEventListener('cut', handleCopyPaste);
    window.addEventListener('paste', handleCopyPaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyPaste);
      window.removeEventListener('cut', handleCopyPaste);
      window.removeEventListener('paste', handleCopyPaste);
    };
  }, []);

  // --------------------------------------------------------------------------------
  // Webcam & AI Proctoring Logic
  // --------------------------------------------------------------------------------

  // 1. Initialize Webcam only when not loading and videoRef is available
  useEffect(() => {
    // If test is not loaded yet, don't start webcam (element doesn't exist)
    if (!test || questions.length === 0) return;

    let localStream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        localStream = stream;

        // Wait for ref to fill (in case of render timing)
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setWebcamActive(true);
        }
      } catch (err) {
        console.error('Webcam error:', err);
        toast.warning('Webcam access is recommended for this test.', {
          description: 'Please release camera permissions if blocked.'
        });
      }
    };

    startWebcam();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setWebcamActive(false);
    };
  }, [test, questions.length]); // Re-run if test loads (transition from spinner to UI)

  // 2. Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          // faceapi.nets.ssdMobilenetv1.loadFromUri('/models') // Alternative
        ]);
        const detector = await cocoSsd.load();
        setObjectDetector(detector);
        setModelsLoaded(true);
        toast.success('Proctoring AI Loaded');
      } catch (err) {
        console.error('Failed to load AI models', err);
        toast.error('Failed to load proctoring models. Please refresh.');
      }
    };
    loadModels();
  }, []);

  // 3. AI Analysis Loop
  useEffect(() => {
    // AI Analysis Loop - Client Side Only
    if (!webcamActive || !test || !user || !modelsLoaded || !objectDetector) return;

    const runAI = async () => {
      if (!videoRef.current || !videoRef.current.readyState) return;

      const video = videoRef.current; // capture ref value

      try {
        // A. Face Detection
        // Using TinyFaceDetector for performance
        const faces = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
        );

        // Check for Multiple Faces
        if (faces.length > 1) {
          console.log('[PROCTOR] Multiple faces detected:', faces.length);
          setSuspiciousEvents(prev => {
            const last = prev[prev.length - 1];
            const now = Date.now();
            if (last && (now - new Date(last.timestamp).getTime() < 3000) && last.type === 'multiple-faces') {
              return prev;
            }
            toast.warning('Multiple faces detected!', { duration: 4000 });
            return [...prev, { type: 'multiple-faces', timestamp: new Date().toISOString() }];
          });
        }

        // Optional: Check for No Face (or face too small/far)
        // if (faces.length === 0) { ... }

        // B. Object Detection (Phone)
        const objects = await objectDetector.detect(video);
        const phones = objects.filter(obj => obj.class === 'cell phone' || obj.class === 'phone'); // 'cell phone' is standard coco label

        if (phones.length > 0) {
          console.log('[PROCTOR] Phone detected:', phones);
          setSuspiciousEvents(prev => {
            const last = prev[prev.length - 1];
            const now = Date.now();
            if (last && (now - new Date(last.timestamp).getTime() < 3000) && last.type === 'phone-detected') {
              return prev;
            }
            toast.error('Mobile phone detected!', { duration: 4000 });
            return [...prev, { type: 'phone-detected', timestamp: new Date().toISOString() }];
          });
        }

      } catch (err) {
        console.error('AI Loop Error:', err);
      }
    };

    // Run every 2 seconds (balance between load and responsiveness)
    const intervalId = setInterval(runAI, 2000);
    return () => clearInterval(intervalId);
  }, [webcamActive, test, user, modelsLoaded, objectDetector]);

  const handleAnswer = (optionIndex: number) => {
    const qId = questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const submitTest = async (auto = false, malpracticeReason?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Prepare payload
    const formattedAnswers = Object.entries(answers).map(([qId, optIdx]) => ({
      questionId: qId,
      selectedOption: optIdx,
      timeTakenSec: 0,
      answer: String(optIdx) // Keep for backward compatibility if needed
    }));

    const payload = {
      attemptId,
      answers: formattedAnswers,
      suspiciousEvents,
      autoSubmitted: auto,
      malpracticeReason
    };

    try {
      const res = await apiSubmitAttempt(testId!, payload);

      // Clear local storage on success
      if (user) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${testId}_${user.id}`);
      }

      if (auto) {
        toast.error(`Test auto-submitted: ${malpracticeReason}`);
      } else {
        toast.success('Test submitted successfully!');
      }

      // Small delay to show toast
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Submission failed:', err);
      toast.error('Failed to submit. Please check your connection and try again.');
      setIsSubmitting(false);
      autoSubmitRef.current = false; // Allow retry
    }
  };

  const handleAutoSubmit = (reason: string) => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    submitTest(true, reason);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading test environment...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const progress = ((Object.keys(answers).length) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-bold text-lg truncate max-w-[150px] md:max-w-md leading-tight">{test.title}</h1>
              {test.createdByName && (
                <p className="text-xs text-muted-foreground hidden md:block">
                  Created by: {test.createdByName}
                </p>
              )}
            </div>
            <Badge variant={timeLeft && timeLeft < 300 ? "destructive" : "secondary"} className="font-mono text-base">
              <Clock className="w-4 h-4 mr-2" />
              {timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Network Status */}
            {isOnline ? (
              <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 hidden sm:flex">
                <Wifi className="w-3 h-3 mr-1" /> Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="animate-pulse">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </Badge>
            )}

            {/* Mobile Nav Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="h-full flex flex-col gap-4">
                  <h3 className="font-semibold text-lg">Question Navigator</h3>
                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((_, idx) => {
                        const isAnswered = answers[questions[idx].id] !== undefined;
                        const isCurrent = currentQuestionIndex === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`
                              h-10 rounded-md text-sm font-medium transition-colors
                              ${isCurrent
                                ? 'bg-primary text-primary-foreground'
                                : isAnswered
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-secondary text-secondary-foreground'
                              }
                            `}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Toggle Fullscreen" className="hidden sm:flex">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Finish
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
        {!isOnline && (
          <div className="bg-destructive text-destructive-foreground text-xs text-center py-1 font-medium animate-pulse">
            You are currently offline. Answers will be saved locally and submitted when connection is restored.
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 grid md:grid-cols-[1fr_300px] gap-6 relative">
        {/* Question Area */}
        <div className="space-y-6">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl leading-relaxed">
                  <span className="text-muted-foreground mr-2">Q{currentQuestionIndex + 1}.</span>
                  {currentQ.text}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentQ.id] === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`
                      relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                        ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}
                      `}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-base">{opt}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2 md:hidden">
              <span className="text-sm text-muted-foreground self-center">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Sidebar Column (Visible on mobile for webcam, hidden for others) */}
        <div className="flex flex-col gap-6 pointer-events-none md:pointer-events-auto">

          {/* Webcam Preview - Responsive Position */}
          {/* Mobile: Fixed bottom-right. Desktop: Static in sidebar. */}
          <Card className="pointer-events-auto overflow-hidden fixed bottom-4 right-4 w-32 h-24 md:static md:w-full md:h-auto z-50 border-2 md:border shadow-lg md:shadow-none">
            <CardHeader className="pb-3 bg-muted/50 hidden md:flex">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Webcam className="w-4 h-4" /> Proctoring {modelsLoaded ? 'Active' : 'Loading...'}
                </CardTitle>
                <div className={`w-2 h-2 rounded-full ${webcamActive && modelsLoaded ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
            </CardHeader>
            <div className="aspect-video bg-black relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Mobile Status Indicator Overlay */}
              <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${webcamActive ? 'bg-green-500' : 'bg-red-500'} md:hidden animate-pulse`} />
            </div>
          </Card>

          {/* Question Navigator (Desktop Only) */}
          <Card className="hidden md:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Question Navigator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const isAnswered = answers[questions[idx].id] !== undefined;
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`
                        h-10 rounded-md text-sm font-medium transition-colors
                        ${isCurrent
                          ? 'bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary'
                          : isAnswered
                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }
                      `}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Warnings (Desktop Only - Mobile gets toasts) */}
          {suspiciousEvents.length > 0 && (
            <Card className="hidden md:block border-yellow-500/20 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Warnings ({suspiciousEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[100px]">
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {suspiciousEvents.slice().reverse().map((e, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-yellow-500" />
                        {e.type} at {new Date(e.timestamp).toLocaleTimeString()}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to Submit?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {Object.keys(answers).length} / {questions.length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Questions Answered</div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {questions.length - Object.keys(answers).length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Unanswered</div>
                  </div>
                </div>
                <p>
                  Are you sure you want to finish the test? You cannot change your answers after submission.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Review Answers</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submitTest(false)}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeTest;