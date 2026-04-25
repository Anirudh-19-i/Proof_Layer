import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Send, BrainCircuit, ChevronLeft, Loader2 } from 'lucide-react';
import { evaluateSkill } from '../../lib/gemini';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { notificationService } from '../../services/notificationService';
import SkillRadarChart from '../ui/SkillRadarChart';

interface Round1Props {
  jobId: string;
  onComplete: () => void;
}

const SAMPLE_TASK = "Problem: We need to design a system that handles 10,000 requests per second. The current database is struggling with write operations. Propose a high-level architecture to solve this, focusing on scalability and data consistency.";

export default function Round1({ jobId, onComplete }: Round1Props) {
  const { user, profile } = useAuth();
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setLoading(true);
    try {
      const evaluation = await evaluateSkill(SAMPLE_TASK, response, 1);
      
      // Save to Firestore
      await addDoc(collection(db, 'assessments'), {
        userId: user?.uid,
        jobId,
        round: 1,
        type: 'micro-task',
        taskId: 'architecture-101',
        userInput: { response },
        aiEvaluation: evaluation,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // Update user skills/DNA
      if (profile) {
        const updatedSkills = { ...profile.skills };
        updatedSkills['System Design'] = {
          id: 'system-design',
          name: 'System Design',
          level: evaluation.score > 80 ? 'advanced' : evaluation.score > 50 ? 'intermediate' : 'beginner',
          score: evaluation.score,
          history: [...(profile.skills['System Design']?.history || []), { date: new Date().toISOString(), score: evaluation.score }]
        };

        await updateDoc(doc(db, 'users', user!.uid), {
          skills: updatedSkills,
          consistencyScore: Math.min(100, (profile.consistencyScore + 10) / 1.1),
          learningVelocity: (profile.learningVelocity + 0.1)
        });

        // Advance Application to Round 2
        const appQuery = query(collection(db, 'applications'), where('userId', '==', user.uid), where('jobId', '==', jobId));
        const appSnap = await getDocs(appQuery);
        if (!appSnap.empty) {
          const appDoc = appSnap.docs[0];
          const appData = appDoc.data();
          await updateDoc(doc(db, 'applications', appDoc.id), {
            status: 'round2',
            updatedAt: new Date().toISOString(),
            [`scores.${1}`]: evaluation.score
          });

          // Trigger notification
          const jobSnap = await getDoc(doc(db, 'jobs', jobId));
          const jobData = jobSnap.data();
          
          await notificationService.notifyRecruiter({
            recruiterId: 'all',
            type: 'candidate_progress',
            candidateId: user!.uid,
            candidateName: profile.displayName,
            jobId: jobId,
            jobTitle: jobData?.title || 'Unknown Job',
            round: 'Round 2'
          });
        }
      }

      setResult(evaluation);
      toast.success('Assessment completed!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit assessment.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] p-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full bg-white border border-[#141414]/10 p-12 shadow-xl"
        >
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold uppercase tracking-tight">Assessment Result</h2>
            <div className="text-6xl font-black text-[#F27D26]">{result.score}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 items-center">
            <div className="bg-gray-50 p-6 shadow-inner border border-gray-100 flex items-center justify-center">
               <SkillRadarChart />
            </div>
            
            <div className="space-y-6">
              {Object.entries(result.metrics).map(([key, val]: [string, any]) => (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase text-gray-400">{key}</p>
                    <p className="text-[10px] font-bold text-[#141414]">{val}%</p>
                  </div>
                  <div className="h-1 bg-gray-100">
                    <div className="h-full bg-[#141414]" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="prose prose-sm max-w-none mb-12">
            <h3 className="uppercase text-xs font-bold tracking-widest text-[#F27D26] mb-4">AI Feedback</h3>
            <div className="bg-gray-50 p-6 border-l-4 border-[#141414]">
              <ReactMarkdown>{result.feedback}</ReactMarkdown>
            </div>
          </div>

          <button 
            onClick={onComplete}
            className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm hover:gap-4 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col">
      <header className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onComplete} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Round 1</h4>
            <h3 className="font-bold">System Architecture Micro-Task</h3>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm font-mono text-gray-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>15:00</span>
          </div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#F27D26]" />
            <span>AI Evaluation Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-10 flex gap-8">
        <div className="w-1/3 space-y-6">
          <div className="bg-white border border-[#141414]/10 p-8 shadow-sm">
            <h3 className="font-bold uppercase text-xs tracking-widest mb-6 border-b pb-4">Task Description</h3>
            <p className="text-gray-600 leading-relaxed font-medium">
              {SAMPLE_TASK}
            </p>
          </div>
          <div className="p-8 border border-dashed border-gray-300 rounded-lg">
             <h4 className="text-xs font-bold uppercase text-gray-400 mb-4">Guidelines</h4>
             <ul className="text-xs space-y-3 font-medium text-gray-500">
               <li>• Focus on high-level components</li>
               <li>• Mention specific technologies (optional but encouraged)</li>
               <li>• Address both scaling and consistency</li>
               <li>• Response should be around 200-500 words</li>
             </ul>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your solution here..."
            className="flex-1 p-10 bg-white border border-[#141414]/10 shadow-sm resize-none font-mono text-sm focus:outline-none focus:border-[#F27D26] transition-colors"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading || !response.trim()}
              className="px-10 py-5 bg-[#141414] text-white font-bold uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-[#F27D26] transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Submit Verification
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
