import React, { useEffect, useState } from 'react';
import { listQuizzes, getQuizHtml, getStudentAttempts, type QuizMeta, type QuizAttempt } from '@/lib/telegram';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen, Clock, Search, Play, Award, Loader2, LogOut,
  User, BarChart2, CheckCircle2, XCircle, Minus, ArrowRight,
  Trophy, Calendar, TrendingUp, GraduationCap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'tests' | 'profile';

const MockTests = () => {
  const { student, studentSignOut } = useAuth();
  const [tests, setTests] = useState<QuizMeta[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [launching, setLaunching] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('tests');
  const [filterDiff, setFilterDiff] = useState<string>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!student) { navigate('/student-auth'); return; }
    fetchAll();
  }, [student]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [data, ats] = await Promise.all([
        listQuizzes(),
        getStudentAttempts(student!.id),
      ]);
      setTests(data);
      setAttempts(ats);
    } catch (err) {
      toast({ title: 'Error', description: 'Could not load tests from Telegram.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const launchQuiz = async (quiz: QuizMeta) => {
    setLaunching(quiz.id);
    try {
      const html = await getQuizHtml(quiz.file_id);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast({ title: 'Error', description: 'Failed to load quiz.', variant: 'destructive' });
    } finally {
      setLaunching(null);
    }
  };

  const handleSignOut = () => {
    studentSignOut();
    navigate('/');
  };

  const filtered = tests.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDiff = filterDiff === 'all' || t.difficulty === filterDiff;
    return matchSearch && matchDiff;
  });

  // Stats
  const totalAttempted = attempts.length;
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + (a.score / a.total_marks) * 100, 0) / attempts.length)
    : 0;
  const bestScore = attempts.length
    ? Math.max(...attempts.map(a => Math.round((a.score / a.total_marks) * 100)))
    : 0;

  const attemptedIds = new Set(attempts.map(a => a.quiz_id));

  const diffBadge = (d?: string) => {
    if (!d) return null;
    const colors: Record<string, string> = {
      Easy: 'bg-green-100 text-green-700',
      Medium: 'bg-amber-100 text-amber-700',
      Hard: 'bg-red-100 text-red-700',
    };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[d] || ''}`}>{d}</span>;
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">Air<span className="text-primary">Book</span></span>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('tests')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'tests' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Tests
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'profile' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              <User className="h-3.5 w-3.5" /> Profile
            </button>
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: student.avatar_color }}
            >
              {student.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium hidden sm:block">{student.name.split(' ')[0]}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* ── Tests Tab ── */}
      {activeTab === 'tests' && (
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">

          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">Welcome back, {student.name.split(' ')[0]}! 👋</h2>
                <p className="text-white/80 text-sm">
                  {tests.length} tests available · {totalAttempted} attempted · {avgScore}% avg score
                </p>
              </div>
              <div className="flex gap-3">
                <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold">{totalAttempted}</div>
                  <div className="text-white/70 text-xs">Attempted</div>
                </div>
                <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold">{bestScore}%</div>
                  <div className="text-white/70 text-xs">Best Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-white"
                placeholder="Search tests..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['all', 'Easy', 'Medium', 'Hard'].map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDiff(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    filterDiff === d
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-muted-foreground border-border hover:border-primary'
                  }`}
                >
                  {d === 'all' ? 'All' : d}
                </button>
              ))}
            </div>
          </div>

          {/* Tests grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading from Telegram…</span>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {searchTerm || filterDiff !== 'all' ? 'No matching tests' : 'No tests available yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterDiff !== 'all' ? 'Try a different filter.' : 'Ask your admin to upload quizzes.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(test => {
                const done = attemptedIds.has(test.id);
                const att = attempts.find(a => a.quiz_id === test.id);
                return (
                  <Card key={test.id} className={`group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${done ? 'border-green-200' : ''}`}>
                    {/* Color strip */}
                    <div className={`h-1.5 ${done ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-primary to-primary/60'}`} />
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2">
                          {test.title}
                        </CardTitle>
                        {done && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />}
                      </div>
                      {test.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{test.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {test.question_count} Qs
                        </span>
                        {test.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {test.duration_minutes}m
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        {diffBadge(test.difficulty)}
                        {att && (
                          <span className="text-xs text-green-600 font-semibold">
                            Score: {Math.round((att.score / att.total_marks) * 100)}%
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => launchQuiz(test)}
                        disabled={launching === test.id}
                        className="w-full gap-1.5 mt-1"
                        variant={done ? 'outline' : 'default'}
                      >
                        {launching === test.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : done
                            ? <><ArrowRight className="h-3.5 w-3.5" /> Reattempt</>
                            : <><Play className="h-3.5 w-3.5" /> Start Test</>
                        }
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">

          {/* Profile card */}
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary to-primary/70" />
            <CardContent className="pt-0">
              <div className="-mt-10 mb-4 flex items-end gap-4">
                <div
                  className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                  style={{ background: student.avatar_color }}
                >
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="pb-2">
                  <h2 className="text-xl font-bold">{student.name}</h2>
                  <p className="text-muted-foreground text-sm">{student.email}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Joined {formatDistanceToNow(new Date(student.created_at), { addSuffix: true })}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center p-4">
              <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{totalAttempted}</div>
              <div className="text-xs text-muted-foreground">Tests Taken</div>
            </Card>
            <Card className="text-center p-4">
              <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{avgScore}%</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </Card>
            <Card className="text-center p-4">
              <Award className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{bestScore}%</div>
              <div className="text-xs text-muted-foreground">Best Score</div>
            </Card>
          </div>

          {/* Attempt history */}
          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" /> Test History
            </h3>
            {attempts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No attempts yet. Start a test to see your history here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {attempts.map(a => {
                  const pct = Math.round((a.score / a.total_marks) * 100);
                  const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500';
                  return (
                    <Card key={a.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{a.quiz_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(a.attempted_at), { addSuffix: true })}
                              {a.time_taken_seconds > 0 && ` · ${Math.round(a.time_taken_seconds / 60)}m taken`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs flex-shrink-0">
                            <span className="flex items-center gap-0.5 text-green-600">
                              <CheckCircle2 className="h-3 w-3" /> {a.correct}
                            </span>
                            <span className="flex items-center gap-0.5 text-red-500">
                              <XCircle className="h-3 w-3" /> {a.wrong}
                            </span>
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <Minus className="h-3 w-3" /> {a.skipped}
                            </span>
                            <span className={`font-bold text-base ${color}`}>{pct}%</span>
                          </div>
                        </div>
                        {/* Score bar */}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
};

export default MockTests;
