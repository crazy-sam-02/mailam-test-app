import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Question, Test } from '@/types';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, FileJson, FileText, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateQuizDialog = ({ open, onOpenChange, onSuccess }: CreateQuizDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState<'manual' | 'json' | 'document'>('manual');
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    durationMinutes: 30,
    attemptsAllowed: 1,
    semester: user?.semester || '',
    department: user?.dept || '',
  });
  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'createdBy' | 'createdAt'>[]>([
    { text: '', options: ['', '', '', ''], correctOptionIndex: 0 },
  ]);
  const [jsonInput, setJsonInput] = useState('');
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  // Normalize various incoming JSON shapes to our internal shape
  const normalizeQuestionsInput = (raw: any): Omit<Question, 'id' | 'createdBy' | 'createdAt'>[] => {
    const arr: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.questions) ? raw.questions : []);
    if (!Array.isArray(arr)) return [];

    const toIndexFromLetter = (s: string) => {
      const m = String(s || '').trim().match(/^[A-Da-d]$/);
      return m ? (m[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)) : null;
    };

    const clampIndex = (idx: any, len: number) => {
      const n = typeof idx === 'number' ? idx : parseInt(idx, 10);
      if (Number.isFinite(n) && n >= 0 && n < len) return n;
      return 0;
    };

    const cleanOptions = (optsIn: any[]): string[] => {
      const base = (optsIn || []).map((o: any) => {
        if (o == null) return '';
        if (typeof o === 'string') return o.trim();
        if (typeof o === 'object' && o.text != null) return String(o.text).trim();
        if (typeof o === 'object' && o.option != null) return String(o.option).trim();
        return String(o).trim();
      });
      const trimmed = base.slice(0, 4);
      while (trimmed.length < 4) trimmed.push('Option');
      return trimmed.map(v => v && v.length > 0 ? v : 'Option');
    };

    return arr
      .map((q: any) => {
        // Case A: already in our shape
        if (q?.text && Array.isArray(q?.options)) {
          const options = cleanOptions(q.options);
          let correctOptionIndex = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
          correctOptionIndex = clampIndex(correctOptionIndex, options.length);
          return { text: String(q.text).trim(), options, correctOptionIndex };
        }

        // Case B: letter-based schema { questionText, options: [{letter,text}|string], correctAnswer: 'A' | 'text' | 1-4 }
        if (q?.questionText && Array.isArray(q?.options)) {
          const options = cleanOptions(q.options);
          let idx: number | null = null;
          // letter A-D
          idx = toIndexFromLetter(q.correctAnswer);
          if (idx == null && typeof q.correctAnswer === 'string') {
            const target = q.correctAnswer.trim().toLowerCase();
            const found = options.findIndex(o => o.toLowerCase() === target);
            if (found >= 0) idx = found;
          }
          if (idx == null && typeof q.correctAnswer === 'number') {
            // 1-based to 0-based
            idx = Math.max(0, Math.min(3, q.correctAnswer - 1));
          }
          const correctOptionIndex = clampIndex(idx ?? 0, options.length);
          return { text: String(q.questionText).trim(), options, correctOptionIndex };
        }

        // Case C: alternate schema { question, options, answer }
        if (q?.question && Array.isArray(q?.options)) {
          const options = cleanOptions(q.options);
          let idx: number | null = null;
          // letter
          idx = toIndexFromLetter(q.answer);
          if (idx == null && typeof q.answer === 'string') {
            const target = q.answer.trim().toLowerCase();
            const found = options.findIndex(o => o.toLowerCase() === target);
            if (found >= 0) idx = found;
          }
          if (idx == null && typeof q.answer === 'number') {
            idx = Math.max(0, Math.min(3, q.answer - 1));
          }
          const correctOptionIndex = clampIndex(idx ?? 0, options.length);
          return { text: String(q.question).trim(), options, correctOptionIndex };
        }

        return null;
      })
      .filter((q: any) => q && q.text && Array.isArray(q.options) && q.options.length === 4);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const normalized = normalizeQuestionsInput(json);
        if (!normalized.length) throw new Error('Invalid JSON format');
        setQuestions(normalized);
        toast.success(`Loaded ${normalized.length} questions from JSON`);
        setStep(2);
      } catch (error) {
        toast.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    (async () => {
      try {
        const res = await fetch((import.meta as any).env?.VITE_API_BASE_URL ? `${(import.meta as any).env.VITE_API_BASE_URL}/tests/upload` : 'http://localhost:4000/api/tests/upload', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Upload failed');
        if (!data?.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('No questions extracted');
        }
        setQuestions(data.questions.map((q: any) => ({
          text: q.text,
          options: q.options,
          correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
        })));
        toast.success(`Extracted ${data.questions.length} questions`);
        setStep(2);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to extract questions');
      }
    })();
  };

  // Unified file upload handler (JSON / DOC / DOCX / PDF) using backend /tests/upload
  const handleFileUpload = async (file: File) => {
    const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api';
    const form = new FormData();
    form.append('file', file);
    const loading = toast.loading(
      file.type === 'application/json' ? 'Processing JSON file...' : 'Extracting questions using AI...'
    );
    try {
      const res = await fetch(`${API_BASE}/tests/upload`, { method: 'POST', credentials: 'include', body: form });
      const data = await res.json();
      toast.dismiss(loading);
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      // Support both shapes: { questions } or { questionIds, count, method }
      if (Array.isArray(data.questions) && data.questions.length) {
        const added = data.questions.map((q: any) => ({
          text: String(q.text || '').trim(),
          options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o)) : ['Option','Option','Option','Option'],
          correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
        }));
        setQuestions(prev => [...prev.filter(q => q.text), ...added]);
        toast.success(`Added ${added.length} questions${data.method ? ` (via ${data.method})` : ''}`);
        setStep(2);
      } else if (Array.isArray(data.questionIds) && data.questionIds.length) {
        setQuestionIds(prev => [...prev, ...data.questionIds.map((id: any) => String(id))]);
        const count = Number(data.count || data.questionIds.length);
        const method = data.method === 'gemini-ai' ? 'AI extraction' : 'text parsing';
        toast.success(`${count} questions added (via ${method})`);
        setStep(2);
      } else {
        throw new Error('No questions extracted');
      }
    } catch (err: any) {
      toast.dismiss(loading);
      toast.error(err?.message || 'Failed to upload');
    }
  };

  const handleJsonParse = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const normalized = normalizeQuestionsInput(parsed);
      if (!normalized.length) throw new Error('Invalid JSON format');
      setQuestions(normalized);
      toast.success(`Parsed ${normalized.length} questions`);
      setStep(2);
    } catch (error) {
      toast.error('Failed to parse JSON');
    }
  };

  const handleSubmit = () => {
    if (!testData.title) {
      toast.error('Please enter the test title');
      return;
    }
    if (!testData.semester || !testData.department) {
      toast.error('Please select semester and department');
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    for (const [i, q] of questions.entries()) {
      if (!q.text) {
        toast.error(`Question ${i + 1} is missing text`);
        return;
      }
      if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !o)) {
        toast.error(`Question ${i + 1} must have 4 non-empty options`);
        return;
      }
      if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        toast.error(`Question ${i + 1} must have a valid correct answer selected`);
        return;
      }
    }
    // Prefer backend creation when available
    (async () => {
      try {
        const payload = {
          title: testData.title,
          description: testData.description,
          questions: questions.map(q => ({ text: q.text, options: q.options, correctAnswer: String(q.correctOptionIndex) })),
          meta: {
            durationMinutes: testData.durationMinutes,
            attemptsAllowed: testData.attemptsAllowed,
            assignedTo: { semester: testData.semester, department: testData.department },
          }
        } as any;
        const resp = await fetch((import.meta as any).env?.VITE_API_BASE_URL ? `${(import.meta as any).env.VITE_API_BASE_URL}/tests` : 'http://localhost:4000/api/tests', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed to create test');
        toast.success('Test created successfully');
        onSuccess();
        onOpenChange(false);
        resetForm();
      } catch (err: any) {
        // Fallback to localStorage so user can proceed without backend
        const savedQuestions = questions.map(q => ({
          ...q,
          id: crypto.randomUUID(),
          createdBy: user!.id,
          createdAt: new Date().toISOString(),
        }));
        const allQuestions = JSON.parse(localStorage.getItem('questions') || '[]');
        localStorage.setItem('questions', JSON.stringify([...allQuestions, ...savedQuestions]));
        const test: Test = {
          id: crypto.randomUUID(),
          title: testData.title,
          description: testData.description,
          assignedTo: {
            semester: testData.semester,
            department: testData.department,
          },
          questions: savedQuestions.map(q => q.id),
          durationMinutes: testData.durationMinutes,
          attemptsAllowed: testData.attemptsAllowed,
          shuffleQuestions: true,
          shuffleOptions: true,
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdBy: user!.id,
        };
        const allTests = JSON.parse(localStorage.getItem('tests') || '[]');
        localStorage.setItem('tests', JSON.stringify([...allTests, test]));
        toast.success('Test saved locally (offline mode)');
        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    })();
  };

  const resetForm = () => {
    setStep(1);
    setCreationMode('manual');
    setTestData({
      title: '',
      description: '',
      durationMinutes: 30,
      attemptsAllowed: 1,
      semester: user?.semester || '',
      department: user?.dept || '',
    });
    setQuestions([{ text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]);
    setJsonInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-card/95 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Create New Test
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Enter test details and choose creation mode' : 'Review and edit questions'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  value={testData.title}
                  onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                  placeholder="e.g., Profit and Loss Quiz"
                  className="backdrop-blur-sm bg-white/5 border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={testData.description}
                  onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                  placeholder="Brief description of the test"
                  className="backdrop-blur-sm bg-white/5 border-white/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select
                    value={testData.semester}
                    onValueChange={(value) => setTestData({ ...testData, semester: value })}
                  >
                    <SelectTrigger className="backdrop-blur-sm bg-white/5 border-white/20">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/95 border-white/20">
                      {[1,2,3,4,5,6,7,8].map(sem => (
                        <SelectItem key={sem} value={String(sem)}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={testData.department}
                    onValueChange={(value) => setTestData({ ...testData, department: value })}
                  >
                    <SelectTrigger className="backdrop-blur-sm bg-white/5 border-white/20">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/95 border-white/20">
                      {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'].map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={testData.durationMinutes}
                    onChange={(e) => setTestData({ ...testData, durationMinutes: parseInt(e.target.value) })}
                    className="backdrop-blur-sm bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attempts">Attempts Allowed</Label>
                  <Input
                    id="attempts"
                    type="number"
                    value={testData.attemptsAllowed}
                    onChange={(e) => setTestData({ ...testData, attemptsAllowed: parseInt(e.target.value) })}
                    className="backdrop-blur-sm bg-white/5 border-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Question Creation Mode</Label>
              <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as any)}>
                <TabsList className="grid w-full grid-cols-4 backdrop-blur-sm bg-white/5">
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="json" className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON Upload
                  </TabsTrigger>
                  <TabsTrigger value="document" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    File Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-3">
                  <Card className="backdrop-blur-sm bg-white/5 border-white/20">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        Create questions manually with an intuitive interface
                      </p>
                    </CardContent>
                  </Card>
                  <Button onClick={() => setStep(2)} className="w-full bg-gradient-to-r from-primary to-accent">
                    Next: Add Questions Manually
                  </Button>
                </TabsContent>

                <TabsContent value="json" className="space-y-3">
                  <Card className="backdrop-blur-sm bg-white/5 border-white/20">
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Upload JSON File</Label>
                        <Input
                          type="file"
                          accept=".json"
                          onChange={handleJsonUpload}
                          className="backdrop-blur-sm bg-white/5 border-white/20"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-white/20" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or paste JSON</span>
                        </div>
                      </div>
                      <Textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='[{"text": "Question?", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0}]'
                        className="backdrop-blur-sm bg-white/5 border-white/20 font-mono text-xs min-h-[120px]"
                      />
                      <Button onClick={handleJsonParse} className="w-full bg-gradient-to-r from-primary to-accent">
                        Parse and Continue
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="document" className="space-y-3">
                  <Card className="backdrop-blur-sm bg-white/5 border-white/20">
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Upload .doc, .docx, or .pdf files for AI-powered question extraction
                      </p>
                      <Input
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={handleDocumentUpload}
                        className="backdrop-blur-sm bg-white/5 border-white/20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Note: AI parsing requires backend integration
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-3">
                  <Card className="backdrop-blur-sm bg-white/5 border-white/20">
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Upload JSON File</Label>
                        <Input
                          type="file"
                          accept=".json"
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                          className="backdrop-blur-sm bg-white/5 border-white/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Upload Document (.pdf, .doc, .docx)</Label>
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                          className="backdrop-blur-sm bg-white/5 border-white/20"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <Card key={qIndex} className="backdrop-blur-sm bg-white/5 border-white/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <Label className="text-base font-semibold">Question {qIndex + 1}</Label>
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                    placeholder="Enter question text"
                    className="backdrop-blur-sm bg-white/5 border-white/20"
                  />
                  <div className="space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex gap-2 items-center">
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="backdrop-blur-sm bg-white/5 border-white/20"
                        />
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctOptionIndex === oIndex}
                          onChange={() => updateQuestion(qIndex, 'correctOptionIndex', oIndex)}
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button onClick={addQuestion} variant="outline" className="w-full backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 backdrop-blur-sm bg-white/5 border-white/20">
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-accent">
                Create Test
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizDialog;
