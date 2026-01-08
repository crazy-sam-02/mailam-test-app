import { Attempt, Test, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { formatDurationMs } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiGetAttemptsForTest } from '@/lib/api';

interface ResultsViewProps {
  attempts: Attempt[];
  tests: Test[];
  students: User[];
}

const ResultsView = ({ attempts, tests, students }: ResultsViewProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [filteredAttempts, setFilteredAttempts] = useState<Attempt[]>([]);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score-high' | 'score-low' | 'name-asc' | 'name-desc' | 'time-low' | 'time-high'>('score-high');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch filtered attempts from server when filters or test changes
  useEffect(() => {
    if (!selectedTestId) return;

    const fetchFilteredAttempts = async () => {
      setIsLoading(true);
      try {
        const filters: any = {
          dept: deptFilter !== 'ALL' ? deptFilter : undefined,
          year: yearFilter !== 'ALL' ? yearFilter : undefined,
          section: sectionFilter !== 'ALL' ? sectionFilter : undefined,
        };
        if (searchQuery) filters.search = searchQuery;

        const response = await apiGetAttemptsForTest(selectedTestId, 1, 500, filters);
        const serverAttempts = Array.isArray(response?.attempts) ? response.attempts : [];
        
        const mappedAttempts: Attempt[] = serverAttempts.map((a: any) => ({
          id: String(a._id || a.attemptId || crypto.randomUUID()),
          testId: selectedTestId,
          testTitle: tests.find(t => t.id === selectedTestId)?.title || 'Unknown',
          studentId: String(a.student?._id || a.student || ''),
          studentName: a.student?.name,
          answers: Array.isArray(a.answers) ? a.answers.map((x: any) => ({
            questionId: String(x.questionId || ''),
            selectedOption: Number(x.answer ?? x.selectedOption ?? -1),
            timeTakenSec: Number(x.timeTakenSec || 0)
          })) : [],
          score: Number(a.score || 0),
          startedAt: String(a.startedAt || ''),
          finishedAt: String(a.submittedAt || a.finishedAt || ''),
          submittedAt: String(a.submittedAt || a.finishedAt || ''),
          suspiciousEvents: Array.isArray(a.suspiciousEvents) ? a.suspiciousEvents : [],
          malpractice: a.malpractice,
          malpracticeReason: a.malpracticeReason,
          autoSubmitted: a.autoSubmitted,
        }));

        setFilteredAttempts(mappedAttempts);
      } catch (error) {
        console.error('Failed to fetch filtered attempts:', error);
        // Fallback to client-side filtering
        const clientFiltered = attempts.filter(a => {
          if (a.testId !== selectedTestId) return false;
          const student = students.find(s => s.id === a.studentId);
          if (!student) return false;
          if (deptFilter !== 'ALL' && student.dept !== deptFilter) return false;
          if (yearFilter !== 'ALL' && student.year !== yearFilter) return false;
          if (sectionFilter !== 'ALL' && student.section !== sectionFilter) return false;
          if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            if (
              !student.name.toLowerCase().includes(sq) &&
              !student.email?.toLowerCase().includes(sq) &&
              !student.enrollmentNumber?.toLowerCase().includes(sq) &&
              !student.registerNumber?.toLowerCase().includes(sq)
            ) {
              return false;
            }
          }
          return true;
        });
        setFilteredAttempts(clientFiltered);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredAttempts();
  }, [selectedTestId, deptFilter, yearFilter, sectionFilter, searchQuery, attempts, tests, students]);

  // Early return for test selection screen - AFTER all hooks
  if (!selectedTestId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select a Test to View Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map(test => {
            const testAttempts = attempts.filter(a => a.testId === test.id);
            const passedCount = testAttempts.filter(a => a.score >= 70).length;
            const avgScore = testAttempts.length > 0
              ? Math.round(testAttempts.reduce((acc, a) => acc + a.score, 0) / testAttempts.length)
              : 0;

            return (
              <Card
                key={test.id}
                className="cursor-pointer hover:bg-accent/5 transition-colors border-l-4 border-l-primary"
                onClick={() => setSelectedTestId(test.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{test.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Attempts:</span>
                      <span className="font-semibold">{testAttempts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Score:</span>
                      <span>{avgScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passed:</span>
                      <span className="text-green-600">{passedCount}</span>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Badge variant="secondary">View Results</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedTest = tests.find(t => t.id === selectedTestId);

  const getStudentName = (studentId: string) => {
    // First try to get from the attempt itself (if populated)
    const attempt = filteredAttempts.find(a => a.studentId === studentId);
    if (attempt && (attempt as any).studentName) return (attempt as any).studentName;
    // Fallback to students list
    return students.find(s => s.id === studentId)?.name || 'Unknown';
  };

  // Options
  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA'];
  const years = ['1', '2', '3', '4'];
  const sections = ['A', 'B', 'C', 'D'];

  const renderFilterBar = () => (
    <div className="relative p-6 mb-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 shadow-xl animate-fade-in">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="relative flex flex-wrap gap-4">
        <div className="flex flex-col gap-2 min-w-[200px] flex-1">
          <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-primary"></span>
            Search Student
          </label>
          <input
            type="text"
            placeholder="🔍 Name, email, enrollment or register no."
            className="h-10 w-full rounded-lg border-2 border-input/50 bg-background/80 backdrop-blur-sm px-3 text-sm shadow-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary placeholder:text-muted-foreground/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 min-w-[140px] flex-1">
          <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
            Department
          </label>
          <select
            className="h-10 w-full rounded-lg border-2 border-input/50 bg-background/80 backdrop-blur-sm px-3 text-sm shadow-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary cursor-pointer"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">📚 All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2 min-w-[110px] flex-1">
          <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-green-500"></span>
            Year
          </label>
          <select
            className="h-10 w-full rounded-lg border-2 border-input/50 bg-background/80 backdrop-blur-sm px-3 text-sm shadow-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary cursor-pointer"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="ALL">📅 All Years</option>
            {years.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2 min-w-[110px] flex-1">
          <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-purple-500"></span>
            Section
          </label>
          <select
            className="h-10 w-full rounded-lg border-2 border-input/50 bg-background/80 backdrop-blur-sm px-3 text-sm shadow-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary cursor-pointer"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="ALL">📋 All Sections</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2 min-w-[160px] flex-1">
          <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-orange-500"></span>
            Sort By
          </label>
          <select
            className="h-10 w-full rounded-lg border-2 border-input/50 bg-background/80 backdrop-blur-sm px-3 text-sm shadow-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary cursor-pointer font-medium"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="score-high">🔥 Score: High → Low</option>
            <option value="score-low">❄️ Score: Low → High</option>
            <option value="name-asc">🔤 Name: A → Z</option>
            <option value="name-desc">🔠 Name: Z → A</option>
            <option value="time-low">⚡ Time: Fastest First</option>
            <option value="time-high">🐌 Time: Slowest First</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setDeptFilter('ALL'); setYearFilter('ALL'); setSectionFilter('ALL'); setSearchQuery(''); setSortBy('score-high'); }} 
            className="h-10 px-4 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 font-medium border border-transparent hover:border-primary/20"
          >
            ↺ Reset
          </Button>
        </div>
      </div>
    </div>
  );

  if (filteredAttempts.length === 0 && (deptFilter === 'ALL' && yearFilter === 'ALL' && sectionFilter === 'ALL')) {
    // Show empty state only if NO filters are active. If filters active, show filters + empty table
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)}>
            &larr; Back to Tests
          </Button>
          <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Results</h2>
        </div>

        {renderFilterBar()}

        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No attempts match the selected criteria.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)}>
          &larr; Back to Tests
        </Button>
        <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Results</h2>
      </div>

      {renderFilterBar()}

      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading filtered results...
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attempts match the selected criteria.
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Student</TableHead>
                {/* Test column removed as we are in single test view */}
                <TableHead>Questions Correct</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Malpractice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttempts
                .sort((a, b) => {
                  switch (sortBy) {
                    case 'score-high':
                      return b.score - a.score;
                    case 'score-low':
                      return a.score - b.score;
                    case 'name-asc': {
                      const nameA = getStudentName(a.studentId).toLowerCase();
                      const nameB = getStudentName(b.studentId).toLowerCase();
                      return nameA.localeCompare(nameB);
                    }
                    case 'name-desc': {
                      const nameA = getStudentName(a.studentId).toLowerCase();
                      const nameB = getStudentName(b.studentId).toLowerCase();
                      return nameB.localeCompare(nameA);
                    }
                    case 'time-low': {
                      const timeA = new Date(a.submittedAt || 0).getTime() - new Date(a.startedAt).getTime();
                      const timeB = new Date(b.submittedAt || 0).getTime() - new Date(b.startedAt).getTime();
                      return timeA - timeB;
                    }
                    case 'time-high': {
                      const timeA = new Date(a.submittedAt || 0).getTime() - new Date(a.startedAt).getTime();
                      const timeB = new Date(b.submittedAt || 0).getTime() - new Date(b.startedAt).getTime();
                      return timeB - timeA;
                    }
                    default:
                      return b.score - a.score;
                  }
                })
                .map((attempt, index) => {
                  const suspiciousCount = attempt.suspiciousEvents?.length || 0;
                  const hasMalpractice = attempt.malpractice || suspiciousCount > 0;
                  const isAutoSubmitted = attempt.autoSubmitted;

                  return (
                    <TableRow key={attempt.id} className={hasMalpractice ? 'bg-red-50/50' : ''}>
                      <TableCell className="font-bold text-muted-foreground">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{getStudentName(attempt.studentId)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={attempt.score >= 70 ? 'default' : 'secondary'}>
                            {attempt.score}
                          </Badge>
                          {isAutoSubmitted && (
                            <Badge variant="destructive" className="text-xs">AUTO</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {attempt.submittedAt && attempt.startedAt ?
                          formatDurationMs(new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime())
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {hasMalpractice ? (
                          <div className="space-y-1">
                            <Badge
                              variant="destructive"
                              className="gap-1 cursor-pointer hover:bg-destructive/80"
                              onClick={() => setSelectedAttempt(attempt)}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {isAutoSubmitted ? 'AUTO-SUBMITTED' : 'MALPRACTICE'}
                            </Badge>
                            {attempt.malpracticeReason && (
                              <div className="text-xs text-muted-foreground">
                                {attempt.malpracticeReason}
                              </div>
                            )}
                            {suspiciousCount > 0 && (
                              <div className="text-xs text-red-600">
                                {suspiciousCount} suspicious events
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Clean</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          )}
        </CardContent>

        <Dialog open={!!selectedAttempt} onOpenChange={(open) => !open && setSelectedAttempt(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Malpractice Details</DialogTitle>
              <DialogDescription>
                Student: {selectedAttempt && getStudentName(selectedAttempt.studentId)}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] mt-4 rounded-md border p-4">
              {selectedAttempt?.malpracticeReason && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1 text-destructive">Primary Reason</h4>
                  <p className="text-sm text-muted-foreground">{selectedAttempt.malpracticeReason}</p>
                </div>
              )}

              <h4 className="font-semibold mb-2">Suspicious Events Log</h4>
              {selectedAttempt?.suspiciousEvents && selectedAttempt.suspiciousEvents.length > 0 ? (
                <ul className="space-y-3">
                  {selectedAttempt.suspiciousEvents.map((event, i) => (
                    <li key={i} className="text-sm flex flex-col gap-1 pb-2 border-b last:border-0">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {event.type}
                      </div>
                      <span className="text-xs text-muted-foreground pl-3.5">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No detailed events logged.</p>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default ResultsView;