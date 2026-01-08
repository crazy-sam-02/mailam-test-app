import { useState, useEffect } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiGetStudents, apiGetStudent } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StudentList = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Fetch from backend
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const resp = await apiGetStudents({
          dept: deptFilter,
          year: yearFilter,
          section: sectionFilter,
          limit: 1000 // reasonable limit
        });
        setStudents(resp.students || []);
      } catch (e) {
        console.error("Failed to fetch students", e);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [deptFilter, yearFilter, sectionFilter]);

  // Standard options (could be dynamic, but static for now is fine)
  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA'];
  const years = ['1', '2', '3', '4'];
  const sections = ['A', 'B', 'C', 'D'];

  // Client-side search on the fetched results
  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return student.name.toLowerCase().includes(searchLower) ||
      (student.enrollmentNumber || '').toLowerCase().includes(searchLower) ||
      (student.registerNumber || '').toLowerCase().includes(searchLower);
  });

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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
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
              Details fetched from database
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
