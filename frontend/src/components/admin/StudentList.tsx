import { useState } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiGetStudent } from '@/lib/api';

interface StudentListProps {
  students: User[];
}

const StudentList = ({ students }: StudentListProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const groupedStudents = students.reduce((acc, student) => {
    const key = `${student.dept} - ${student.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(student);
    return acc;
  }, {} as Record<string, User[]>);

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No students found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {Object.entries(groupedStudents).map(([group, studentsInGroup]) => (
        <Card key={group} className="mb-4">
          <CardHeader>
            <CardTitle>{group} ({studentsInGroup.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrollment No.</TableHead>
                  <TableHead>Register No.</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Section</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsInGroup.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium cursor-pointer text-primary underline" onClick={async () => {
                      setLoading(true);
                      try {
                        const resp = await apiGetStudent(student.id);
                        const s = resp?.student;
                        if (s) {
                          setSelected({
                            id: String(s.id),
                            name: s.name,
                            email: s.email,
                            role: s.role || 'student',
                            semester: s.semester || '',
                            section: s.section || '',
                            year: s.year || '',
                            dept: s.dept || '',
                            enrollmentNumber: s.enrollmentNumber || '',
                            registerNumber: s.registerNumber || '',
                          });
                          setOpen(true);
                        }
                      } catch (e) {
                        console.error('Failed to load student', e);
                      } finally {
                        setLoading(false);
                      }
                    }}>{student.name}</TableCell>
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
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              {loading ? 'Loading...' : ''}
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardContent>
              {selected ? (
                <div className="space-y-2">
                  <div><strong>Name:</strong> {selected.name}</div>
                  <div><strong>Email:</strong> {selected.email}</div>
                  <div><strong>Department:</strong> {selected.dept}</div>
                  <div><strong>Semester:</strong> {selected.semester}</div>
                  <div><strong>Year:</strong> {selected.year}</div>
                  <div><strong>Section:</strong> {selected.section}</div>
                  <div><strong>Enrollment No.:</strong> {selected.enrollmentNumber || 'N/A'}</div>
                  <div><strong>Register No.:</strong> {selected.registerNumber || 'N/A'}</div>
                </div>
              ) : (
                <div>No student selected.</div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentList;
