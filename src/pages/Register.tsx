import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from 'lucide-react';
import brightoriaLogo from '@/assets/brightoria-logo.png';
import { toast } from 'sonner';
import { validatePassword } from '@/lib/password';
import { z } from 'zod';

type UserRole = 'student' | 'teacher' | 'admin';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Student fields
  const [schoolCollege, setSchoolCollege] = useState('');
  const [strongSubject, setStrongSubject] = useState('');
  const [weakSubject, setWeakSubject] = useState('');
  const [hobbies, setHobbies] = useState('');

  // Teacher fields
  const [university, setUniversity] = useState('');
  const [subject, setSubject] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [qualification, setQualification] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneSchema = z
      .string()
      .trim()
      .min(7, 'Please enter a valid phone/WhatsApp number')
      .max(20, 'Phone number is too long')
      .regex(/^[+()\-\s\d]+$/, 'Phone number can only contain digits and + ( ) -');

    const baseSchema = z.object({
      name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
      email: z.string().trim().email('Please enter a valid email').max(255, 'Email is too long'),
      phone: phoneSchema,
    });

    const studentSchema = baseSchema.extend({
      schoolCollege: z.string().trim().min(1, 'School/College is required').max(150, 'School/College is too long'),
      strongSubject: z.string().trim().max(80, 'Strong subject is too long').optional().or(z.literal('')),
      weakSubject: z.string().trim().max(80, 'Weak subject is too long').optional().or(z.literal('')),
      hobbies: z.string().trim().max(200, 'Hobbies is too long').optional().or(z.literal('')),
    });

    const teacherSchema = baseSchema.extend({
      university: z.string().trim().min(1, 'University is required').max(150, 'University is too long'),
      subject: z.string().trim().max(100, 'Subject is too long').optional().or(z.literal('')),
      experienceYears: z
        .string()
        .trim()
        .optional()
        .or(z.literal(''))
        .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 60), {
          message: 'Experience must be a number between 0 and 60',
        }),
      qualification: z.string().trim().max(120, 'Qualification is too long').optional().or(z.literal('')),
    });

    const parsed = (role === 'teacher' ? teacherSchema : studentSchema).safeParse({
      name,
      email,
      phone,
      schoolCollege,
      strongSubject,
      weakSubject,
      hobbies,
      university,
      subject,
      experienceYears,
      qualification,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Please check the form fields');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password, { email });
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const hobbiesArray = hobbies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);

      await register(name, email, password, role, {
        phone: phone.trim(),
        ...(role === 'student'
          ? {
              schoolCollege: schoolCollege.trim(),
              strongSubject: strongSubject.trim() || undefined,
              weakSubject: weakSubject.trim() || undefined,
              hobbies: hobbiesArray.length ? hobbiesArray : undefined,
            }
          : {
              university: university.trim(),
              subject: subject.trim() || undefined,
              experienceYears: experienceYears.trim() ? Number(experienceYears.trim()) : undefined,
              qualification: qualification.trim() || undefined,
            }),
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mb-8 animate-fade-in">
            <img
              src={brightoriaLogo}
              alt="Brightoria logo"
              className="w-12 h-12 object-contain"
              loading="eager"
            />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4 animate-slide-up">
            Join Brightoria
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md animate-slide-up stagger-1">
            Start your learning journey with AI-powered education
          </p>
          
          <div className="mt-12 space-y-4 text-left max-w-sm animate-fade-in stagger-2">
            <div className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-xl">🎓</span>
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Learn from experts</p>
                <p className="text-sm text-primary-foreground/70">Access quality courses</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <p className="font-medium text-primary-foreground">AI-powered tutoring</p>
                <p className="text-sm text-primary-foreground/70">Get instant help 24/7</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Track your progress</p>
                <p className="text-sm text-primary-foreground/70">Detailed analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center">
              <img
                src={brightoriaLogo}
                alt="Brightoria logo"
                className="w-8 h-8 object-contain"
                loading="eager"
              />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Brightoria</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Create account</h2>
            <p className="text-muted-foreground mt-2">Join thousands of learners today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone / WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>I want to join as</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === 'student'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl block mb-1">🎓</span>
                  <span className="font-medium text-sm">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === 'teacher'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl block mb-1">👨‍🏫</span>
                  <span className="font-medium text-sm">Teacher</span>
                </button>
              </div>
            </div>

            {role === 'student' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="schoolCollege">School / College</Label>
                  <Input
                    id="schoolCollege"
                    type="text"
                    placeholder="Your school/college name"
                    value={schoolCollege}
                    onChange={(e) => setSchoolCollege(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="strongSubject">Strong subject</Label>
                    <Input
                      id="strongSubject"
                      type="text"
                      placeholder="e.g., Maths"
                      value={strongSubject}
                      onChange={(e) => setStrongSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weakSubject">Weak subject</Label>
                    <Input
                      id="weakSubject"
                      type="text"
                      placeholder="e.g., Physics"
                      value={weakSubject}
                      onChange={(e) => setWeakSubject(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hobbies">Hobbies (comma-separated)</Label>
                  <Input
                    id="hobbies"
                    type="text"
                    placeholder="Reading, Cricket, Music"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Example: Reading, Cricket, Music</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    type="text"
                    placeholder="Your university name"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    type="text"
                    placeholder="e.g., Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">Experience (years)</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min={0}
                      max={60}
                      placeholder="e.g., 3"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input
                      id="qualification"
                      type="text"
                      placeholder="e.g., M.Sc, B.Ed"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={12}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
