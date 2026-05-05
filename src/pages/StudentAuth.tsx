import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Eye, EyeOff, Loader2, GraduationCap, ArrowLeft, User, Mail, Lock } from 'lucide-react';

type Mode = 'login' | 'register';

const StudentAuth = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { studentSignIn, studentSignUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const reset = (nextMode: Mode) => {
    setMode(nextMode);
    setName(''); setEmail(''); setPassword(''); setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Error', description: 'Email and password are required.', variant: 'destructive' });
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        toast({ title: 'Error', description: 'Please enter your name.', variant: 'destructive' });
        return;
      }
      if (password.length < 6) {
        toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
        return;
      }
      if (password !== confirm) {
        toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    const result = mode === 'login'
      ? await studentSignIn(email, password)
      : await studentSignUp(name, email, password);
    setLoading(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: mode === 'login' ? 'Welcome back!' : 'Account created!', description: 'Redirecting to tests…' });
    navigate('/mock-tests');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col">
      {/* Top bar */}
      <div className="p-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Air<span className="text-primary">Book</span>
            </h1>
            <p className="text-muted-foreground text-sm">Student Portal</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1">
            <button
              onClick={() => reset('login')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => reset('register')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Piyush Sharma" className="pl-9" autoFocus
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" className="pl-9"
                      autoFocus={mode === 'login'}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password" type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm" type={showPw ? 'text' : 'password'}
                        value={confirm} onChange={e => setConfirm(e.target.value)}
                        placeholder="Re-enter password" className="pl-9"
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Please wait…</>
                    : mode === 'login'
                      ? <><GraduationCap className="h-4 w-4 mr-2" /> Sign In</>
                      : <><User className="h-4 w-4 mr-2" /> Create Account</>
                  }
                </Button>

                {mode === 'login' && (
                  <p className="text-center text-xs text-muted-foreground">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => reset('register')} className="text-primary font-semibold hover:underline">
                      Sign up free
                    </button>
                  </p>
                )}
                {mode === 'register' && (
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" onClick={() => reset('login')} className="text-primary font-semibold hover:underline">
                      Sign in
                    </button>
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Your account is stored securely. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentAuth;
