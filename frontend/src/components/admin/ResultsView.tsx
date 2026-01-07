import { useMemo, useState } from 'react';
import { Attempt, Test, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowLeft, Download, Filter, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDurationMs } from '@/lib/utils';
import { useAttemptsForTestQuery } from '@/hooks/useApiQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { convertToCSV, downloadCSV } from '@/lib/csvUtils';

const ResultsView = ({ tests }: { tests: Test[], attempts?: Attempt[], students?: User[] }) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState('score-desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [malpracticeFilter, setMalpracticeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const selectedTest = tests.find(t => t.id === selectedTestId);

  // Constants for filter options
  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA'];
  const years = ['1', '2', '3', '4'];
  const sections = ['A', 'B', 'C', 'D'];

  const queryParams = useMemo(() => ({
    search: searchTerm,
    status: statusFilter,
    malpractice: malpracticeFilter,
    dept: deptFilter,
    year: yearFilter,
    section: sectionFilter,
    sortBy: sortConfig,
    limit: 100,
  }), [searchTerm, statusFilter, malpracticeFilter, deptFilter, yearFilter, sectionFilter, sortConfig]);

  const attemptsQuery = useAttemptsForTestQuery(selectedTestId, queryParams, !!selectedTestId);

  const loading = attemptsQuery.isFetching;
  const resultsFromQuery: Attempt[] = useMemo(() => {
    const arr = (attemptsQuery.data as any)?.attempts;
    return Array.isArray(arr) ? arr : [];
  }, [attemptsQuery.data]);

  const metrics = useMemo(() => {
    const total = resultsFromQuery.length;
    const passed = resultsFromQuery.filter((a) => Number(a.score || 0) >= 70).length;
    const malpractice = resultsFromQuery.filter((a) => {
      const suspiciousCount = a.suspiciousEvents?.length || 0;
      return !!a.malpractice || suspiciousCount > 0 || !!(a as any).autoSubmitted;
    }).length;
    const avg = total ? Math.round(resultsFromQuery.reduce((s, a) => s + Number(a.score || 0), 0) / total) : 0;
    return { total, passed, malpractice, avg };
  }, [resultsFromQuery]);

  const handleExport = () => {
    if (!resultsFromQuery || resultsFromQuery.length === 0) return;

    const dataToExport = resultsFromQuery.map((attempt: any) => ({
      Rank: '', // Will be filled by row index if needed, or omitted
      StudentName: attempt.student?.name || 'Unknown',
      Email: attempt.student?.email || 'N/A',
      Dept: attempt.student?.dept || 'N/A',
      Year: attempt.student?.year || 'N/A',
      Section: attempt.student?.section || 'N/A',
      Score: attempt.score,
      TotalQuestions: attempt.totalQuestions || 0,
      Percentage: attempt.percentage ? attempt.percentage.toFixed(2) : '0',
      Status: attempt.score >= 70 ? 'Pass' : 'Fail', // Assuming 70 is pass logic matches UI
      TimeTaken: attempt.submittedAt && attempt.startedAt
        ? formatDurationMs(new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime())
        : 'N/A',
      Malpractice: attempt.malpractice ? 'Yes' : 'No',
      MalpracticeReason: attempt.malpracticeReason || '',
      SuspiciousEvents: attempt.suspiciousEvents?.length || 0,
      SubmittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'
    }));

    // Add Rank
    dataToExport.forEach((row, index) => { row.Rank = String(index + 1); });

    const csv = convertToCSV(dataToExport, ['Rank', 'StudentName', 'Email', 'Dept', 'Year', 'Section', 'Score', 'Percentage', 'Status', 'TimeTaken', 'Malpractice', 'MalpracticeReason', 'SuspiciousEvents', 'SubmittedAt']);
    downloadCSV(csv, `${selectedTest?.title || 'test'}_results.csv`);
  };

  if (!selectedTestId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
            <p className="text-sm text-muted-foreground">Pick a test to explore student performance and integrity signals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Fast filters
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Malpractice insights
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => (
            <Card
              key={test.id}
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
              onClick={() => setSelectedTestId(test.id)}
            >
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{test.title}</CardTitle>
                {test.description ? (
                  <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                ) : (
                  <CardDescription>Open analytics and student attempts.</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {Array.isArray(test.questions) ? `${test.questions.length} questions` : 'Questions'}
                </div>
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/15" variant="secondary">
                  View
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTestId(null);
              setSelectedAttempt(null);
              setSelectedStudent(null);
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tests
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{selectedTest?.title || 'Unknown Test'}</h2>
            <p className="text-sm text-muted-foreground">Results, ranking and integrity signals</p>
          </div>
          {loading ? <span className="text-xs text-muted-foreground animate-pulse">Syncing…</span> : null}
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <Button onClick={handleExport} disabled={resultsFromQuery.length === 0} size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="space-y-0">
            <CardDescription>Total Attempts</CardDescription>
            <CardTitle className="text-3xl">{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-0">
            <CardDescription>Passed</CardDescription>
            <CardTitle className="text-3xl">{metrics.passed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-0">
            <CardDescription>Integrity Flags</CardDescription>
            <CardTitle className="text-3xl">{metrics.malpractice}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-0">
            <CardDescription>Avg. Score</CardDescription>
            <CardTitle className="text-3xl">{metrics.avg}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Filter className="h-4 w-4" />
                </span>
                Filters
              </CardTitle>
              <CardDescription>Refine by status, department, year and flags.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setMalpracticeFilter('all');
                  setDeptFilter('all');
                  setYearFilter('all');
                  setSectionFilter('all');
                  setSortConfig('score-desc');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name, enrollment, register no…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pass">Passed</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Malpractice</label>
              <Select value={malpracticeFilter} onValueChange={setMalpracticeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Detected</SelectItem>
                  <SelectItem value="no">Clean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Sort</label>
              <Select value={sortConfig} onValueChange={setSortConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score-desc">Score (High-Low)</SelectItem>
                  <SelectItem value="score-asc">Score (Low-High)</SelectItem>
                  <SelectItem value="time-asc">Time (Fast-Slow)</SelectItem>
                  <SelectItem value="time-desc">Time (Slow-Fast)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="dept-asc">Dept (A-Z)</SelectItem>
                  <SelectItem value="dept-desc">Dept (Z-A)</SelectItem>
                  <SelectItem value="year-asc">Year (Asc)</SelectItem>
                  <SelectItem value="year-desc">Year (Desc)</SelectItem>
                  <SelectItem value="section-asc">Section (A-Z)</SelectItem>
                  <SelectItem value="section-desc">Section (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Dept</label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>
                      {y}{y === '1' ? 'st' : y === '2' ? 'nd' : y === '3' ? 'rd' : 'th'} Year
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Section</label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-3 flex items-end">
              <div className="w-full rounded-2xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{resultsFromQuery.length}</span> attempts for this test.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Click a student name for profile. Click a flag for details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
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
              {resultsFromQuery.map((attempt, index) => {
                const suspiciousCount = attempt.suspiciousEvents?.length || 0;
                const hasMalpractice = attempt.malpractice || suspiciousCount > 0;
                const isAutoSubmitted = attempt.autoSubmitted;
                const student = (attempt as any).student || {};

                return (
                  <TableRow
                    key={String((attempt as any)._id || (attempt as any).attemptId || attempt.id || `${selectedTestId}-${index}`)}
                    className={hasMalpractice ? 'bg-destructive/5' : ''}
                  >
                    <TableCell className="font-bold text-muted-foreground">#{index + 1}</TableCell>
                    <TableCell
                      className="font-medium cursor-pointer hover:underline text-primary"
                      onClick={() => setSelectedStudent(student as User)}
                    >
                      {student.name || 'Unknown'}
                    </TableCell>
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
                            <div className="text-xs text-destructive">
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
              {resultsFromQuery.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No results match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>

        <Dialog open={!!selectedAttempt} onOpenChange={(open) => !open && setSelectedAttempt(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Malpractice Details</DialogTitle>
              <DialogDescription>
                Student: {selectedAttempt && ((selectedAttempt as any).student?.name || selectedAttempt.studentId)}
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

        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                Information for {selectedStudent?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <span className="font-semibold">Name:</span>
                  <span className="sm:col-span-3">{selectedStudent.name}</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <span className="font-semibold">Email:</span>
                  <span className="sm:col-span-3 break-words">{selectedStudent.email}</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <span className="font-semibold">Enrollment:</span>
                  <span className="sm:col-span-3 break-words">{selectedStudent.enrollmentNumber || 'N/A'}</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <span className="font-semibold">Dept:</span>
                  <span className="sm:col-span-3">{selectedStudent.dept || 'N/A'}</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <span className="font-semibold">Year/Sem:</span>
                  <span className="sm:col-span-3">{selectedStudent.year} / {selectedStudent.semester}</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-4">
                  <span className="font-semibold">Section:</span>
                  <span className="sm:col-span-3">{selectedStudent.section || 'N/A'}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default ResultsView;
