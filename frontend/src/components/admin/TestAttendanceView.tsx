import { useState } from 'react';
import { Attempt, Test, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDurationMs } from '@/lib/utils';

interface TestAttendanceViewProps {
  attempts: Attempt[];
  tests: Test[];
  students: User[];
}

const TestAttendanceView = ({ attempts, tests, students }: TestAttendanceViewProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

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
                    <span>{distinctStudents-1} Students Attended</span>
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

  const selectedTest = tests.find(t => t.id === selectedTestId);
  // Filter attempts for this test
  const filteredAttempts = attempts.filter(a => a.testId === selectedTestId);

  // Get students who attended (have attempts for THIS test)
  const studentIdsWithAttempts = new Set(filteredAttempts.map(a => a.studentId));
  const attendedStudents = students.filter(s => studentIdsWithAttempts.has(s.id));

  // Filter students who are eligible for this test but haven't attended
  const notAttendedStudents = students.filter(s => {
    if (studentIdsWithAttempts.has(s.id)) return false; // Already attended

    if (!selectedTest?.assignedTo) return false;

    // Check Department Match
    const assignedDepts = selectedTest.assignedTo.departments || [];
    const studentDept = s.dept || '';
    const deptMatch = assignedDepts.length === 0 || assignedDepts.some(d => d.toLowerCase() === studentDept.toLowerCase());

    // Check Semester Match
    const assignedSems = selectedTest.assignedTo.semester || [];
    // Handle both string and array for Semester (backup compatibility)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)}>
          &larr; Back to Tests
        </Button>
        <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Attendance</h2>
      </div>

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
                    {studentAttempts.flatMap(({ student, attempts: studentAttemptsList }) =>
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
                    {notAttendedStudents.map((student) => (
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
    </div>
  );
};

export default TestAttendanceView;