import { Test } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface QuizListProps {
  tests: Test[];
  onUpdate: () => void;
}

const QuizList = ({ tests, onUpdate }: QuizListProps) => {
  const handleShareTest = (testId: string) => {
    const shareUrl = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Test link copied to clipboard!');
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      const API_BASE = 'http://localhost:4000/api';
      const resp = await fetch(`${API_BASE}/tests/${testId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to delete test');
      toast.success('Test deleted successfully');
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete test');
    }
  }

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
                {test.assignedTo.departments && test.assignedTo.departments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {test.assignedTo.departments.length > 1 ? 'Multiple' : test.assignedTo.departments[0]}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleShareTest(test.id)}
                  variant="outline"
                  size="sm"
                  className="w-full backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-2 backdrop-blur-sm bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the test and all associated attempts.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuizList;