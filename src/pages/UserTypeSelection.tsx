import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Settings, ArrowRight } from 'lucide-react';

const UserTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="text-center mb-10">
        <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold">
          Air<span className="text-primary">Book</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">The smart quiz platform for serious learners</p>
      </div>

      {/* Cards */}
      <div className="w-full max-w-sm space-y-4">
        {/* Student */}
        <button
          onClick={() => navigate('/student-auth')}
          className="w-full group bg-white hover:bg-primary hover:shadow-xl transition-all duration-200 rounded-2xl p-6 border border-border text-left flex items-center gap-5 shadow-sm"
        >
          <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0">
            <GraduationCap className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg group-hover:text-white transition-colors">Student</div>
            <div className="text-sm text-muted-foreground group-hover:text-white/70 transition-colors">
              Attempt mock tests &amp; track your progress
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
        </button>

        {/* Admin */}
        <button
          onClick={() => navigate('/password-protected')}
          className="w-full group bg-white hover:bg-slate-800 hover:shadow-xl transition-all duration-200 rounded-2xl p-6 border border-border text-left flex items-center gap-5 shadow-sm"
        >
          <div className="w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
            <Settings className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg group-hover:text-white transition-colors">Admin</div>
            <div className="text-sm text-muted-foreground group-hover:text-white/70 transition-colors">
              Create &amp; manage quiz content
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
        </button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">Powered by Telegram · No database needed</p>
    </div>
  );
};

export default UserTypeSelection;
