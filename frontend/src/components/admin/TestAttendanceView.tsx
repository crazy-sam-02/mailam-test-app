import { Attempt, Test, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestAttendanceViewProps {
  attempts: Attempt[];
  tests: Test[];
  students: User[];
}

const TestAttendanceView = ({ attempts, tests, students }: TestAttendanceViewProps) => {
  const getTestName = (testId: string) => tests.find(t => t.id === testId)?.title || 'Unknown';
  
  // Get students who attended (have attempts)
  const studentIdsWithAttempts = new Set(attempts.map(a => a.studentId));
  const attendedStudents = students.filter(s => studentIdsWithAttempts.has(s.id));
  const notAttendedStudents = students.filter(s => !studentIdsWithAttempts.has(s.id));

  // Map attempts to students
  const studentAttempts = attendedStudents.map(student => {
    const studentAttemptsList = attempts.filter(a => a.studentId === student.id);
    return {
      student,
      attempts: studentAttemptsList
    };
  });

  return (
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
            <CardTitle>Students Who Attended Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {studentAttempts.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No students have attended any tests yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Enrollment No.</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Malpractice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentAttempts.flatMap(({ student, attempts: studentAttemptsList }) =>
                    studentAttemptsList.map((attempt) => {
                      const suspiciousCount = attempt.suspiciousEvents?.length || 0;
                      return (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.enrollmentNumber || 'N/A'}</TableCell>
                          <TableCell>{getTestName(attempt.testId)}</TableCell>
                          <TableCell>
                            <Badge variant={attempt.score >= 70 ? 'default' : 'secondary'}>
                              {attempt.score}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {Math.round((new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000)} min
                          </TableCell>
                          <TableCell>
                            {suspiciousCount > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Malpractice ({suspiciousCount})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Clean
                              </Badge>
                            )}
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
            <CardTitle>Students Who Haven't Attended Any Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {notAttendedStudents.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                All students have attended at least one test.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrollment No.</TableHead>
                    <TableHead>Register No.</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notAttendedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.enrollmentNumber || 'N/A'}</TableCell>
                      <TableCell>{student.registerNumber || 'N/A'}</TableCell>
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
  );
};

export default TestAttendanceView;
