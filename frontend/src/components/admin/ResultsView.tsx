import { Attempt, Test, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { formatDurationMs } from '@/lib/utils';

interface ResultsViewProps {
  attempts: Attempt[];
  tests: Test[];
  students: User[];
}

import { useMemo, useState } from 'react';
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

  if (!selectedTestId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select a Test to View Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map(test => (
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
                  <div className="pt-2 flex justify-end">
                    <Badge variant="secondary">View Results</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => { setSelectedTestId(null); }}>
          &larr; Back to Tests
        </Button>
        <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Results</h2>
        {loading && <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
          <div className="flex flex-wrap gap-4 w-full">
            <div className="w-full md:w-48">
              <label className="text-sm font-medium mb-1 block">Search Student</label>
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-32">
              <label className="text-sm font-medium mb-1 block">Status</label>
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
            <div className="w-full md:w-32">
              <label className="text-sm font-medium mb-1 block">Malpractice</label>
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

            <div className="w-full md:w-32">
              <label className="text-sm font-medium mb-1 block">Dept</label>
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

            <div className="w-full md:w-24">
              <label className="text-sm font-medium mb-1 block">Year</label>
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

            <div className="w-full md:w-24">
              <label className="text-sm font-medium mb-1 block">Sec</label>
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
          </div>

          <div className="w-full md:w-48 flex-shrink-0">
            <label className="text-sm font-medium mb-1 block">Sort By</label>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Results ({resultsFromQuery.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                    className={hasMalpractice ? 'bg-red-50/50' : ''}
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
                          {attempt.score}%
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
              {resultsFromQuery.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No results match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold">Name:</span>
                  <span className="col-span-3">{selectedStudent.name}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold">Email:</span>
                  <span className="col-span-3">{selectedStudent.email}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold">Enrollment:</span>
                  <span className="col-span-3">{selectedStudent.enrollmentNumber || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold">Dept:</span>
                  <span className="col-span-3">{selectedStudent.dept || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold">Year/Sem:</span>
                  <span className="col-span-3">{selectedStudent.year} / {selectedStudent.semester}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-semibold">Section:</span>
                  <span className="col-span-3">{selectedStudent.section || 'N/A'}</span>
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
