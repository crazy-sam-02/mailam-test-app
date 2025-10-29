import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Users, FileText, BarChart, Sparkles } from 'lucide-react';
import { Test, User, Attempt } from '@/types';
import { apiGetTests, apiGetAttemptsForTest, apiGetStudents } from '@/lib/api';
import CreateQuizDialog from './CreateQuizDialog';
import QuizList from './QuizList';
import StudentList from './StudentList';
import ResultsView from './ResultsView';
import TestAttendanceView from './TestAttendanceView';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [myTests, setMyTests] = useState<Test[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  // Add state for test points
  // (moved above loadData to avoid block-scoped error)
  const [testPoints, setTestPoints] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    // Fallbacks from localStorage
    // No localStorage fallback — always load from server for consistency
    const loadLocal = () => {
      setTests([]);
      setStudents([]);
      setAttempts([]);
    };

    try {
      const resp = await apiGetTests();
      // resp shape: { tests: Array<any> }
      const serverTests = Array.isArray(resp?.tests) ? resp.tests : [];
      const mapped: Test[] = serverTests
        .filter(Boolean)
        .map((t: Record<string, any>) => {
          const id = String(t._id || t.id);
          const title = String(t.title || 'Untitled');
          const description = String(t.description || '');
          const questionsCount = Array.isArray(t.questions) ? t.questions.length : 0;
          const assigned = t.assignedTo || {};
          const semester = String(assigned.semester || user?.semester || '');
          const depts = assigned.departments || assigned.department || assigned.dept;
          const departments = Array.isArray(depts) ? depts.map(String) : (depts ? [String(depts)] : []);
          // Defaults for UI compatibility
          const durationMinutes = Number.isFinite(t.durationMinutes) ? t.durationMinutes : 30;
          const attemptsAllowed = Number.isFinite(t.attemptsAllowed) ? t.attemptsAllowed : 1;
          const shuffleQuestions = !!t.shuffleQuestions;
          const shuffleOptions = !!t.shuffleOptions;
          const startAt = t.startAt ? String(t.startAt) : new Date().toISOString();
          const endAt = t.endAt ? String(t.endAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          // Always coerce createdBy to string for comparison
          let createdBy = t.createdBy;
          if (createdBy && typeof createdBy === 'object' && createdBy._id) createdBy = String(createdBy._id);
          else createdBy = String(createdBy);
          return {
            id,
            title,
            description,
            assignedTo: { semester, departments },
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

      setTests(mapped);
      const myMappedTests = mapped.filter(t => String(t.createdBy) === String(user?.id || ''));
      setMyTests(myMappedTests);

      // Build testId to total points map
      const pointsMap: Record<string, number> = {};
      for (const t of serverTests) {
        const id = String(t._id || t.id);
        const totalPoints = Array.isArray(t.questions)
          ? t.questions.reduce((sum, q) => sum + (q.points || 1), 0)
          : 0;
        pointsMap[id] = totalPoints;
      }
      // Fetch attempts per test from backend (first page)
      try {
        const allAttempts = [] as Attempt[];
        for (const t of serverTests) {
          const id = String(t._id || t.id);
          const r = await apiGetAttemptsForTest(id, 1, 200);
          const arr = Array.isArray(r?.attempts) ? r.attempts : [];
          const title = String(t.title || 'Untitled');
          for (const a of arr) {
              allAttempts.push({
                id: String(a._id || a.attemptId || crypto.randomUUID()),
                testId: id,
                testTitle: title,
                studentId: String(a.student?._id || a.student || ''),
                answers: Array.isArray(a.answers) ? a.answers.map((x: Record<string, any>) => ({ questionId: String(x.questionId || ''), selectedOption: Number(x.answer ?? x.selectedOption ?? -1), timeTakenSec: Number(x.timeTakenSec || 0) })) : [],
                score: Number(a.score || 0),
                startedAt: String(a.startedAt || ''),
                finishedAt: String(a.submittedAt || a.finishedAt || ''),
                suspiciousEvents: Array.isArray(a.suspiciousEvents) ? a.suspiciousEvents : [],
              });
            }
        }
        setAttempts(allAttempts);
      } catch {
        // ignore; will fallback to local attempts below
      }

      try {
        const { students: allStudents } = await apiGetStudents({ limit: 1000 });
        const adminDept = user?.dept;
        if (adminDept) {
          const filtered = Array.isArray(allStudents)
            ? allStudents.filter((s: User) => String(s.dept || (s as Record<string, any>).department || '') === String(adminDept))
            : [];
          setStudents(filtered);
        } else {
          setStudents(allStudents || []);
        }
      } catch (error) {
        console.error('Failed to fetch students', error);
      }
    } catch (e) {
      // If request fails, clear lists and show a console message (no localStorage usage)
      console.error('Failed to load admin data from server', e);
      loadLocal();
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 animate-gradient-shift bg-[length:200%_200%]" />
      
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Glassmorphism header */}
      <header className="relative border-b border-white/10 backdrop-blur-xl bg-.white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <div className="px-2 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.name} • Semester {user?.semester} • {user?.dept}
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
            { title: 'Total Tests', value: tests.length, icon: FileText, gradient: 'from-violet-500/10 to-purple-500/10', iconColor: 'text-violet-400' },
            { title: 'Students', value: students.length, icon: Users, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-cyan-400' },
            { title: 'Total Attempts', value: attempts.length, icon: BarChart, gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-400' },
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

        {/* Tabs */}
        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList className="backdrop-blur-xl bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="tests" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              My Tests
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              Students
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              Attendance
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Test Management
              </h2>
              <Button 
                onClick={() => setShowCreateQuiz(true)}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 hover:scale-105 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Test
              </Button>
            </div>
            <QuizList tests={myTests} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="students">
            <StudentList students={students} />
          </TabsContent>

          <TabsContent value="attendance">
            <TestAttendanceView attempts={attempts} tests={tests} students={students} />
          </TabsContent>

          <TabsContent value="results">
            <ResultsView attempts={attempts} tests={tests} students={students} />
          </TabsContent>
        </Tabs>
      </main>

      <CreateQuizDialog
        open={showCreateQuiz}
        onOpenChange={setShowCreateQuiz}
        onSuccess={loadData}
      />
    </div>
  );
};

export default AdminDashboard;
