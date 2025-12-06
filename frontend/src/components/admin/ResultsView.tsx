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

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const ResultsView = ({ attempts, tests, students }: ResultsViewProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

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
  const filteredAttempts = attempts.filter(a => a.testId === selectedTestId);
  const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name || 'Unknown';

  if (filteredAttempts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)}>
            &larr; Back to Tests
          </Button>
          <h2 className="text-xl font-bold">{selectedTest?.title || 'Unknown Test'} - Results</h2>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No attempts recorded for this test yet.
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

      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
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
              {filteredAttempts
                .sort((a, b) => {
                  if (b.score !== a.score) {
                    return b.score - a.score; // Rank by Score (Highest First)
                  }
                  // If tie, rank by time taken (Lowest First)
                  const timeA = new Date(a.submittedAt || 0).getTime() - new Date(a.startedAt).getTime();
                  const timeB = new Date(b.submittedAt || 0).getTime() - new Date(b.startedAt).getTime();
                  return timeA - timeB;
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
            </TableBody>
          </Table>
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
