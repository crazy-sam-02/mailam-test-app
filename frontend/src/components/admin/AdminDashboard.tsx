import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Users, FileText, BarChart, Sparkles } from 'lucide-react';
import { Test, User, Attempt } from '@/types';
import { useStudentsQuery, useTestsQuery } from '@/hooks/useApiQueries';
import CreateQuizDialog from './CreateQuizDialog';
import QuizList from './QuizList';
import StudentList from './StudentList';
import ResultsView from './ResultsView';
import TestAttendanceView from './TestAttendanceView';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);

  const testsQuery = useTestsQuery();
  const studentsQuery = useStudentsQuery({ limit: 1000 }, !!user);

  const tests: Test[] = useMemo(() => {
    const serverTests = Array.isArray((testsQuery.data as any)?.tests) ? (testsQuery.data as any).tests : [];
    return serverTests
      .filter(Boolean)
      .map((t: Record<string, any>) => {
        const id = String(t._id || t.id);
        const title = String(t.title || 'Untitled');
        const description = String(t.description || '');
        const questionsCount = Array.isArray(t.questions) ? t.questions.length : 0;
        const assigned = t.assignedTo || {};

        let semester: string[] = [];
        const rawSem = assigned.semester || assigned.sem;
        if (Array.isArray(rawSem)) semester = rawSem.map(String);
        else if (rawSem) semester = [String(rawSem)];

        const depts = assigned.departments || assigned.department || assigned.dept;
        const departments = Array.isArray(depts) ? depts.map(String) : (depts ? [String(depts)] : []);
        const durationMinutes = Number.isFinite(t.durationMinutes) ? t.durationMinutes : 30;
        const attemptsAllowed = Number.isFinite(t.attemptsAllowed) ? t.attemptsAllowed : 1;
        const shuffleQuestions = !!t.shuffleQuestions;
        const shuffleOptions = !!t.shuffleOptions;
        const startAt = t.startAt ? String(t.startAt) : new Date().toISOString();
        const endAt = t.endAt ? String(t.endAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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
          createdByName: t.createdByName,
        } as Test;
      });
  }, [testsQuery.data]);

  const students: User[] = useMemo(() => {
    const all = (studentsQuery.data as any)?.students;
    return Array.isArray(all) ? all : [];
  }, [studentsQuery.data]);

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
      <header className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
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
        <div className="grid gap-6 md:grid-cols-4 mb-8 animate-fade-in">
          {(() => {
            return [
              { title: 'Total Tests', value: tests.length, icon: FileText, gradient: 'from-violet-500/10 to-purple-500/10', iconColor: 'text-violet-400' },
              { title: 'Students', value: students.length, icon: Users, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-cyan-400' },
              // Removed Total Attempts and Malpractice stats as we no longer fetch all attempts
            ];
          })().map((stat, index) => (
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
              Tests
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
            <QuizList tests={tests} onUpdate={() => { testsQuery.refetch(); }} />
          </TabsContent>

          <TabsContent value="students">
            <StudentList students={students} />
          </TabsContent>

          <TabsContent value="attendance">
            <TestAttendanceView tests={tests} />
          </TabsContent>

          <TabsContent value="results">
            <ResultsView tests={tests} />
          </TabsContent>
        </Tabs>
      </main>

      <CreateQuizDialog
        open={showCreateQuiz}
        onOpenChange={setShowCreateQuiz}
        onSuccess={() => { testsQuery.refetch(); }}
      />
    </div>
  );
};

export default AdminDashboard;
