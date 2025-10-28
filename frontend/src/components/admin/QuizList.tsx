import { Test } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QuizListProps {
  tests: Test[];
  onUpdate: () => void;
}

const QuizList = ({ tests }: QuizListProps) => {
  const handleShareTest = (testId: string) => {
    const shareUrl = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Test link copied to clipboard!');
  };

  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No tests created yet. Click "Create New Test" to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tests.map((test) => (
        <Card key={test.id} className="hover:shadow-lg transition-shadow backdrop-blur-xl bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{test.title}</CardTitle>
                <CardDescription className="mt-1">{test.description}</CardDescription>
              </div>
              <Badge variant="secondary">{test.questions.length} Q</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{test.durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Sem {test.assignedTo.semester}</span>
                </div>
                {test.assignedTo.department && (
                  <Badge variant="outline" className="text-xs">
                    {test.assignedTo.department}
                  </Badge>
                )}
              </div>
              <Button
                onClick={() => handleShareTest(test.id)}
                variant="outline"
                size="sm"
                className="w-full backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Test Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuizList;
