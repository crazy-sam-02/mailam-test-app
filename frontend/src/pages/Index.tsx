import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Users, FileText, Sparkles, Upload, Brain } from 'lucide-react';
import collegeLogo from '@/assets/college-logo.png';
import collegeHeader from '@/assets/college-header.webp';
import collegeBuilding from '@/assets/college-building.jpg';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* College building background */}
      <div className="fixed inset-0">
        <img 
          src={collegeBuilding} 
          alt="Mailam Engineering College" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-background/80 to-accent/60 backdrop-blur-sm" />
      </div>
      
      {/* Floating particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Glassmorphism navbar with college header */}
      <nav className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={collegeLogo} 
                alt="Mailam Engineering College Logo" 
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
              <h2 className="flex items-center justify-between text-2xl md:text-2xl font-bold tracking-tight"> <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]"> MAILAM ENGINEERING COLLEGE </span></h2>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <main className="relative container mx-auto px-6 py-20">
        <div className="text-center space-y-8 mb-24 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">AI-Powered Testing Platform</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
            <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
              Revolutionize College Testing
            </span>
            <span className="block text-foreground mt-3 drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]">
              with AI Precision
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Empower learning with intelligent assessments, seamless evaluation, and modern anti-cheating technology.
          </p>
          
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-2xl shadow-primary/40 text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
            >
              <Users className="w-5 h-5 mr-2" />
              Login as Student
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/register')}
              className="backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10 text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
            >
              <Shield className="w-5 h-5 mr-2" />
              Login as Staff
            </Button>
          </div>

          {/* Animated illustration placeholder */}
          <div className="relative w-full max-w-4xl mx-auto mt-16 h-96">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 rounded-3xl backdrop-blur-3xl border border-white/10 animate-scale-in" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Brain className="w-32 h-32 text-primary/50 animate-float" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: Upload,
              title: 'AI Question Extraction',
              description: 'Upload any document; AI cleans and formats your quiz instantly.',
              gradient: 'from-violet-500/10 to-purple-500/10',
              iconColor: 'text-violet-400',
            },
            {
              icon: Brain,
              title: 'Smart Dashboard',
              description: 'Personalized tests, performance analytics, and result summaries.',
              gradient: 'from-blue-500/10 to-cyan-500/10',
              iconColor: 'text-cyan-400',
            },
            {
              icon: Shield,
              title: 'Anti-Cheat Protection',
              description: 'Full-screen mode, tab tracking, and intelligent behavior analysis.',
              gradient: 'from-emerald-500/10 to-green-500/10',
              iconColor: 'text-emerald-400',
            },
            {
              icon: FileText,
              title: 'Instant Reports',
              description: 'View student performance and question analytics visually.',
              gradient: 'from-orange-500/10 to-amber-500/10',
              iconColor: 'text-amber-400',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* About section */}
        <div className="max-w-4xl mx-auto mt-32 text-center space-y-6 animate-fade-up">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Why Choose AI-Powered Testing?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Our platform transforms college assessments with intelligent automation, futuristic design, 
            and fairness-driven testing. Experience the future of education technology.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 backdrop-blur-xl bg-white/5 mt-32">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <img 
                  src={collegeLogo} 
                  alt="Mailam Engineering College" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold">Mailam Engineering College</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered testing platform for modern education
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Quick Links</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-foreground cursor-pointer transition-colors">About</div>
                <div className="hover:text-foreground cursor-pointer transition-colors">Contact</div>
                <div className="hover:text-foreground cursor-pointer transition-colors">Privacy</div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Connect</h3>
              <div className="flex gap-4 justify-center md:justify-start">
                {['LinkedIn', 'GitHub', 'Email'].map((social) => (
                  <div
                    key={social}
                    className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 cursor-pointer"
                  >
                    <span className="text-xs">{social[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
            <p>© 2025 TestHub. Powered by AI • Built with passion</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
