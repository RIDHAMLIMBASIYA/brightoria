import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Brain, Users, BookOpen, ArrowRight, CheckCircle, Play } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">LearnHub</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="hero">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="accent" className="mb-6 animate-fade-in">🚀 AI-Powered Learning Platform</Badge>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl mx-auto leading-tight animate-slide-up">
            Learn Smarter with <span className="text-gradient">AI-Powered</span> Education
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 animate-slide-up stagger-1">
            The modern learning management system with AI tutoring, interactive quizzes, and personalized learning paths.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-slide-up stagger-2">
            <Link to="/register">
              <Button variant="hero" size="xl" className="gap-2">
                Start Learning Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="outline" size="xl" className="gap-2">
              <Play className="w-5 h-5" /> Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16 animate-fade-in stagger-3">
            <div>
              <p className="text-3xl md:text-4xl font-display font-bold text-primary">50K+</p>
              <p className="text-muted-foreground text-sm">Active Students</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-display font-bold text-primary">200+</p>
              <p className="text-muted-foreground text-sm">Quality Courses</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-display font-bold text-primary">95%</p>
              <p className="text-muted-foreground text-sm">Success Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            Everything You Need to Learn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI Tutor', desc: 'Get personalized explanations and practice questions 24/7' },
              { icon: BookOpen, title: 'Rich Content', desc: 'Access videos, notes, quizzes, and assignments in one place' },
              { icon: Users, title: 'Collaborative', desc: 'Connect with teachers and peers for better learning' },
            ].map((feature, i) => (
              <div key={i} className={`bg-card rounded-xl border border-border p-6 hover-lift animate-slide-up stagger-${i + 1}`}>
                <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="hero-gradient rounded-2xl p-10 md:p-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Join thousands of students already learning with AI-powered education.
            </p>
            <Link to="/register">
              <Button variant="secondary" size="xl" className="gap-2">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold">LearnHub</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 LearnHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
