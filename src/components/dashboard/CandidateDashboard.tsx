import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { Job, Application, Role, Assessment } from '../../types';
import { 
  Dna, Brain, Target, BarChart3, 
  Briefcase, CheckCircle2, Circle, 
  ArrowRight, Award, History, Settings, Zap,
  Loader2, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Round1 from '../assessments/Round1';
import Round2 from '../assessments/Round2';
import Round3 from '../assessments/Round3';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function CandidateDashboard() {
  const { user, profile, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'browse' | 'applications' | 'assessments'>('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const q = query(collection(db, 'jobs'));
      const snapshot = await getDocs(q);
      if (snapshot.empty && profile?.role === Role.RECRUITER) {
        const sampleJobs = [
          { title: "Senior Backend Architect", company: "TechScale AI", description: "Design high-performance distributed systems.", requiredSkills: ["System Design", "Node.js", "Java"], createdAt: new Date().toISOString() },
          { title: "Product Growth Specialist", company: "GrowthLoop", description: "Scale user acquisition through data-driven experiments.", requiredSkills: ["Data Analysis", "Growth", "Marketing"], createdAt: new Date().toISOString() },
          { title: "AI Research Engineer", company: "NeuralNet", description: "Push the boundaries of LLM evaluation and deployment.", requiredSkills: ["Machine Learning", "Python", "Problem Solving"], createdAt: new Date().toISOString() }
        ];
        for (const job of sampleJobs) {
          try {
            await addDoc(collection(db, 'jobs'), job);
          } catch (err) {
             console.error("Seeding failed", err);
          }
        }
        const freshSnapshot = await getDocs(q);
        setJobs(freshSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      } else {
        setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      }
    };

    const fetchApplications = async () => {
      if (!user) return;
      const q = query(collection(db, 'applications'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
    };

    const fetchAssessments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'assessments'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        setAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment)));
      } catch (err) {
        console.error("Failed to fetch assessments", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
    fetchApplications();
    fetchAssessments();
  }, [user, profile]);

  const applyToJob = async (jobId: string) => {
    if (!user) return;
    
    // Check if already applied
    if (applications.find(a => a.jobId === jobId)) {
      toast.error("You have already applied to this job.");
      setActiveTab('applications');
      return;
    }

    try {
      const appData = {
        jobId,
        userId: user.uid,
        status: 'round1',
        scores: {},
        updatedAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'applications'), appData);
      toast.success("Application started! Moving to Round 1.");
      setApplications([...applications, { id: docRef.id, ...appData } as any]);
      startAssessment(jobId, 1);
    } catch (e) {
      toast.error("Failed to start application.");
    }
  };

  const startAssessment = (jobId: string, round: number) => {
    setCurrentAssessment({ round, jobId });
  };

  const [currentAssessment, setCurrentAssessment] = useState<{ round: number; jobId: string } | null>(null);

  if (currentAssessment) {
    if (currentAssessment.round === 1) return <Round1 jobId={currentAssessment.jobId} onComplete={() => setCurrentAssessment(null)} />;
    if (currentAssessment.round === 2) return <Round2 jobId={currentAssessment.jobId} onComplete={() => setCurrentAssessment(null)} />;
    if (currentAssessment.round === 3) return <Round3 jobId={currentAssessment.jobId} onComplete={() => setCurrentAssessment(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#141414]/10 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-12">
          <Dna className="w-6 h-6 text-[#F27D26]" />
          <span className="font-bold tracking-tighter uppercase text-lg">ProofLayer</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'overview', icon: BarChart3, label: 'Skill DNA' },
            { id: 'browse', icon: Briefcase, label: 'Browse Jobs' },
            { id: 'applications', icon: Target, label: 'Applications' },
            { id: 'assessments', icon: History, label: 'Verified Proofs' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === item.id 
                ? 'bg-[#141414] text-white' 
                : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-gray-100 space-y-4">
          <button 
            onClick={async () => {
              if (profile) {
                await updateDoc(doc(db, 'users', profile.uid), { role: Role.RECRUITER });
                window.location.reload();
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#141414] transition-colors"
          >
            <Settings className="w-4 h-4" /> Switch to Recruiter
          </button>
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-sm font-serif italic text-gray-500 uppercase tracking-widest mb-1">Welcome back</h2>
            <h1 className="text-4xl font-bold tracking-tight text-[#141414]">{profile?.displayName}</h1>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-gray-400">Consistency</p>
              <p className="text-xl font-mono">{profile?.consistencyScore}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-gray-400">Velocity</p>
              <p className="text-xl font-mono">{profile?.learningVelocity.toFixed(1)}x</p>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 bg-white border border-[#141414]/10 p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold uppercase tracking-tight">Skill DNA Breakdown</h3>
                    <Award className="text-[#F27D26]" />
                  </div>
                  <div className="space-y-4">
                    {Object.entries(profile?.skills || {}).length > 0 ? (
                      Object.entries(profile?.skills || {}).map(([name, skill]) => (
                        <div key={name} className="space-y-2">
                          <div className="flex justify-between text-sm font-medium">
                            <span className="uppercase">{name}</span>
                            <span>{(skill as any).score}%</span>
                          </div>
                          <div className="h-2 bg-gray-100">
                            <div 
                              className="h-full bg-[#141414]" 
                              style={{ width: `${(skill as any).score}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 italic">No skill data yet. Complete an assessment to build your DNA.</p>
                    )}
                  </div>
                </div>

                <div className="bg-[#141414] text-white p-8 flex flex-col">
                  <h3 className="text-lg font-bold uppercase tracking-tight mb-8">Active Journey</h3>
                  <div className="flex-1">
                    {applications.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-xs font-bold uppercase text-gray-400">Current Top Application</p>
                        <p className="text-xl font-bold">{jobs.find(j => j.id === applications[0].jobId)?.title || 'Loading...'}</p>
                        <p className="px-3 py-1 bg-[#F27D26] text-[10px] font-bold uppercase inline-block">
                          Status: {applications[0].status}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-400 mb-6 font-medium">You haven't applied to any roles yet. Start your journey by browsing available jobs.</p>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#F27D26] hover:gap-4 transition-all mt-8"
                  >
                    Browse Jobs <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'browse' && (
            <motion.div 
              key="browse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {jobs.map(job => (
                <div key={job.id} className="bg-white border border-[#141414]/10 p-8 group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{job.title}</h3>
                      <p className="text-gray-500 font-medium">{job.company}</p>
                    </div>
                    <Briefcase className="text-gray-300 group-hover:text-[#F27D26] transition-colors" />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {job.requiredSkills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={() => applyToJob(job.id)}
                    className="w-full py-4 border border-[#141414] font-bold uppercase tracking-widest text-sm hover:bg-[#141414] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    Apply Now <Zap className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'applications' && (
            <motion.div 
              key="applications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white border border-[#141414]/10">
                <div className="p-8 border-b border-gray-100">
                   <h3 className="font-bold uppercase tracking-tight">Active Hiring Journeys</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {applications.length > 0 ? (
                    applications.map(app => {
                      const job = jobs.find(j => j.id === app.jobId);
                      return (
                        <div key={app.id} className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-[#141414] text-[#F27D26] flex items-center justify-center">
                               <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                               <h4 className="font-bold text-lg mb-1">{job?.title || 'Unknown Role'}</h4>
                               <p className="text-xs font-bold uppercase text-gray-400">{job?.company || 'Unknown Company'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-12">
                             <div className="flex flex-col items-center">
                                <div className="flex gap-1 mb-2">
                                  {[1, 2, 3].map(r => (
                                    <div 
                                      key={r}
                                      className={`w-4 h-1 ${app.status === `round${r}` ? 'bg-[#F27D26]' : 'bg-gray-100'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tighter">Current: {app.status}</span>
                             </div>

                             <button 
                               onClick={() => {
                                 const round = parseInt(app.status.replace('round', '')) || 1;
                                 startAssessment(app.jobId, round);
                               }}
                               className="px-6 py-3 bg-[#141414] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-colors"
                             >
                               Continue {app.status.toUpperCase()}
                             </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-gray-400 italic">No active applications. Browse jobs to get started.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'assessments' && (
            <motion.div 
              key="assessments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Verified Proofs</h3>
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Evidence based skill verification history</p>
                </div>
                <div className="bg-[#141414] text-white p-6 shadow-xl flex gap-12">
                   <div className="text-center">
                      <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Consistency Score</p>
                      <p className="text-4xl font-mono font-black text-[#F27D26]">{profile?.consistencyScore}%</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Proof Points</p>
                      <p className="text-4xl font-mono font-black">{assessments.length}</p>
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                {loading ? (
                   <div className="flex flex-col items-center py-20 text-gray-400">
                     <Loader2 className="animate-spin mb-4" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Compiling Evidence...</span>
                   </div>
                ) : assessments.length > 0 ? (
                  assessments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(acc => (
                    <div key={acc.id} className="bg-white border border-[#141414]/10 p-8 space-y-8 hover:shadow-lg transition-all group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="px-2 py-0.5 bg-[#141414] text-white text-[8px] font-bold uppercase tracking-widest">Round {acc.round}</span>
                             <span className="text-[10px] font-black uppercase tracking-tight text-[#F27D26]">{acc.type}</span>
                          </div>
                          <h4 className="font-bold text-2xl uppercase tracking-tighter">{acc.taskId.split('-').join(' ')}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(acc.createdAt).toLocaleDateString()} at {new Date(acc.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                           <div className="text-5xl font-black tracking-tighter text-[#141414]">{acc.aiEvaluation?.score || 0}</div>
                           <div className="text-[8px] font-bold uppercase text-gray-400 tracking-widest">AI Result</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-gray-100">
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <Target className="w-3 h-3 text-[#141414]" />
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Your Attempt</h5>
                           </div>
                           <div className="bg-gray-50 p-6 text-sm font-medium text-gray-600 border border-gray-100 max-h-48 overflow-y-auto scrollbar-thin">
                              {acc.type === 'inquiry' ? (
                                <ul className="list-disc pl-4 space-y-2">
                                   {(acc.userInput.questions || []).map((q: string, i: number) => <li key={i}>{q}</li>)}
                                </ul>
                              ) : (
                                <p className="whitespace-pre-wrap">{acc.userInput.response || JSON.stringify(acc.userInput)}</p>
                              )}
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <BrainCircuit className="w-3 h-3 text-[#F27D26]" />
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#F27D26]">AI Proof Feedback</h5>
                           </div>
                           <div className="prose prose-sm max-w-none text-sm font-medium text-gray-600 bg-white border border-gray-100 p-6 max-h-48 overflow-y-auto scrollbar-thin shadow-inner">
                              <ReactMarkdown>{acc.aiEvaluation?.feedback || acc.aiEvaluation?.analysis || 'Analysis complete. Verified.'}</ReactMarkdown>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-[#141414]/10 p-20 text-center space-y-6">
                    <History className="w-16 h-16 mx-auto text-gray-200" />
                    <div>
                      <h4 className="font-bold uppercase text-lg">No Proofs Found</h4>
                      <p className="text-gray-400 text-sm max-w-xs mx-auto">Complete your first hiring round to generate verified skill DNA evidence.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('browse')}
                      className="px-8 py-3 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-colors"
                    >
                      Browse Jobs
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
