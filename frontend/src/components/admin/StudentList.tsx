import { useState, useMemo } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiGetStudent } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StudentListProps {
  students: User[];
}

const StudentList = ({ students }: StudentListProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Derive unique options for filters, merging with standards
  const departments = useMemo(() => {
    const existing = new Set(students.map(s => s.dept || 'Unknown'));
    const standard = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
    standard.forEach(d => existing.add(d));
    existing.delete('Unknown'); // Remove 'Unknown' if valid opts exist
    if (existing.size === 0) existing.add('Unknown');
    return Array.from(existing).sort();
  }, [students]);

  const years = useMemo(() => {
    const existing = new Set(students.map(s => s.year || 'Unknown'));
    const standard = ['1', '2', '3', '4'];
    standard.forEach(y => existing.add(y));
    existing.delete('Unknown');
    if (existing.size === 0) existing.add('Unknown');
    return Array.from(existing).sort();
  }, [students]);

  const sections = useMemo(() => {
    const existing = new Set(students.map(s => s.section || 'Unknown'));
    const standard = ['A', 'B', 'C', 'D'];
    standard.forEach(s => existing.add(s));
    existing.delete('Unknown');
    if (existing.size === 0) existing.add('Unknown');
    return Array.from(existing).sort();
  }, [students]);

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // 1. Search (Name or Enrollment)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = student.name.toLowerCase().includes(searchLower) ||
        (student.enrollmentNumber || '').toLowerCase().includes(searchLower) ||
        (student.registerNumber || '').toLowerCase().includes(searchLower);

      // 2. Department Filter
      const matchesDept = deptFilter === 'ALL' || student.dept === deptFilter;

      // 3. Year Filter
      const matchesYear = yearFilter === 'ALL' || student.year === yearFilter;

      // 4. Section Filter
      const matchesSection = sectionFilter === 'ALL' || student.section === sectionFilter;

      return matchesSearch && matchesDept && matchesYear && matchesSection;
    });
  }, [students, searchTerm, deptFilter, yearFilter, sectionFilter]);


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Students Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by name, enrollment or register no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sections</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Enrollment No.</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Section</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No students found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell
                        className="font-medium cursor-pointer text-primary underline"
                        onClick={async () => {
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
                        }}
                      >
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.dept}</TableCell>
                      <TableCell>{student.year}</TableCell>
                      <TableCell>{student.enrollmentNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Semester {student.semester}</Badge>
                      </TableCell>
                      <TableCell>{student.section}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              {loading ? 'Loading...' : ''}
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardContent className='pt-6'>
              {selected ? (
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Name:</strong> {selected.name}</div>
                  <div><strong>Email:</strong> {selected.email}</div>
                  <div><strong>Department:</strong> {selected.dept}</div>
                  <div><strong>Year:</strong> {selected.year}</div>
                  <div><strong>Semester:</strong> {selected.semester}</div>
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
