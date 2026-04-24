import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { UserProfile, Job, Assessment, Role } from '../../types';
import { 
  Users, Briefcase, BarChart3, Filter, 
  Search, ExternalLink, Mail, Award,
  CheckCircle2, AlertTriangle, TrendingUp,
  Settings, Loader2, BrainCircuit, Zap, Shield,
  History, MessageSquare, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';

export default function RecruiterDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'candidates' | 'jobs' | 'analytics'>('candidates');
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [candidateAssessments, setCandidateAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [verifyingSkill, setVerifyingSkill] = useState<string | null>(null);

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

    fetchCandidates();
    fetchJobs();
  }, []);

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
                    <h4 className="font-bold truncate">{c.displayName}</h4>
                    <p className="text-[10px] font-bold uppercase text-gray-400 truncate">{c.email}</p>
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
                        <span className="px-3 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                           <Award className="w-3 h-3" /> Top 10%
                        </span>
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
                             <div key={acc.id} className="bg-gray-50 border border-gray-100 p-8 space-y-6 hover:shadow-lg transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                   <Award className="w-12 h-12" />
                                </div>
                                
                                <div className="flex justify-between items-start">
                                   <div>
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-0.5 bg-[#141414] text-white text-[8px] font-bold uppercase tracking-widest">Round {acc.round}</span>
                                        <span className="text-[10px] font-black uppercase tracking-tight text-[#F27D26]">{acc.type}</span>
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
                          ))
                        )}
                        {candidateAssessments.length === 0 && !loading && (
                          <div className="py-12 text-center text-gray-400 italic">No verified proof points yet.</div>
                        )}
                      </div>
                   </div>

                   <div className="space-y-6">
                     <div className="bg-[#141414] text-white p-8 space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Skill DNA Strength</h3>
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
                              <div className="flex justify-between items-center opacity-0 group-hover/skill:opacity-100 transition-opacity pt-1">
                                 <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Verified Level: {skill.level}</span>
                                 <button 
                                   onClick={() => requestVerification(name)}
                                   disabled={verifyingSkill === name}
                                   className="text-[8px] font-black uppercase text-[#F27D26] hover:underline flex items-center gap-1"
                                 >
                                   {verifyingSkill === name ? <Loader2 className="w-2 h-2 animate-spin" /> : <Zap className="w-2 h-2" />}
                                   Re-Verify Proof
                                 </button>
                              </div>
                            </div>
                          ))}
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
                            <span className="text-[10px] font-bold uppercase text-gray-400">Application State</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest">Active Journey</span>
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

                  <button 
                    onClick={() => setActiveTab('candidates')}
                    className="w-full py-4 border border-[#141414] font-bold uppercase tracking-widest text-[10px] hover:bg-[#141414] hover:text-white transition-all"
                  >
                    View Pipeline
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="flex-1 p-12 overflow-y-auto bg-[#F5F5F4]">
          <div className="max-w-5xl mx-auto space-y-12">
            <header>
               <h1 className="text-4xl font-black uppercase tracking-tighter">Hiring Insights</h1>
               <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-2">Real-time assessment efficacy & pipeline velocity</p>
            </header>

            <div className="grid grid-cols-4 gap-6">
               {[
                 { label: 'Avg Interview Score', value: '78%', trend: '+4%' },
                 { label: 'Time to Verified', value: '4.2 Days', trend: '-1.2d' },
                 { label: 'Candidate Velocity', value: '1.8x', trend: '+0.2' },
                 { label: 'Offer Acceptance', value: '92%', trend: '+2%' },
               ].map(stat => (
                 <div key={stat.label} className="bg-white p-6 border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-4">{stat.label}</div>
                    <div className="text-3xl font-black">{stat.value}</div>
                    <div className={`text-[10px] font-bold uppercase mt-2 ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-blue-500'}`}>{stat.trend} from last month</div>
                 </div>
               ))}
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
    </div>
  );
}
