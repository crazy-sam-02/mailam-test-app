import { Attempt, Test, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface ResultsViewProps {
  attempts: Attempt[];
  tests: Test[];
  students: User[];
}

const ResultsView = ({ attempts, tests, students }: ResultsViewProps) => {
  if (attempts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No test attempts yet.
        </CardContent>
      </Card>
    );
  }

  const getTestName = (testId: string) => tests.find(t => t.id === testId)?.title || 'Unknown';
  const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name || 'Unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Questions Correct</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Malpractice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((attempt) => {
              const suspiciousCount = attempt.suspiciousEvents?.length || 0;
              return (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">{getStudentName(attempt.studentId)}</TableCell>
                  <TableCell>{getTestName(attempt.testId)}</TableCell>
                  <TableCell>
                    <Badge variant={attempt.score >= 70 ? 'default' : 'secondary'}>
                      {attempt.score}
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
                      <Badge variant="outline">Clean</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ResultsView;
