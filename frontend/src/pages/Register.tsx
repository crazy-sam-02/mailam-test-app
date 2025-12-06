import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { GraduationCap, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ADMIN_KEY = 'MAILAM_ADMIN_2025';

const Register = () => {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [adminKey, setAdminKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    semester: '',
    section: '',
    year: '',
    dept: '',
    enrollmentNumber: '',
    registerNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate admin key if registering as admin
    if (role === 'admin' && adminKey !== ADMIN_KEY) {
      toast.error('Invalid admin key! Please contact administration.');
      setLoading(false);
      return;
    }

    const payload: Record<string, any> = {
      ...formData,
      role,
    };
    // include admin key as `privateKey` so backend can validate the registration key
    if (role === 'admin') payload.privateKey = adminKey;

    const success = await register(payload as any);

    if (success) {
      toast.success('Registration successful');
      navigate('/dashboard');
    } else {
      toast.error('Email already exists');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 animate-gradient-shift bg-[length:200%_200%]" />

      {/* Floating orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative w-full max-w-4xl">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl shadow-primary/10 animate-scale-in">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 mx-auto">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Join the Future of Testing</span>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Register to get started with AI-powered testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={(v) => setRole(v as 'student' | 'admin')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 backdrop-blur-sm bg-white/5">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="admin">Staff/Admin</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-5">
              {role === 'admin' && (
                <div className="space-y-2 p-4 rounded-lg border-2 border-accent/30 bg-accent/5">
                  <Label htmlFor="adminKey">Admin Key *</Label>
                  <Input
                    id="adminKey"
                    type="password"
                    placeholder="Enter admin key"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="backdrop-blur-sm bg-white/5 border-white/20 focus:border-accent transition-all h-11"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Contact administration for the admin key</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="backdrop-blur-sm bg-white/5 border-white/20 focus:border-primary transition-all h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="backdrop-blur-sm bg-white/5 border-white/20 focus:border-primary transition-all h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="backdrop-blur-sm bg-white/5 border-white/20 focus:border-primary transition-all h-11"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dept">Department</Label>
                  <Select
                    value={formData.dept}
                    onValueChange={(value) => setFormData({ ...formData, dept: value })}
                    required
                  >
                    <SelectTrigger className="backdrop-blur-sm bg-white/5 border-white/20 h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/95 border-white/20">
                      {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA'].map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                    required
                  >
                    <SelectTrigger className="backdrop-blur-sm bg-white/5 border-white/20 h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/95 border-white/20">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <SelectItem key={sem} value={String(sem)}>Sem {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
                    required
                  >
                    <SelectTrigger className="backdrop-blur-sm bg-white/5 border-white/20 h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/95 border-white/20">
                      {[1, 2, 3, 4].map(yr => (
                        <SelectItem key={yr} value={String(yr)}>{yr}st Year</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select
                    value={formData.section}
                    onValueChange={(value) => setFormData({ ...formData, section: value })}
                    required
                  >
                    <SelectTrigger className="backdrop-blur-sm bg-white/5 border-white/20 h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/95 border-white/20">
                      {['A', 'B', 'C'].map(sec => (
                        <SelectItem key={sec} value={sec}>Sec {sec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="enrollmentNumber">Enrollment Number</Label>
                    <Input
                      id="enrollmentNumber"
                      placeholder="EN12345678"
                      value={formData.enrollmentNumber}
                      onChange={(e) => setFormData({ ...formData, enrollmentNumber: e.target.value })}
                      className="backdrop-blur-sm bg-white/5 border-white/20 h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerNumber">Register Number</Label>
                    <Input
                      id="registerNumber"
                      placeholder="REG12345678"
                      value={formData.registerNumber}
                      onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value })}
                      className="backdrop-blur-sm bg-white/5 border-white/20 h-11"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all duration-300 text-base font-medium"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;