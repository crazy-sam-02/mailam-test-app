import { useState, useEffect } from 'react';
import { Attempt, Test, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDurationMs } from '@/lib/utils';
import { apiGetAttemptsForTest, apiGetStudents } from '@/lib/api';

interface TestAttendanceViewProps {
  attempts: Attempt[];
  tests: Test[];
  students: User[];
}

const TestAttendanceView = ({ attempts, tests, students }: TestAttendanceViewProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score-high' | 'score-low' | 'name-asc' | 'name-desc' | 'time-low' | 'time-high'>('score-high');
  const [filteredAttempts, setFilteredAttempts] = useState<Attempt[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch filtered data when filters or test changes
  useEffect(() => {
    if (!selectedTestId) return;

    const fetchFilteredData = async () => {
      setIsLoading(true);
      try {
        const filters: any = {
          dept: deptFilter !== 'ALL' ? deptFilter : undefined,
          year: yearFilter !== 'ALL' ? yearFilter : undefined,
          section: sectionFilter !== 'ALL' ? sectionFilter : undefined,
        };
        if (searchQuery) filters.search = searchQuery;

        // Fetch filtered attempts
        const attemptsResponse = await apiGetAttemptsForTest(selectedTestId, 1, 500, filters);
        const serverAttempts = Array.isArray(attemptsResponse?.attempts) ? attemptsResponse.attempts : [];
        
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
          suspiciousEvents: Array.isArray(a.suspiciousEvents) ? a.suspiciousEvents : [],
        }));

        setFilteredAttempts(mappedAttempts);

        // Fetch filtered students for the "not attended" list
        const studentsResponse = await apiGetStudents({
          ...filters,
          limit: 2000
        });
        setFilteredStudents(studentsResponse.students || []);
      } catch (error) {
        console.error('Failed to fetch filtered data:', error);
        // Fallback to client-side filtering
        const clientFilteredAttempts = attempts.filter(a => {
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
              !student.email.toLowerCase().includes(sq) &&
              !student.enrollmentNumber?.toLowerCase().includes(sq) &&
              !student.registerNumber?.toLowerCase().includes(sq)
            ) {
              return false;
            }
          }
          return true;
        });
        setFilteredAttempts(clientFilteredAttempts);

        const clientFilteredStudents = students.filter(s => {
          if (deptFilter !== 'ALL' && s.dept !== deptFilter) return false;
          if (yearFilter !== 'ALL' && s.year !== yearFilter) return false;
          if (sectionFilter !== 'ALL' && s.section !== sectionFilter) return false;
          if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            if (
              !s.name.toLowerCase().includes(sq) &&
              !s.email.toLowerCase().includes(sq) &&
              !s.enrollmentNumber?.toLowerCase().includes(sq) &&
              !s.registerNumber?.toLowerCase().includes(sq)
            ) {
              return false;
            }
          }
          return true;
        });
        setFilteredStudents(clientFilteredStudents);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredData();
  }, [selectedTestId, deptFilter, yearFilter, sectionFilter, searchQuery, attempts, tests, students]);

  // Early return for test selection screen - AFTER all hooks
  if (!selectedTestId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select a Test to View Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map(test => {
            const testAttempts = attempts.filter(a => a.testId === test.id);
            const distinctStudents = new Set(testAttempts.map(a => a.studentId)).size;
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
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{distinctStudents} Students Attended</span>
                    <Badge variant="secondary">View</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Filters
  const selectedTest = tests.find(t => t.id === selectedTestId);

  // Helper to check filters
  const matchesFilters = (student: User) => {
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
  };

  // Get students who attended (have attempts for THIS test)
  const studentIdsWithAttempts = new Set(filteredAttempts.map(a => a.studentId));

  // Filter attended list (use filteredStudents if available, otherwise students)
  const attendedStudents = (filteredStudents.length > 0 ? filteredStudents : students)
    .filter(s => studentIdsWithAttempts.has(s.id) && matchesFilters(s));

  // Filter students who are eligible for this test but haven't attended
  const notAttendedStudents = (filteredStudents.length > 0 ? filteredStudents : students)
    .filter(s => {
    if (studentIdsWithAttempts.has(s.id)) return false; // Already attended

    // Then apply UI filters
    if (!matchesFilters(s)) return false;

    // Apply search query
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(sq);
      const emailMatch = s.email.toLowerCase().includes(sq);
      const enrollmentMatch = s.enrollmentNumber?.toLowerCase().includes(sq);
      const registerMatch = s.registerNumber?.toLowerCase().includes(sq);
      if (!nameMatch && !emailMatch && !enrollmentMatch && !registerMatch) return false;
    }

    if (!selectedTest?.assignedTo) return true; // if no specific assignment, all non-attendees are included

    // Check Department Match (Test Eligibility)
    const assignedDepts = selectedTest.assignedTo.departments || [];
    const studentDept = s.dept || '';
    const deptMatch = assignedDepts.length === 0 || assignedDepts.some(d => d.toLowerCase() === studentDept.toLowerCase());

    // Check Semester Match (Test Eligibility)
    const assignedSems = selectedTest.assignedTo.semester || [];
    const semList = Array.isArray(assignedSems) ? assignedSems : [assignedSems];
    const studentSem = s.semester || '';
    const semMatch = semList.length === 0 || semList.some(sem => String(sem) === String(studentSem));

    return deptMatch && semMatch;
  });

  // Map attempts to students
  const studentAttempts = attendedStudents.map(student => {
    const studentAttemptsList = filteredAttempts.filter(a => a.studentId === student.id);
    return {
      student,
      attempts: studentAttemptsList
    };
  });

  // Options
  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA'];
  const years = ['1', '2', '3', '4'];
  const sections = ['A', 'B', 'C', 'D'];

  const renderFilterBar = () => (
    <div className="flex flex-wrap gap-4 p-4 mb-4 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 animate-fade-in">
      <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Search Student</label>
        <input
          type="text"
          placeholder="Name, email, enrollment or register no."
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 min-w-[120px] flex-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Department</label>
        <select
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="ALL">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 min-w-[100px] flex-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Year</label>
        <select
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="ALL">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 min-w-[100px] flex-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Section</label>
        <select
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-.ring"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          <option value="ALL">All Sections</option>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 min-w-[140px] flex-1">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Sort By</label>
        <select
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="score-high">Score: High to Low</option>
          <option value="score-low">Score: Low to High</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
          <option value="time-low">Time: Fastest First</option>
          <option value="time-high">Time: Slowest First</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={() => { setDeptFilter('ALL'); setYearFilter('ALL'); setSectionFilter('ALL'); setSearchQuery(''); setSortBy('score-high'); }} className="h-8 text-xs">
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)}>
          &larr; Back to Tests
        </Button>
        <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Attendance</h2>
      </div>

      {renderFilterBar()}

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading attendance data...
          </CardContent>
        </Card>
      ) : (
      <Tabs defaultValue="attended" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attended" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Attended ({attendedStudents.length})
          </TabsTrigger>
          <TabsTrigger value="not-attended" className="gap-2">
            <XCircle className="w-4 h-4" />
            Not Attended ({notAttendedStudents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attended">
          <Card>
            <CardHeader>
              <CardTitle>Students Who Attended</CardTitle>
            </CardHeader>
            <CardContent>
              {studentAttempts.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  No students have attended this test yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Enrollment No.</TableHead>
                      <TableHead>Questions Correct</TableHead>
                      <TableHead>Time Taken</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentAttempts
                      .sort((a, b) => {
                        const attemptA = a.attempts[0];
                        const attemptB = b.attempts[0];
                        
                        switch (sortBy) {
                          case 'score-high':
                            return attemptB.score - attemptA.score;
                          case 'score-low':
                            return attemptA.score - attemptB.score;
                          case 'name-asc':
                            return a.student.name.toLowerCase().localeCompare(b.student.name.toLowerCase());
                          case 'name-desc':
                            return b.student.name.toLowerCase().localeCompare(a.student.name.toLowerCase());
                          case 'time-low': {
                            const timeA = new Date(attemptA.finishedAt).getTime() - new Date(attemptA.startedAt).getTime();
                            const timeB = new Date(attemptB.finishedAt).getTime() - new Date(attemptB.startedAt).getTime();
                            return timeA - timeB;
                          }
                          case 'time-high': {
                            const timeA = new Date(attemptA.finishedAt).getTime() - new Date(attemptA.startedAt).getTime();
                            const timeB = new Date(attemptB.finishedAt).getTime() - new Date(attemptB.startedAt).getTime();
                            return timeB - timeA;
                          }
                          default:
                            return attemptB.score - attemptA.score;
                        }
                      })
                      .flatMap(({ student, attempts: studentAttemptsList }) =>
                      studentAttemptsList.map((attempt) => {
                        return (
                          <TableRow key={attempt.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.enrollmentNumber || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={attempt.score >= 70 ? 'default' : 'secondary'}>
                                {attempt.score}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDurationMs(new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime())}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="not-attended">
          <Card>
            <CardHeader>
              <CardTitle>Students Who Haven't Attended</CardTitle>
            </CardHeader>
            <CardContent>
              {notAttendedStudents.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  All students have attended this test.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Section</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notAttendedStudents
                      .sort((a, b) => {
                        // For not attended students, only name sorting makes sense
                        if (sortBy === 'name-desc') {
                          return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
                        }
                        // Default to name ascending
                        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                      })
                      .map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.dept}</TableCell>
                        <TableCell>{student.year}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Semester {student.semester}</Badge>
                        </TableCell>
                        <TableCell>{student.section}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
};

export default TestAttendanceView;
