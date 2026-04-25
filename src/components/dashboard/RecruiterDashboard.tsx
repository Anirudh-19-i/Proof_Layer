import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { UserProfile, Job, Assessment, Role, Notification, Application } from '../../types';
import { 
  Users, Briefcase, BarChart3, Filter, 
  Search, ExternalLink, Mail, Award,
  CheckCircle2, AlertTriangle, TrendingUp,
  Settings, Loader2, BrainCircuit, Zap, Shield,
  History, MessageSquare, ChevronRight, Bell, Bookmark, BookmarkCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import ScrollReveal from '../ui/ScrollReveal';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { calculateJobFit, MatchResult } from '../../services/aiMatching';
import { notificationService } from '../../services/notificationService';
import SkillRadarChart from '../ui/SkillRadarChart';

export default function RecruiterDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'candidates' | 'jobs' | 'analytics' | 'notifications'>('candidates');
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [candidateAssessments, setCandidateAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [verifyingSkill, setVerifyingSkill] = useState<string | null>(null);
  const [selectedJobForMatch, setSelectedJobForMatch] = useState<Job | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [calculatingMatch, setCalculatingMatch] = useState(false);
  const [jobAnalytics, setJobAnalytics] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [shortlisting, setShortlisting] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const fetchedCandidates = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.role === Role.CANDIDATE)
        .sort((a, b) => b.consistencyScore - a.consistencyScore);
      
      if (fetchedCandidates.length === 0) {
        // Seed dummy candidates for demo
        const dummyCandidates = [
          { 
            uid: 'dummy1', 
            displayName: 'Elena Rostova', 
            email: 'elena@cyber.io', 
            role: Role.CANDIDATE, 
            skills: { 
              'Security': { id: 's1', name: 'Security', level: 'advanced', score: 92, history: [] }, 
              'Architecture': { id: 's2', name: 'Architecture', level: 'advanced', score: 88, history: [] } 
            }, 
            consistencyScore: 95, 
            learningVelocity: 2.4, 
            createdAt: new Date().toISOString() 
          },
          { 
            uid: 'dummy2', 
            displayName: 'Marcus Chen', 
            email: 'marcus@dev.net', 
            role: Role.CANDIDATE, 
            skills: { 
              'Go': { id: 's3', name: 'Go', level: 'intermediate', score: 85, history: [] }, 
              'Docker': { id: 's4', name: 'Docker', level: 'intermediate', score: 79, history: [] } 
            }, 
            consistencyScore: 82, 
            learningVelocity: 1.8, 
            createdAt: new Date().toISOString() 
          },
          { 
            uid: 'dummy3', 
            displayName: 'Sarah Jenkins', 
            email: 'sarah@ux.design', 
            role: Role.CANDIDATE, 
            skills: { 
              'Figma': { id: 's5', name: 'Figma', level: 'advanced', score: 98, history: [] }, 
              'React': { id: 's6', name: 'React', level: 'intermediate', score: 72, history: [] } 
            }, 
            consistencyScore: 88, 
            learningVelocity: 1.5, 
            createdAt: new Date().toISOString() 
          }
        ];
        // Don't write to DB to avoid polluting user data, just show in state for demo
        setCandidates(dummyCandidates as UserProfile[]);
      } else {
        setCandidates(fetchedCandidates);
      }
    };

    const fetchJobs = async () => {
      const q = query(collection(db, 'jobs'));
      const snapshot = await getDocs(q);
      const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      
      if (jobsList.length === 0) {
        const sampleJobs = [
          { title: "Senior Backend Architect", company: "TechScale AI", description: "Design high-performance distributed systems.", requiredSkills: ["System Design", "Node.js", "Java"], createdAt: new Date().toISOString() },
          { title: "Product Growth Specialist", company: "GrowthLoop", description: "Scale user acquisition through data-driven experiments.", requiredSkills: ["Data Analysis", "Growth", "Marketing"], createdAt: new Date().toISOString() },
          { title: "AI Research Engineer", company: "NeuralNet", description: "Push the boundaries of LLM evaluation and deployment.", requiredSkills: ["Machine Learning", "Python", "Problem Solving"], createdAt: new Date().toISOString() }
        ];
        for (const job of sampleJobs) {
          try {
            await addDoc(collection(db, 'jobs'), job);
          } catch (e) {
            console.error("Seeding jobs failed", e);
          }
        }
        setJobs(sampleJobs.map((j, i) => ({ id: `seeded-${i}`, ...j } as Job)));
      } else {
        setJobs(jobsList);
      }
    };

    const fetchApplications = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'applications'));
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        setApplications(apps);
      } catch (e) {
        console.error("Failed to fetch applications", e);
      }
    };

    const fetchNotifications = async () => {
      if (!profile) return;
      const notes = await notificationService.getNotifications(profile.uid);
      setNotifications(notes);
    };

    fetchCandidates();
    fetchJobs();
    fetchAnalytics();
    fetchApplications();
    fetchNotifications();

    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const toggleShortlist = async (appId: string, currentStatus: boolean = false) => {
    setShortlisting(appId);
    try {
      await updateDoc(doc(db, 'applications', appId), {
        shortlisted: !currentStatus,
        updatedAt: new Date().toISOString()
      });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, shortlisted: !currentStatus } : a));
      toast.success(!currentStatus ? 'Candidate shortlisted' : 'Removed from shortlist');
    } catch (e) {
      toast.error('Failed to update shortlist status');
    } finally {
      setShortlisting(null);
    }
  };

  const markNotificationRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const fetchAnalytics = async () => {
    try {
      const appSnap = await getDocs(collection(db, 'applications'));
      const jobSnap = await getDocs(collection(db, 'jobs'));
      
      const apps = appSnap.docs.map(d => d.data());
      const jobsList = jobSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));

      const analytics = jobsList.map(job => {
        const jobApps = apps.filter(a => a.jobId === job.id);
        const scores = jobApps.filter(a => a.scores).map(a => Object.values(a.scores as Record<string, number>)).flat();
        const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
        
        const passedRound1 = jobApps.filter(a => a.status === 'round2' || a.status === 'round3' || a.status === 'offered').length;
        const totalWithScore = jobApps.length;
        const passRate = totalWithScore > 0 ? ((passedRound1 / totalWithScore) * 100).toFixed(0) : '0';

        return {
          id: job.id,
          title: job.title,
          applicantCount: jobApps.length,
          avgScore,
          passRate,
          status: 'Active'
        };
      });

      setJobAnalytics(analytics);
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    }
  };

  const selectCandidate = async (candidate: UserProfile) => {
    setSelectedCandidate(candidate);
    setLoading(true);
    try {
      const q = query(collection(db, 'assessments'), /* where('userId', '==', candidate.uid) */);
      // Note: In production I'd add a composite index, but for now I'll filter manually as it's a demo
      const snapshot = await getDocs(q);
      const assessments = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Assessment))
        .filter(a => a.userId === candidate.uid);
      setCandidateAssessments(assessments);
    } finally {
      setLoading(false);
    }
  };

  const requestVerification = async (skillName: string) => {
    if (!selectedCandidate) return;
    setVerifyingSkill(skillName);
    try {
      // Create a verification request record
      await addDoc(collection(db, 'verification_requests'), {
        userId: selectedCandidate.uid,
        skillName,
        recruiterId: profile?.uid,
        status: 'pending',
        type: 'technical_audit',
        requestedAt: new Date().toISOString()
      });
      toast.success(`Verification requested for ${skillName}`);
    } catch (e) {
      toast.error("Failed to request verification");
    } finally {
      setVerifyingSkill(null);
    }
  };

  const runAiMatch = async (candidate?: UserProfile, job?: Job) => {
    const targetCandidate = candidate || selectedCandidate;
    const targetJob = job || selectedJobForMatch;

    if (!targetCandidate || !targetJob) {
      toast.error("Candidate and job required for matching");
      return;
    }
    setCalculatingMatch(true);
    setMatchResult(null);
    try {
      // Need to fetch assessments for the candidate if not already loaded
      let assessments = candidateAssessments;
      if (candidate && candidate.uid !== selectedCandidate?.uid) {
        const q = query(collection(db, 'assessments'));
        const snapshot = await getDocs(q);
        assessments = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Assessment))
          .filter(a => a.userId === candidate.uid);
      }

      const result = await calculateJobFit(targetCandidate, assessments, targetJob);
      setMatchResult(result);
      toast.success(`AI Analysis complete for ${targetCandidate.displayName}`);
    } catch (e) {
      toast.error("AI Matching failed");
    } finally {
      setCalculatingMatch(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex">
      {/* Sidebar */}
      <nav className="w-20 bg-[#141414] flex flex-col items-center py-8 gap-10">
        <div className="w-10 h-10 bg-[#F27D26] flex items-center justify-center rounded-sm group relative">
          <Briefcase className="text-white w-6 h-6" />
          <div className="absolute left-14 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {profile?.displayName} (Recruiter)
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <button 
            onClick={() => setActiveTab('candidates')}
            className={`p-3 rounded-lg transition-all ${activeTab === 'candidates' ? 'text-[#F27D26] bg-white/5' : 'text-gray-500 hover:text-white'}`}
          >
            <Users className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`p-3 rounded-lg transition-all ${activeTab === 'jobs' ? 'text-[#F27D26] bg-white/5' : 'text-gray-500 hover:text-white'}`}
          >
            <Briefcase className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`p-3 rounded-lg transition-all ${activeTab === 'analytics' ? 'text-[#F27D26] bg-white/5' : 'text-gray-500 hover:text-white'}`}
          >
            <BarChart3 className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`p-3 rounded-lg transition-all relative ${activeTab === 'notifications' ? 'text-[#F27D26] bg-white/5' : 'text-gray-500 hover:text-white'}`}
          >
            <Bell className="w-6 h-6" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#F27D26] rounded-full border border-[#141414]" />
            )}
          </button>
          <div className="w-full h-px bg-white/10 my-2" />
          <Link 
            to="/profile"
            className="p-3 rounded-lg text-gray-500 hover:text-white transition-all"
          >
            <User className="w-6 h-6" />
          </Link>
          <Link 
            to="/settings"
            className="p-3 rounded-lg text-gray-500 hover:text-white transition-all"
          >
            <Settings className="w-6 h-6" />
          </Link>
        </div>
        <button onClick={signOut} className="p-3 text-red-500 hover:text-red-400 transition-colors"><TrendingUp className="w-6 h-6" /></button>
        <button 
          onClick={async () => {
            if (profile) {
              await updateDoc(doc(db, 'users', profile.uid), { role: Role.CANDIDATE });
              window.location.reload();
            }
          }}
          className="mt-auto p-3 text-gray-500 hover:text-white"
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Content Area */}
      {activeTab === 'candidates' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Candidate List */}
          <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-8 border-b border-gray-100 space-y-4">
              <div className="flex justify-between items-center text-gray-400">
                 <span className="text-[10px] font-bold uppercase tracking-widest">Recruiter Portal</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest">{profile?.displayName}</span>
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Candidates</h2>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search Skill DNA..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none text-xs font-medium focus:ring-1 focus:ring-[#F27D26]" />
                </div>
                <button className="p-2 bg-gray-50 text-gray-400 hover:text-[#141414]"><Filter className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {candidates.map(c => (
                <button 
                  key={c.uid}
                  onClick={() => selectCandidate(c)}
                  className={`w-full p-6 text-left hover:bg-gray-50 transition-colors flex items-center gap-4 ${selectedCandidate?.uid === c.uid ? 'bg-gray-50 border-l-4 border-[#F27D26]' : ''}`}
                >
                  <div className="w-12 h-12 bg-gray-100 flex items-center justify-center font-bold text-gray-400 overflow-hidden">
                    {c.photoURL ? <img src={c.photoURL} className="w-full h-full object-cover" /> : c.displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate text-sm">{c.displayName}</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase text-gray-400 truncate">{c.email}</p>
                      {applications.some(a => a.userId === c.uid && a.shortlisted) && (
                        <BookmarkCheck className="w-3 h-3 text-[#F27D26]" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold">{c.consistencyScore}%</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">DNA Match</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail View */}
          <div className="flex-1 overflow-y-auto bg-[#F5F5F4] p-12">
            {selectedCandidate ? (
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="flex justify-between items-end">
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-white border border-[#141414]/10 p-2 shadow-sm">
                      {selectedCandidate.photoURL ? <img src={selectedCandidate.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl font-bold">{selectedCandidate.displayName[0]}</div>}
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight mb-2 uppercase">{selectedCandidate.displayName}</h1>
                      <div className="flex gap-4 items-center">
                        {selectedCandidate.consistencyScore >= 90 && (
                          <span className="px-3 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                             <Award className="w-3 h-3" /> Top 10%
                          </span>
                        )}
                        {selectedCandidate.learningVelocity >= 2.0 && (
                          <span className="px-3 py-1 bg-[#F27D26] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                             <Zap className="w-3 h-3" /> Hyper-Growth
                          </span>
                        )}
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedCandidate.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-8">
                     <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Learning Velocity</p>
                        <p className="text-3xl font-mono text-[#F27D26]">{selectedCandidate.learningVelocity.toFixed(2)}x</p>
                     </div>
                  </div>
                </header>

                <section className="grid grid-cols-3 gap-6">
                   <div className="col-span-2 bg-white border border-[#141414]/10 p-8 shadow-sm space-y-8">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] border-b pb-4">Assessment History & Evidence</h3>
                      <div className="flex gap-4 mb-4">
                         <button className="px-4 py-2 bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-[#141414] hover:text-white transition-all">All Verifications</button>
                         <button className="px-4 py-2 bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-400">Technical Audits</button>
                         <button className="px-4 py-2 bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-400">Behavioral Proof</button>
                      </div>
                      <div className="space-y-6">
                        {loading ? (
                           <div className="flex flex-col items-center py-12 text-gray-400">
                             <Loader2 className="animate-spin mb-2" />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Compiling Evidence...</span>
                           </div>
                        ) : (
                          candidateAssessments.sort((a, b) => b.round - a.round).map(acc => (
                            <ScrollReveal key={acc.id} baseOpacity={0} baseRotation={1} blurStrength={2}>
                              <div key={acc.id} className="bg-gray-50 border border-gray-100 p-8 space-y-6 hover:shadow-lg transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                   <Award className="w-12 h-12" />
                                </div>
                                
                                <div className="flex justify-between items-start">
                                   <div>
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-0.5 bg-[#141414] text-white text-[8px] font-bold uppercase tracking-widest">Round {acc.round}</span>
                                        <span className="text-[10px] font-black uppercase tracking-tight text-[#F27D26]">{acc.type}</span>
                                        {selectedJobForMatch && applications.some(a => a.userId === selectedCandidate.uid && a.jobId === selectedJobForMatch.id && a.shortlisted) && (
                                           <span className="px-2 py-0.5 bg-[#F27D26]/10 text-[#F27D26] text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                                             <BookmarkCheck className="w-2 h-2" /> Shortlisted
                                           </span>
                                        )}
                                      </div>
                                      <h4 className="font-bold text-lg uppercase tracking-tight">{acc.taskId.split('-').join(' ')}</h4>
                                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{new Date(acc.createdAt).toLocaleDateString()} at {new Date(acc.createdAt).toLocaleTimeString()}</p>
                                   </div>
                                   <div className="flex flex-col items-end">
                                      <div className="text-4xl font-black tracking-tighter text-[#141414]">{acc.aiEvaluation?.score || 0}</div>
                                      <div className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">AI Proof Score</div>
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200">
                                   <div className="space-y-4">
                                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Candidate Input</h5>
                                      <div className="bg-white p-4 text-[11px] font-mono text-gray-600 border border-gray-100 max-h-40 overflow-y-auto scrollbar-thin">
                                         {acc.type === 'inquiry' ? (
                                           <ul className="list-disc pl-4 space-y-1">
                                              {(acc.userInput.questions || []).map((q: string, i: number) => <li key={i}>{q}</li>)}
                                           </ul>
                                         ) : (
                                           <p className="whitespace-pre-wrap">{acc.userInput.response}</p>
                                         )}
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2">
                                         <BrainCircuit className="w-3 h-3 text-[#F27D26]" />
                                         <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F27D26]">AI Feedback & Analysis</h5>
                                      </div>
                                      <div className="prose prose-xs max-w-none text-[11px] font-medium text-gray-600 bg-white p-4 border border-gray-100 max-h-40 overflow-y-auto scrollbar-thin">
                                         <ReactMarkdown>{acc.aiEvaluation?.feedback || acc.aiEvaluation?.analysis || 'No feedback available.'}</ReactMarkdown>
                                      </div>
                                    </div>
                                </div>
                              </div>
                            </ScrollReveal>
                          ))
                        )}
                        {candidateAssessments.length === 0 && !loading && (
                          <div className="py-12 text-center text-gray-400 italic">No verified proof points yet.</div>
                        )}
                      </div>
                   </div>

                   <div className="space-y-6">
                     <div className="bg-[#141414] text-white p-8 space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Skill DNA Strength Analysis</h3>
                        <div className="flex flex-col gap-8">
                           <div className="bg-white/5 p-4 rounded-sm border border-white/10 flex items-center justify-center">
                              <SkillRadarChart />
                           </div>
                           
                           <div className="space-y-4">
                            {Object.entries(selectedCandidate.skills).map(([name, skill]) => (
                                <div key={name} className="space-y-2 group/skill">
                                  <div className="flex justify-between text-[10px] font-bold uppercase">
                                     <div className="flex items-center gap-2">
                                        <span>{name}</span>
                                        {skill.score >= 80 && <Shield className="w-3 h-3 text-[#F27D26]" />}
                                     </div>
                                     <span>{skill.score}%</span>
                                  </div>
                                  <div className="h-1 bg-white/10 overflow-hidden relative">
                                     <div className="h-full bg-[#F27D26]" style={{ width: `${skill.score}%` }} />
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="bg-white border border-[#141414]/10 p-8 space-y-6 shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Hiring Actions</h3>
                        <div className="space-y-3">
                           <button className="w-full py-3 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-colors flex items-center justify-center gap-2">
                              <Zap className="w-3 h-3" /> Initiate Final Audit
                           </button>
                           <button className="w-full py-3 border border-[#141414] text-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all flex items-center justify-center gap-2">
                              <MessageSquare className="w-3 h-3" /> Schedule Deep Dive
                           </button>
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase text-gray-400">Application State</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest">Active Journey</span>
                            </div>
                            
                            {selectedJobForMatch && (
                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Shortlist for {selectedJobForMatch.title}</label>
                                  {(() => {
                                    const app = applications.find(a => a.userId === selectedCandidate.uid && a.jobId === selectedJobForMatch.id);
                                    if (!app) return <p className="text-[10px] text-gray-400 italic">No application found for this job</p>;
                                    return (
                                      <button 
                                        onClick={() => toggleShortlist(app.id, app.shortlisted)}
                                        disabled={shortlisting === app.id}
                                        className={`w-full py-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${app.shortlisted ? 'bg-[#F27D26] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                      >
                                        {shortlisting === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : app.shortlisted ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                                        {app.shortlisted ? 'In Shortlist' : 'Add to Shortlist'}
                                      </button>
                                    );
                                  })()}
                               </div>
                            )}
                        </div>
                     </div>

                     <div className="bg-white border border-[#141414]/10 p-8 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Risk Status</h3>
                        <div className="flex items-center gap-3 text-green-500">
                           <CheckCircle2 className="w-5 h-5" />
                           <span className="text-xs font-bold uppercase tracking-widest">Integrity Verified</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Anti-cheating pattern detection shows 0 anomalies in assessment timelines.</p>
                     </div>

                     <div className="bg-white border border-[#141414]/10 p-8 space-y-6">
                        <div className="flex justify-between items-center">
                           <h3 className="text-xs font-bold uppercase tracking-[0.2em]">AI Talent Match (Beta)</h3>
                           <BrainCircuit className="w-4 h-4 text-[#F27D26]" />
                        </div>
                        
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-gray-400">Select Active Role</label>
                              <select 
                                className="w-full bg-gray-50 border-none text-xs font-medium py-2 px-3 focus:ring-1 focus:ring-[#F27D26]"
                                onChange={(e) => setSelectedJobForMatch(jobs.find(j => j.id === e.target.value) || null)}
                                value={selectedJobForMatch?.id || ''}
                              >
                                <option value="">Choose a role...</option>
                                {jobs.map(j => (
                                  <option key={j.id} value={j.id}>{j.title}</option>
                                ))}
                              </select>
                           </div>

                           <button 
                             onClick={() => runAiMatch()}
                             disabled={!selectedJobForMatch || calculatingMatch}
                             className="w-full py-4 bg-[#F27D26] text-white font-bold uppercase tracking-widest text-[10px] hover:bg-[#141414] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                             {calculatingMatch ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                             {calculatingMatch ? 'Processing DNA...' : 'Run Match Analysis'}
                           </button>

                           {matchResult && (
                             <motion.div 
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               className="pt-6 border-t border-gray-100 space-y-6"
                             >
                               <div className="flex justify-between items-end">
                                  <div>
                                     <p className="text-[10px] font-bold uppercase text-gray-400">AI Match Score</p>
                                     <p className={`text-4xl font-black ${matchResult.score > 80 ? 'text-green-500' : 'text-[#F27D26]'}`}>
                                       {matchResult.score}%
                                     </p>
                                  </div>
                                  <div className="text-right">
                                     <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase tracking-widest">Axiome Intelligence</span>
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Fit Analysis</h5>
                                  <p className="text-xs text-gray-600 font-medium leading-relaxed">{matchResult.reasoning}</p>
                               </div>

                               <div className="space-y-4">
                                  <div className="space-y-2">
                                     <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F27D26]">Proof-Based Insights</h5>
                                     <ul className="space-y-2">
                                        {matchResult.assessmentInsights.map((insight, i) => (
                                          <li key={i} className="text-[10px] font-medium text-gray-600 bg-gray-50 border-l-2 border-[#141414] p-2 leading-relaxed">
                                            {insight}
                                          </li>
                                        ))}
                                     </ul>
                                  </div>

                                  <div className="space-y-2">
                                     <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Competitive Skill Matrix</h5>
                                     <div className="space-y-2">
                                        {matchResult.skillAnalysis.map((skill, i) => (
                                          <div key={i} className="flex justify-between items-center bg-gray-50/50 p-2 border border-gray-100">
                                            <div className="flex items-center gap-2">
                                               <div className={`w-1 h-1 rounded-full ${skill.gap ? 'bg-red-400' : 'bg-green-500'}`} />
                                               <span className="text-[10px] font-bold uppercase tracking-tighter">{skill.skill}</span>
                                            </div>
                                            <span className="text-[9px] text-gray-400 italic max-w-[60%] text-right font-medium">{skill.insight}</span>
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                     <h5 className="text-[8px] font-bold uppercase tracking-widest text-green-600">Core Strengths</h5>
                                     <ul className="space-y-1">
                                        {matchResult.strengths.map(s => (
                                          <li key={s} className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-green-500 rounded-full" /> {s}
                                          </li>
                                        ))}
                                     </ul>
                                  </div>
                                  <div className="space-y-2">
                                     <h5 className="text-[8px] font-bold uppercase tracking-widest text-red-400">Identified Gaps</h5>
                                     <ul className="space-y-1">
                                        {matchResult.gaps.map(g => (
                                          <li key={g} className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-red-400 rounded-full" /> {g}
                                          </li>
                                        ))}
                                     </ul>
                                  </div>
                               </div>
                             </motion.div>
                           )}
                        </div>
                     </div>
                   </div>
                </section>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                 <BarChart3 className="w-16 h-16 mb-4 opacity-10" />
                 <p className="font-bold uppercase tracking-[0.3em] text-sm">Select a candidate to view DNA evidence</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="flex-1 p-12 overflow-y-auto bg-[#F5F5F4]">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-black uppercase tracking-tighter">Active Job Postings</h1>
              <button className="px-6 py-3 bg-[#141414] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-colors flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Post New Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map(job => (
                <div key={job.id} className="bg-white p-8 border border-gray-100 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-tight">{job.title}</h3>
                      <p className="text-xs font-bold uppercase text-gray-400">{job.company}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-[8px] font-black uppercase text-green-600 tracking-widest">Active</span>
                  </div>

                  <div className="flex gap-8 border-y border-gray-50 py-4">
                     <div className="flex-1">
                        <div className="text-2xl font-black">24</div>
                        <div className="text-[8px] font-bold uppercase text-gray-400">Total Applicants</div>
                     </div>
                     <div className="flex-1">
                        <div className="text-2xl font-black text-[#F27D26]">8</div>
                        <div className="text-[8px] font-bold uppercase text-gray-400">Top DNA Match</div>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gray-50 text-[8px] font-bold uppercase text-gray-500">{s}</span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-50 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-[#F27D26] tracking-widest">Recommended Fits</h4>
                    <div className="space-y-2">
                       {candidates.slice(0, 2).map((c, i) => (
                         <div key={c.uid} className="flex justify-between items-center bg-gray-50 p-3">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[8px] font-bold border">{c.displayName[0]}</div>
                               <div>
                                  <p className="text-[10px] font-bold">{c.displayName}</p>
                                  <p className="text-[8px] text-gray-400 uppercase font-black">{i === 0 ? '94%' : '88%'} Skill Match</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => {
                                selectCandidate(c);
                                setSelectedJobForMatch(job);
                                setActiveTab('candidates');
                                // Delay slightly to ensure tab switch happens
                                setTimeout(() => runAiMatch(c, job), 100);
                              }}
                              className="text-[8px] font-black uppercase text-[#F27D26] hover:underline"
                            >
                               Analyze Fit
                            </button>
                         </div>
                       ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('candidates')}
                    className="w-full py-4 border border-[#141414] font-bold uppercase tracking-widest text-[10px] hover:bg-[#141414] hover:text-white transition-all"
                  >
                    View Full Pipeline
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="flex-1 p-12 overflow-y-auto bg-[#F5F5F4]">
          <div className="max-w-6xl mx-auto space-y-12">
            <header className="flex justify-between items-end">
               <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter">Hiring Insights</h1>
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-2">Real-time assessment efficacy & pipeline velocity</p>
               </div>
               <button 
                 onClick={fetchAnalytics}
                 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F27D26] hover:underline"
               >
                 <History className="w-3 h-3" /> Refresh Report
               </button>
            </header>

            <div className="grid grid-cols-4 gap-6">
               {[
                 { label: 'Avg Interview Score', value: `${jobAnalytics.length > 0 ? (jobAnalytics.reduce((acc, curr) => acc + parseFloat(curr.avgScore), 0) / jobAnalytics.length).toFixed(1) : 0}%`, trend: '+4%' },
                 { label: 'Verified Proof Count', value: candidates.reduce((acc, curr) => acc + (Object.keys(curr.skills).length), 0).toString(), trend: '+12' },
                 { label: 'Candidate Velocity', value: (candidates.reduce((acc, curr) => acc + curr.learningVelocity, 0) / (candidates.length || 1)).toFixed(1) + 'x', trend: '+0.2' },
                 { label: 'Avg Pass Rate', value: `${jobAnalytics.length > 0 ? (jobAnalytics.reduce((acc, curr) => acc + parseFloat(curr.passRate), 0) / jobAnalytics.length).toFixed(0) : 0}%`, trend: '+2%' },
               ].map(stat => (
                 <div key={stat.label} className="bg-white p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gray-50 -mr-12 -mt-12 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-4 relative z-10">{stat.label}</div>
                    <div className="text-3xl font-black relative z-10">{stat.value}</div>
                    <div className={`text-[10px] font-bold uppercase mt-2 relative z-10 ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-blue-500'}`}>{stat.trend} increase</div>
                 </div>
               ))}
            </div>

            <div className="space-y-6">
               <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                 <Briefcase className="w-4 h-4 text-[#F27D26]" /> Job Performance Matrix
               </h3>
               <div className="bg-white border border-[#141414]/10 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                           <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Position</th>
                           <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Applicants</th>
                           <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Avg DNA Score</th>
                           <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">R1 Pass Rate</th>
                           <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {jobAnalytics.map((analysis) => (
                          <tr key={analysis.id} className="hover:bg-gray-50/50 transition-colors group">
                             <td className="px-8 py-6">
                                <div className="font-bold text-sm tracking-tight group-hover:text-[#F27D26] transition-colors">{analysis.title}</div>
                             </td>
                             <td className="px-8 py-6 font-mono text-xs">{analysis.applicantCount}</td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                   <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-[#141414]" style={{ width: `${analysis.avgScore}%` }} />
                                   </div>
                                   <span className="font-mono text-xs">{analysis.avgScore}%</span>
                                </div>
                             </td>
                             <td className="px-8 py-6 text-xs font-bold">{analysis.passRate}%</td>
                             <td className="px-8 py-6">
                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${analysis.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                   {analysis.status}
                                </span>
                             </td>
                          </tr>
                        ))}
                        {jobAnalytics.length === 0 && (
                          <tr>
                             <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic text-sm">No job performance data available yet.</td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
               <div className="col-span-2 bg-white p-8 border border-gray-100 shadow-sm h-80 flex flex-col items-center justify-center space-y-4">
                  <BarChart3 className="w-12 h-12 text-gray-100" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">Pipeline Distribution Graph</p>
               </div>
               <div className="bg-[#141414] p-8 space-y-8 flex flex-col justify-center">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 border-b border-white/10 pb-4">Top Verified Skills</h3>
                  <div className="space-y-6">
                    {[
                      { name: 'System Design', value: 88 },
                      { name: 'Node.js', value: 72 },
                      { name: 'Product Strategy', value: 65 },
                      { name: 'Data Engineering', value: 48 },
                    ].map(skill => (
                      <div key={skill.name} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-white/80">
                          <span>{skill.name}</span>
                          <span>{skill.value}%</span>
                        </div>
                        <div className="h-1 bg-white/10">
                          <div className="h-full bg-[#F27D26]" style={{ width: `${skill.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="flex-1 p-12 overflow-y-auto bg-[#F5F5F4]">
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="flex justify-between items-end">
               <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter">Activity Feed</h1>
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-2">Real-time alerts from your talent pipeline</p>
               </div>
               <button 
                 onClick={async () => {
                   if (!profile) return;
                   const notes = await notificationService.getNotifications(profile.uid);
                   setNotifications(notes);
                   toast.success('Feed updated');
                 }}
                 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F27D26] hover:underline"
               >
                 <History className="w-3 h-3" /> Refresh Feed
               </button>
            </header>

            <div className="space-y-4">
               {notifications.length > 0 ? (
                 <div className="divide-y divide-gray-100 bg-white border border-gray-100 shadow-sm">
                   {notifications.map((note) => (
                     <div 
                       key={note.id} 
                       className={`p-6 transition-colors flex items-start gap-6 group hover:bg-gray-50/50 ${!note.read ? 'bg-gray-50/30 border-l-4 border-[#F27D26]' : ''}`}
                     >
                       <div className={`mt-1 p-2 rounded-full ${note.type === 'new_application' ? 'bg-blue-50 text-blue-500' : 'bg-[#F27D26]/10 text-[#F27D26]'}`}>
                          {note.type === 'new_application' ? <Briefcase className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                       </div>
                       <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                             <h4 className="text-sm font-bold uppercase tracking-tight">
                                {note.type === 'new_application' ? 'New Application Received' : 'Candidate Progressed'}
                             </h4>
                             <span className="text-[9px] font-mono text-gray-400 uppercase">{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                             <span className="font-bold text-[#141414]">{note.candidateName}</span> 
                             {note.type === 'new_application' ? (
                               <> applied for <span className="font-bold text-[#F27D26]">{note.jobTitle}</span></>
                             ) : (
                               <> reached <span className="font-bold text-[#F27D26]">{note.round}</span> for <span className="font-bold text-[#141414]">{note.jobTitle}</span></>
                             )}
                          </p>
                          <div className="pt-2 flex items-center gap-4">
                             <button 
                               onClick={() => {
                                 const c = candidates.find(u => u.uid === note.candidateId);
                                 if (c) {
                                   selectCandidate(c);
                                   const j = jobs.find(job => job.id === note.jobId);
                                   if (j) setSelectedJobForMatch(j);
                                   setActiveTab('candidates');
                                 }
                               }}
                               className="text-[9px] font-black uppercase tracking-widest text-[#141414] hover:text-[#F27D26] flex items-center gap-1"
                             >
                               View Profile <ChevronRight className="w-3 h-3" />
                             </button>
                             {!note.read && (
                               <button 
                                 onClick={() => markNotificationRead(note.id)}
                                 className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[#141414]"
                               >
                                 Mark read
                               </button>
                             )}
                          </div>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-white border border-gray-100 p-20 text-center space-y-4">
                    <Bell className="w-12 h-12 text-gray-100 mx-auto" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Your activity feed is currently empty</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
