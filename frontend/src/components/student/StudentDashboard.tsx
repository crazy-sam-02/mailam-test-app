import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Clock, FileText, CheckCircle, Sparkles, TrendingUp } from 'lucide-react';
import { Test, Attempt } from '@/types';
import { apiGetTests, apiGetMyAttempts } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
    const [availableTests, setAvailableTests] = useState<Test[]>([]);
    const [myAttempts, setMyAttempts] = useState<Attempt[]>([]);
    // Map of testId to total possible points
    const [testPoints, setTestPoints] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadTests();
  }, [user]);

  const loadTests = async () => {
    // fallback sources
    const loadLocal = () => {
      const allTests = JSON.parse(localStorage.getItem('tests') || '[]');
      const allAttempts = JSON.parse(localStorage.getItem('attempts') || '[]');
      const eligible = allTests.filter(
        (t: Test) =>
          t.assignedTo.semester === user?.semester &&
          (!t.assignedTo.department || t.assignedTo.department === user?.dept)
      );
      const attempts = allAttempts.filter((a: Attempt) => a.studentId === user?.id);
      setAvailableTests(eligible);
      setMyAttempts(attempts);
    };

    try {
      const resp = await apiGetTests();
      const serverTests = Array.isArray(resp?.tests) ? resp.tests : [];
      const mapped: Test[] = serverTests.map((t: any) => {
        const id = String(t._id || t.id);
        const title = String(t.title || 'Untitled');
        const description = String(t.description || '');
        const questionsCount = Array.isArray(t.questions) ? t.questions.length : 0;
        const assigned = t.assignedTo || {};
        const semester = String(assigned.semester || user?.semester || '');
        const department = String(assigned.dept || assigned.department || user?.dept || '');
        const durationMinutes = Number.isFinite(t.durationMinutes) ? t.durationMinutes : 30;
        const attemptsAllowed = Number.isFinite(t.attemptsAllowed) ? t.attemptsAllowed : 1;
        const shuffleQuestions = !!t.shuffleQuestions;
        const shuffleOptions = !!t.shuffleOptions;
        const startAt = t.startAt ? String(t.startAt) : new Date().toISOString();
        const endAt = t.endAt ? String(t.endAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const createdBy = typeof t.createdBy === 'object' && t.createdBy?._id ? String(t.createdBy._id) : String(t.createdBy || '');
        return {
          id,
          title,
          description,
          assignedTo: { semester, department },
          questions: Array.from({ length: questionsCount }, (_, i) => `${id}-q${i}`),
          durationMinutes,
          attemptsAllowed,
          shuffleQuestions,
          shuffleOptions,
          startAt,
          endAt,
          createdBy,
        } as Test;
      });
      setAvailableTests(mapped);

      // fetch my attempts from backend
      try {
        const respA = await apiGetMyAttempts();
        const serverAttempts = Array.isArray(respA?.attempts) ? respA.attempts : [];
        const mappedA: Attempt[] = serverAttempts.map((a: any) => ({
          id: String(a._id || a.attemptId || crypto.randomUUID()),
          testId: String(a.test?._id || a.test || ''),
          studentId: String((a.student && a.student._id) || a.student || (user?.id || '')),
          answers: Array.isArray(a.answers) ? a.answers.map((x: any) => ({ questionId: String(x.questionId || ''), selectedOption: Number(x.answer ?? x.selectedOption ?? -1), timeTakenSec: Number(x.timeTakenSec || 0) })) : [],
          score: Number(a.score || 0),
          startedAt: String(a.startedAt || ''),
          finishedAt: String(a.submittedAt || a.finishedAt || ''),
          suspiciousEvents: Array.isArray(a.suspiciousEvents) ? a.suspiciousEvents : [],
        }));
        setMyAttempts(mappedA);
      } catch {
        // fallback to local attempts
        const allAttempts = JSON.parse(localStorage.getItem('attempts') || '[]');
        const attempts = allAttempts.filter((a: Attempt) => a.studentId === user?.id);
        setMyAttempts(attempts);
      }
    } catch (e) {
      loadLocal();
    }
  };

  const getAttemptCount = (testId: string) => {
    return myAttempts.filter(a => a.testId === testId).length;
  };

  const canAttempt = (test: Test) => {
    return getAttemptCount(test.id) < test.attemptsAllowed;
  };

  const avgScore = myAttempts.length > 0
    ? Math.round(myAttempts.reduce((sum, a) => sum + a.score, 0) / myAttempts.length)
    : 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 animate-gradient-shift bg-[length:200%_200%]" />
      
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Glassmorphism header */}
      <header className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Student Dashboard
                </h1>
                <div className="px-2 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.name} • Semester {user?.semester} • {user?.enrollmentNumber}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              className="backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8 animate-fade-in">
          {[
            { title: 'Available Tests', value: availableTests.length, icon: FileText, gradient: 'from-violet-500/10 to-purple-500/10', iconColor: 'text-violet-400' },
            { title: 'Completed', value: myAttempts.length, icon: CheckCircle, gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-400' },
            { title: 'Average Score', value: `${avgScore}%`, icon: TrendingUp, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-cyan-400' },
          ].map((stat, index) => (
            <Card 
              key={index} 
              className="backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all hover:scale-105 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">{stat.title}</CardTitle>
                <div className="w-10 h-10 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-8">
          {/* Available Tests */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Available Tests
            </h2>
            {availableTests.length === 0 ? (
              <Card className="backdrop-blur-xl bg-white/5 border-white/10">
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  No tests available at the moment.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableTests.map((test, index) => {
                  const attemptCount = getAttemptCount(test.id);
                  const canTake = canAttempt(test);
                  
                  return (
                    <Card 
                      key={test.id} 
                      className="backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-xl hover:shadow-primary/20 transition-all hover:scale-[1.02] group animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:bg-clip-text group-hover:text-transparent transition-all">
                              {test.title}
                            </CardTitle>
                            <CardDescription className="mt-1">{test.description}</CardDescription>
                          </div>
                          <Badge 
                            variant={canTake ? 'default' : 'secondary'}
                            className={canTake ? 'bg-gradient-to-r from-primary to-accent' : ''}
                          >
                            {attemptCount}/{test.attemptsAllowed}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{test.durationMinutes} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <span>{test.questions.length} questions</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => navigate(`/test/${test.id}`)}
                            disabled={!canTake}
                            size="sm"
                            className={canTake ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90' : ''}
                          >
                            {canTake ? 'Start Test' : 'Completed'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Results */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Results
            </h2>
            {myAttempts.length === 0 ? (
              <Card className="backdrop-blur-xl bg-white/5 border-white/10">
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  No test attempts yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myAttempts.map((attempt, index) => {
                  const test = availableTests.find(t => t.id === attempt.testId);
                  return (
                    <Card 
                      key={attempt.id} 
                      className="backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{test?.title || 'Unknown Test'}</CardTitle>
                          <Badge 
                            variant={attempt.score >= 70 ? 'default' : 'secondary'}
                            className={attempt.score >= 70 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}
                          >
                            Score: {attempt.score}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          Completed on {new Date(attempt.finishedAt).toLocaleDateString()} at{' '}
                          {new Date(attempt.finishedAt).toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
