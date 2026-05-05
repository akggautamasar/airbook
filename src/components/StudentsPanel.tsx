import React, { useEffect, useState } from 'react';
import { getAllStudents, getAllAttempts, type StudentAccount, type QuizAttempt } from '@/lib/telegram';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Loader2, Trophy, BarChart2, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StudentRow extends StudentAccount {
  attempts: number;
  avgScore: number;
  bestScore: number;
}

export const StudentsPanel: React.FC = () => {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [students, attempts] = await Promise.all([getAllStudents(), getAllAttempts()]);
      const mapped: StudentRow[] = students.map(s => {
        const sa = attempts.filter(a => a.student_id === s.id);
        const scores = sa.map(a => (a.score / a.total_marks) * 100);
        return {
          ...s,
          attempts: sa.length,
          avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
          bestScore: scores.length ? Math.round(Math.max(...scores)) : 0,
        };
      });
      setRows(mapped.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter(
    r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading students…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{rows.length}</div>
            <div className="text-xs text-muted-foreground">Total Students</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{rows.reduce((s, r) => s + r.attempts, 0)}</div>
            <div className="text-xs text-muted-foreground">Total Attempts</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {rows.length ? Math.round(rows.reduce((s, r) => s + r.avgScore, 0) / rows.length) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">Platform Avg</div>
          </div>
        </Card>
      </div>

      {/* Search + refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{search ? 'No students match your search.' : 'No students have registered yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Joined</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Attempts</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Avg Score</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Best</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{ background: s.avatar_color }}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{s.attempts}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${s.avgScore >= 70 ? 'text-green-600' : s.avgScore >= 40 ? 'text-amber-600' : s.avgScore === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
                        {s.attempts > 0 ? `${s.avgScore}%` : '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-primary">
                        {s.attempts > 0 ? `${s.bestScore}%` : '–'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
