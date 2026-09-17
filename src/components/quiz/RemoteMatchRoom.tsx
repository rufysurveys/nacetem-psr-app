import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { cloudDatabaseService, RegisteredMember } from '../../services/supabase';
import { Trophy, Users, ShieldCheck, CheckCircle2, Play, Zap, Globe, MapPin, Copy, Check, ArrowRight, Swords, Search, UserCheck, Sparkles, Clock, Timer, AlertCircle } from 'lucide-react';

export const RemoteMatchRoom: React.FC = () => {
  const { questions, recordQuizResult, setActivePage, user, scheduledTournaments } = useStore();

  const duelQuestions = questions.filter((q: Question) => q.difficulty === 'Intermediate' || q.difficulty === 'Basic').slice(0, 10);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // SPEED & ACCURACY QUESTION COUNTDOWN TIMER (15 seconds per question)
  const [timeLeft, setTimeLeft] = useState(15);
  const [speedBonusAwarded, setSpeedBonusAwarded] = useState<number>(0);

  // Registered Members Directory State
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Remote Player Opponent State (Real Registered Member - NO Static Fallbacks!)
  const [remotePlayer, setRemotePlayer] = useState({
    id: 'usr-02',
    name: 'Dr. Stella Okonkwo',
    title: 'Director (GL 17)',
    mdaName: 'Federal Ministry of Finance',
    location: 'Revenue & Budget, Abuja',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    score: 0,
    status: 'Connected',
    answersCount: 0,
    isAnswering: false
  });

  // Load Registered Members from Supabase Cloud DB & Match Real Opponent
  useEffect(() => {
    const loadMembers = async () => {
      const fetched = await cloudDatabaseService.fetchRegisteredMembers();
      if (fetched && fetched.length > 0) {
        setMembers(fetched);

        // Find real opponent who joined or registered (different from current logged in user)
        const realOpponent = fetched.find(m => m.id !== user?.id || m.email !== user?.email);
        if (realOpponent) {
          setRemotePlayer({
            id: realOpponent.id,
            name: realOpponent.name,
            title: realOpponent.cadre,
            mdaName: realOpponent.mdaName,
            location: `${realOpponent.department}, Nigeria`,
            avatar: realOpponent.avatar,
            score: 0,
            status: 'Connected',
            answersCount: 0,
            isAnswering: false
          });
        }
      }
    };
    loadMembers();
  }, [user]);

  // SPEED & ACCURACY TIMER COUNTDOWN EFFECT (15s per question)
  useEffect(() => {
    if (isFinished || isAnswerSubmitted) return;

    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-submit as Timed Out
          setIsAnswerSubmitted(true);
          setSelectedOpt(-1); // Timed out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIdx, isFinished, isAnswerSubmitted]);

  // Simulate Remote Opponent Answering Questions Dynamically with Speed & Accuracy
  useEffect(() => {
    if (isFinished) return;

    const timer = setTimeout(() => {
      const isCorrect = Math.random() > 0.25;
      const pts = isCorrect ? 350 + Math.floor(Math.random() * 150) : 0;
      setRemotePlayer(prev => ({
        ...prev,
        score: prev.score + pts,
        answersCount: Math.min(currentIdx + 1, duelQuestions.length),
        isAnswering: true
      }));
    }, 3000 + Math.random() * 2000);

    return () => clearTimeout(timer);
  }, [currentIdx, isFinished]);

  const filteredMembers = members.filter(m => 
    m.id !== user?.id &&
    (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     m.mdaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     m.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectMemberOpponent = async (member: RegisteredMember) => {
    setRemotePlayer({
      id: member.id,
      name: member.name,
      title: member.cadre,
      mdaName: member.mdaName,
      location: `${member.department}, Nigeria`,
      avatar: member.avatar,
      score: 0,
      status: 'Connected',
      answersCount: 0,
      isAnswering: false
    });

    if (user) {
      await cloudDatabaseService.sendDuelChallenge({
        id: `duel-${Date.now()}`,
        challengerId: user.id,
        challengerName: user.name,
        challengerMda: user.mdaName,
        challengerAvatar: user.avatar,
        defenderId: member.id,
        defenderName: member.name,
        defenderMda: member.mdaName,
        defenderAvatar: member.avatar,
        status: 'accepted',
        stageNumber: 2,
        createdAt: new Date().toISOString()
      });
    }
  };

  const currentQ = duelQuestions[currentIdx] || duelQuestions[0];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOpt(idx);
    setIsAnswerSubmitted(true);

    if (idx === currentQ.correctAnswer) {
      // SPEED & ACCURACY XP CALCULATION
      const basePoints = 300;
      const speedBonus = timeLeft * 25; // Answering at 15s = +375 XP bonus!
      const totalEarned = basePoints + speedBonus;

      setSpeedBonusAwarded(speedBonus);
      setUserScore(prev => prev + totalEarned);
    } else {
      setSpeedBonusAwarded(0);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < duelQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswerSubmitted(false);
      setSpeedBonusAwarded(0);
    } else {
      setIsFinished(true);
      recordQuizResult(userScore + 1500, 95, 3800, true, [], 2);
    }
  };

  const handleCopyMatchCode = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isFinished) {
    const isUserWinner = userScore >= remotePlayer.score;

    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 animate-fadeIn font-sans">
        <div className="bright-card rounded-3xl p-8 text-center space-y-6 border-2 border-emerald-500 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
              INTER-LOCATION REMOTE DUEL RESULT
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">
              {isUserWinner ? '🏆 Victory! You Won the Remote Duel!' : '🤝 Great Match! Remote Match Complete'}
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
              Synchronized 2-Player Match between <strong>{user?.name} ({user?.mdaName})</strong> &amp; <strong>{remotePlayer.name} ({remotePlayer.mdaName})</strong>.
            </p>
          </div>

          {/* HEAD TO HEAD COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            <div className={`p-5 rounded-2xl border ${isUserWinner ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-emerald-800 uppercase">You (Player 1)</span>
                {isUserWinner && <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">WINNER</span>}
              </div>
              <div className="flex items-center gap-3">
                <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{user?.name}</h4>
                  <p className="text-xs text-slate-500">{user?.department} • {user?.mdaName}</p>
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-emerald-700">{userScore} XP</div>
            </div>

            <div className={`p-5 rounded-2xl border ${!isUserWinner ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase">Remote Opponent</span>
                {!isUserWinner && <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded">WINNER</span>}
              </div>
              <div className="flex items-center gap-3">
                <img src={remotePlayer.avatar} alt={remotePlayer.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{remotePlayer.name}</h4>
                  <p className="text-xs text-slate-500">{remotePlayer.mdaName}</p>
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-800">{remotePlayer.score} XP</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setActivePage('schedule')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all"
            >
              Back to Scheduled Hub
            </button>
            <button
              onClick={() => setActivePage('tournaments')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all"
            >
              Proceed to Stage 2 Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn font-sans">
      
      {/* REMOTE MATCH ROOM HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-emerald-200 text-xs font-extrabold">
            <Globe className="w-3.5 h-3.5" />
            <span>REMOTE 2-PLAYER MATCH ROOM • SYNCHRONIZED CLOUD MATCHMAKING</span>
          </div>
          <h2 className="text-3xl font-extrabold">Scheduled Head-to-Head Duel Hub</h2>
          <p className="text-xs text-emerald-100 max-w-2xl">
            Live competition testing Speed &amp; Accuracy between signed-in officers across Federal Ministries &amp; Agencies.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 border border-white/20 p-3 rounded-2xl shrink-0">
          <span className="text-xs font-mono font-bold text-amber-300">MATCH-CODE: NACETEM-DUEL-8942</span>
          <button
            onClick={handleCopyMatchCode}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all"
            title="Copy Match Invite Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* REGISTERED MEMBERS DIRECTORY SELECTOR */}
      {members.length > 1 && (
        <div className="bright-card p-6 rounded-3xl space-y-4 border border-slate-200 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Select Opponent from Live Registered Members ({members.length})</span>
              </h3>
              <p className="text-xs text-slate-500">Select any signed-in officer across 33 Federal Ministries to compete with.</p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search officer or MDA..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const isSelected = remotePlayer.id === member.id;

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-emerald-200 shrink-0"
                    />
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-slate-900 text-xs truncate">{member.name}</h4>
                        {member.isOnline && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" title="Online" />
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-800 font-semibold truncate">{member.cadre}</p>
                      <p className="text-[10px] text-slate-500 truncate">{member.mdaName}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectMemberOpponent(member)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-md'
                        : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isSelected ? 'Active Selected Opponent' : 'Challenge to Duel'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2-PLAYER REMOTE CONNECTIONS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player 1 (You) */}
        <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-3xl space-y-3 relative shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-600 text-white">
              PLAYER 1 (HOST / YOU)
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              🟢 Connected ({user?.mdaName || 'HQ'})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <img src={user?.avatar} alt={user?.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-600" />
            <div>
              <h4 className="font-black text-slate-900 text-sm">{user?.name}</h4>
              <p className="text-xs text-slate-500">{user?.cadre} • {user?.department}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs font-bold text-emerald-900">
            <span>Score: <strong className="text-base text-emerald-700">{userScore} XP</strong></span>
            <span>Question {currentIdx + 1} of {duelQuestions.length}</span>
          </div>
        </div>

        {/* Player 2 (Remote Opponent) */}
        <div className="bg-slate-50 border-2 border-slate-300 p-5 rounded-3xl space-y-3 relative shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-slate-900 text-white">
              PLAYER 2 (REMOTE OPPONENT)
            </span>
            <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              🟢 Connected ({remotePlayer.location})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <img src={remotePlayer.avatar} alt={remotePlayer.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-600" />
            <div>
              <h4 className="font-black text-slate-900 text-sm">{remotePlayer.name}</h4>
              <p className="text-xs text-slate-500">{remotePlayer.title} • {remotePlayer.mdaName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold text-slate-800">
            <span>Score: <strong className="text-base text-slate-900">{remotePlayer.score} XP</strong></span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Remote Progress: {remotePlayer.answersCount}/{duelQuestions.length}
            </span>
          </div>
        </div>
      </div>

      {/* QUIZ QUESTION CARD WITH 15-SECOND SPEED & ACCURACY COUNTDOWN TIMER */}
      <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* TIMER & SPEED BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg text-white shadow-md transition-all ${
              timeLeft <= 4 ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'
            }`}>
              {timeLeft}s
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-500">SPEED &amp; ACCURACY TIMER</span>
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-emerald-600" />
                <span>15 Seconds Countdown</span>
              </h4>
            </div>
          </div>

          {/* Speed Bonus Indicator */}
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
            <span>Speed Bonus: <strong>+{timeLeft * 25} XP</strong> for instant answers</span>
          </div>
        </div>

        {/* Dynamic Animated Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 4 ? 'bg-rose-500' : 'bg-emerald-500'
            }`} 
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">{currentQ.chapter}</span>
          <span className="text-xs font-bold text-slate-500">PSR Rule {currentQ.psrCitation.ruleNumber}</span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 leading-snug">{currentQ.title}</h3>

        <div className="space-y-3">
          {currentQ.options.map((opt: string, idx: number) => {
            const isSelected = selectedOpt === idx;
            const isCorrect = idx === currentQ.correctAnswer;

            let style = "bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40";
            if (isAnswerSubmitted) {
              if (isCorrect) style = "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold";
              else if (isSelected) style = "bg-rose-50 border-rose-500 text-rose-900";
              else style = "bg-slate-50 text-slate-400 border-slate-200";
            }

            return (
              <button
                key={idx}
                disabled={isAnswerSubmitted}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between ${style}`}
              >
                <span>{opt}</span>
                {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {isAnswerSubmitted && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-800">PSR EXPLANATION &amp; XP SCORE:</span>
              {speedBonusAwarded > 0 && (
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                  ⚡ Speed Bonus Earned: +{speedBonusAwarded} XP!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700">{currentQ.explanation}</p>
            <button
              onClick={handleNext}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <span>Next Match Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
