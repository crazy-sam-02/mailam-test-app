import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Users, FileText, Sparkles, Upload, Brain, Mail, Phone, MapPin } from 'lucide-react';
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
          className="w-full h-full object-cover md:object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-background/80 to-accent/60 backdrop-blur-sm" />
      </div>

      {/* Floating particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <div className="absolute top-1/4 left-1/4 w-40 h-40 md:w-64 md:h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 md:w-96 md:h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 md:w-72 md:h-72 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Modern Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-2xl bg-background/80">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 sm:gap-3 h-16 sm:h-20">
            {/* Logo Section */}
            <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => navigate('/')}> 
              <div className="relative">
                <img
                  src="logo.png"
                  alt="Prionex"
                  className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                  MAILAM ENGINEERING COLLEGE
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground tracking-wider">POWERED BY PRIONEX</span>
              </div>
            </div>


            {/* CTA Buttons */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3 ml-auto">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-muted-foreground hover:text-foreground hover:bg-white/5 px-3 sm:px-4 py-2"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 px-3 sm:px-4 py-2"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 sm:h-20" />

      {/* Hero section */}
      <main className="relative container mx-auto px-6 py-20">
        <div className="text-center space-y-6 sm:space-y-8 mb-16 sm:mb-24 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">POWERED BY PRIONEX </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
              Revolutionize College Testing
            </span>
            <span className="block text-foreground mt-2 md:mt-3 drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]">
              with AI Precision
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl sm:max-w-3xl mx-auto leading-relaxed px-2">
            Empower learning with intelligent assessments, seamless evaluation, and modern anti-cheating technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <Button
              size="default"
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-2xl shadow-primary/40 text-base sm:text-lg px-5 sm:px-8 py-4 sm:py-6 hover:scale-105 transition-all duration-300"
            >
              <Users className="w-5 h-5 mr-2" />
              Login as Student
            </Button>
            <Button
              size="default"
              variant="outline"
              onClick={() => navigate('/login')}
              className="backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10 text-base sm:text-lg px-5 sm:px-8 py-4 sm:py-6 hover:scale-105 transition-all duration-300"
            >
              <Shield className="w-5 h-5 mr-2" />
              Login as Staff
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div id="features" className="scroll-mt-20"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto px-2">
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
              className="group relative p-4 sm:p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* About section */}
        <div className="max-w-4xl mx-auto mt-20 sm:mt-32 text-center space-y-4 sm:space-y-6 animate-fade-up px-3">
          <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Why Choose AI-Powered Testing?
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed">
            Our platform transforms college assessments with intelligent automation, futuristic design,
            and fairness-driven testing. Experience the future of education technology.
          </p>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="relative border-t border-white/10 backdrop-blur-xl bg-background/50 mt-20 sm:mt-32">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            {/* Brand Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img
                  src={"logo.png"}
                  alt="Prionex"
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    MAILAM ENGINEERING COLLEGE
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Powered By Prionex</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Transforming education with AI-powered testing solutions. Secure, intelligent, and built for the future.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <a
                  href="https://www.linkedin.com/in/prionex-undefined-340201395/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 hover:scale-110 transition-all duration-300 group"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/prionex2025-hue"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 hover:scale-110 transition-all duration-300 group"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/prionex_global?igsh=anM0Y2ZneHJyMWd3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 hover:scale-110 transition-all duration-300 group"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div className="space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">Product</h3>
              <ul className="space-y-3">
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Features
                  </a>
                </li>
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Security
                  </a>
                </li>
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Updates
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    About Us
                  </a>
                </li>
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Careers
                  </a>
                </li>
                <li>
                  <a href="https://prionex.dev/blog" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Blog
                  </a>
                </li>
                <li>
                  <a href="https://prionex.dev/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">Get in Touch</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mt-0.5 text-primary" />
                  <a href="mailto:prionex2025@gmail.com" className="hover:text-foreground transition-colors">
                    prionex2025@gmail.com
                  </a>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mt-0.5 text-primary" />
                  <span>+91 phone number</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                  <span>Mailam,<br />Villupuram District,<br />Tamil Nadu, India</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 sm:pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                © 2025 Prionex. All rights reserved.
              </p>
              <div className="flex gap-4 sm:gap-6 text-[10px] sm:text-xs text-muted-foreground">
                <a href="https://prionex.dev/" className="hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="https://prionex.dev/" className="hover:text-foreground transition-colors">Terms of Service</a>
                <a href="https://prionex.dev/" className="hover:text-foreground transition-colors">Cookie Policy</a>
              </div>
            </div>
            <p className="text-center md:text-left text-[10px] sm:text-xs text-muted-foreground/60 mt-3 sm:mt-4">
              Designed & Developed with ❤️ by <span className="text-primary font-medium">Prionex Team</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
