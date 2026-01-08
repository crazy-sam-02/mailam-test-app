import { useState } from 'react';
import { Test, User, Attempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDurationMs } from '@/lib/utils';
import { useAttemptsForTestQuery, useNotAttendedForTestQuery } from '@/hooks/useApiQueries';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { convertToCSV, downloadCSV } from '@/lib/csvUtils';
import { Download } from 'lucide-react';

const TestAttendanceView = ({ tests }: { tests: Test[] }) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('attended');

  // Attended Filters
  const [attendedPage, setAttendedPage] = useState(1);
  const [attendedSearchTerm, setAttendedSearchTerm] = useState('');
  const [attendedSortConfig, setAttendedSortConfig] = useState('submittedAt-desc');
  const [attendedStatusFilter, setAttendedStatusFilter] = useState('all');
  const [attendedDeptFilter, setAttendedDeptFilter] = useState('all');
  const [attendedYearFilter, setAttendedYearFilter] = useState('all');
  const [attendedSectionFilter, setAttendedSectionFilter] = useState('all');
  const [attendedMalpracticeFilter, setAttendedMalpracticeFilter] = useState('all');

  // Not Attended Filters
  const [notAttendedPage, setNotAttendedPage] = useState(1);
  const [notAttendedSearchTerm, setNotAttendedSearchTerm] = useState('');
  const [notAttendedDeptFilter, setNotAttendedDeptFilter] = useState('all');
  const [notAttendedYearFilter, setNotAttendedYearFilter] = useState('all');
  const [notAttendedSectionFilter, setNotAttendedSectionFilter] = useState('all');
  const [notAttendedSortConfig, setNotAttendedSortConfig] = useState('name-asc');

  const selectedTest = tests.find(t => t.id === selectedTestId);

  // Queries
  const attendedQuery = useAttemptsForTestQuery(
    selectedTestId,
    {
      page: attendedPage,
      limit: 10,
      search: attendedSearchTerm,
      sortBy: attendedSortConfig,
      status: attendedStatusFilter === 'all' ? undefined : attendedStatusFilter,
      dept: attendedDeptFilter === 'all' ? undefined : attendedDeptFilter,
      year: attendedYearFilter === 'all' ? undefined : attendedYearFilter,
      section: attendedSectionFilter === 'all' ? undefined : attendedSectionFilter,
      malpractice: attendedMalpracticeFilter === 'all' ? undefined : attendedMalpracticeFilter,
    },
    !!selectedTestId && activeTab === 'attended'
  );

  const notAttendedQuery = useNotAttendedForTestQuery(
    selectedTestId,
    {
      page: notAttendedPage,
      limit: 10,
      search: notAttendedSearchTerm,
      sortBy: notAttendedSortConfig,
      dept: notAttendedDeptFilter === 'all' ? undefined : notAttendedDeptFilter,
      year: notAttendedYearFilter === 'all' ? undefined : notAttendedYearFilter,
      section: notAttendedSectionFilter === 'all' ? undefined : notAttendedSectionFilter,
    },
    !!selectedTestId && activeTab === 'not-attended'
  );

  const attendedData = (attendedQuery.data as any)?.attempts || [];
  const attendedTotal = (attendedQuery.data as any)?.total || 0;

  const notAttendedData = (notAttendedQuery.data as any)?.students || [];
  const notAttendedTotal = (notAttendedQuery.data as any)?.total || 0;

  // Constants for filter options
  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA'];
  const years = ['1', '2', '3', '4'];
  const sections = ['A', 'B', 'C', 'D'];

  const handleExport = () => {
    if (activeTab === 'attended') {
      if (!attendedData || attendedData.length === 0) return;
      const data = attendedData.map((attempt: any) => ({
        StudentName: attempt.student?.name || 'Unknown',
        Enrollment: attempt.student?.enrollmentNumber || 'N/A',
        Dept: attempt.student?.dept || 'N/A',
        Year: attempt.student?.year || 'N/A',
        Section: attempt.student?.section || 'N/A',
        Score: attempt.score,
        Status: attempt.score >= 70 ? 'Pass' : 'Fail',
        TimeTaken: attempt.submittedAt && attempt.startedAt
          ? formatDurationMs(new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime())
          : 'N/A',
        SubmittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'
      }));
      const csv = convertToCSV(data);
      downloadCSV(csv, `${selectedTest?.title || 'test'}_attended_page_${attendedPage}.csv`);
    } else {
      if (!notAttendedData || notAttendedData.length === 0) return;
      const data = notAttendedData.map((student: User) => ({
        Name: student.name,
        Email: student.email,
        Dept: student.dept || '',
        Year: student.year || '',
        Semester: student.semester || '',
        Section: student.section || '',
        Enrollment: student.enrollmentNumber || '',
        RegisterNumber: student.registerNumber || ''
      }));
      const csv = convertToCSV(data);
      downloadCSV(csv, `${selectedTest?.title || 'test'}_not_attended_page_${notAttendedPage}.csv`);
    }
  };

  if (!selectedTestId) {
    // ... (existing selection view)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select a Test to View Attendance</h2>
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
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>View Attendance</span>
                  <Badge variant="secondary">Select</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ... (PaginationControls component)

  const PaginationControls = ({
    page,
    setPage,
    total,
    limit = 10
  }: {
    page: number,
    setPage: (p: number) => void,
    total: number,
    limit?: number
  }) => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return (
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)}>
            &larr; Back to Tests
          </Button>
          <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Attendance</h2>
        </div>
        <Button onClick={handleExport} size="sm" variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export Page CSV
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="attended" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Attended
          </TabsTrigger>
          <TabsTrigger value="not-attended" className="gap-2">
            <XCircle className="w-4 h-4" />
            Not Attended
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attended">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex flex-wrap gap-4 w-full">
                <div className="w-full md:w-48">
                  <label className="text-sm font-medium mb-1 block">Search Student</label>
                  <Input
                    placeholder="Search by name, enrollment or register no..."
                    value={attendedSearchTerm}
                    onChange={(e) => setAttendedSearchTerm(e.target.value)}
                  />
                </div>


                <div className="w-full md:w-32">
                  <label className="text-sm font-medium mb-1 block">Dept</label>
                  <Select value={attendedDeptFilter} onValueChange={setAttendedDeptFilter}>
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
                  <Select value={attendedYearFilter} onValueChange={setAttendedYearFilter}>
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
                  <Select value={attendedSectionFilter} onValueChange={setAttendedSectionFilter}>
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
                <Select value={attendedSortConfig} onValueChange={setAttendedSortConfig}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Students Who Attended ({attendedTotal})</CardTitle>
            </CardHeader>
            <CardContent>
              {attendedQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : attendedData.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  No records match your filters.
                </div>
              ) : (
                <>
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
                      {attendedData.map((attempt: Attempt & { student: User }) => (
                        <TableRow key={(attempt as any)._id || attempt.id}>
                          <TableCell
                            className="font-medium cursor-pointer hover:underline text-primary"
                            onClick={() => setSelectedStudent(attempt.student)}
                          >
                            {attempt.student?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>{attempt.student?.enrollmentNumber || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={attempt.score >= 70 ? 'default' : 'secondary'}>
                              {attempt.score}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDurationMs(new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime())}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={attendedPage}
                    setPage={setAttendedPage}
                    total={attendedTotal}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="not-attended">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
              <div className="flex flex-wrap gap-4 w-full">
                <div className="w-full md:w-48">
                  <label className="text-sm font-medium mb-1 block">Search Student</label>
                  <Input
                    placeholder="Search by name, enrollment or register no..."
                    value={notAttendedSearchTerm}
                    onChange={(e) => setNotAttendedSearchTerm(e.target.value)}
                  />
                </div>

                <div className="w-full md:w-32">
                  <label className="text-sm font-medium mb-1 block">Department</label>
                  <Select value={notAttendedDeptFilter} onValueChange={setNotAttendedDeptFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-24">
                  <label className="text-sm font-medium mb-1 block">Year</label>
                  <Select value={notAttendedYearFilter} onValueChange={setNotAttendedYearFilter}>
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
                  <Select value={notAttendedSectionFilter} onValueChange={setNotAttendedSectionFilter}>
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
                <Select value={notAttendedSortConfig} onValueChange={setNotAttendedSortConfig}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
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
              <CardTitle>Students Who Haven't Attended ({notAttendedTotal})</CardTitle>
            </CardHeader>
            <CardContent>
              {notAttendedQuery?.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : notAttendedData.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  No students match your filters.
                </div>
              ) : (
                <>
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
                      {notAttendedData.map((student: User) => (
                        <TableRow key={student.id}>
                          <TableCell
                            className="font-medium cursor-pointer hover:underline text-primary"
                            onClick={() => setSelectedStudent(student)}
                          >
                            {student.name}
                          </TableCell>
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
                  <PaginationControls
                    page={notAttendedPage}
                    setPage={setNotAttendedPage}
                    total={notAttendedTotal}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
};

export default TestAttendanceView;