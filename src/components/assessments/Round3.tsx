import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Send, BrainCircuit, ChevronLeft, Loader2, ListPlus, CheckCircle } from 'lucide-react';
import { generateInquiryTask, evaluateSkill } from '../../lib/gemini';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthProvider';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { notificationService } from '../../services/notificationService';
import SkillRadarChart from '../ui/SkillRadarChart';

interface Round3Props {
  jobId: string;
  onComplete: () => void;
}

export default function Round3({ jobId, onComplete }: Round3Props) {
  const { user, profile } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const newTask = await generateInquiryTask();
        setTask(newTask);
      } catch (e) {
        toast.error("Failed to generate task");
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, []);

  const addQuestion = () => {
    if (!currentQuestion.trim()) return;
    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion('');
  };

  const submitInquiry = async () => {
    if (questions.length === 0) return;
    setEvaluating(true);
    try {
      const prompt = `
        The candidate was given this incomplete scenario: "${task.scenario}".
        They asked these questions to complete the picture:
        ${questions.map((q, i) => `${i+1}. ${q}`).join('\n')}
        
        Evaluate the quality of their inquiry. Did they identify the critical missing points: ${task.criticalMissingPoints.join(', ')}?
      `;
      
      const evaluation = await evaluateSkill(prompt, questions.join('\n'), 3);
      
      await addDoc(collection(db, 'assessments'), {
        userId: user?.uid,
        jobId,
        round: 3,
        type: 'inquiry',
        taskId: 'inquiry-bridge-1',
        userInput: { questions },
        aiEvaluation: evaluation,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // Update Application Status to Offered (Success)
      if (user) {
        const appQuery = query(collection(db, 'applications'), where('userId', '==', user.uid), where('jobId', '==', jobId));
        const appSnap = await getDocs(appQuery);
        if (!appSnap.empty) {
          const appDoc = appSnap.docs[0];
          await updateDoc(doc(db, 'applications', appDoc.id), {
            status: 'offered',
            updatedAt: new Date().toISOString(),
            [`scores.${3}`]: evaluation.score
          });

          // Trigger notification
          const jobSnap = await getDoc(doc(db, 'jobs', jobId));
          const jobData = jobSnap.data();
          
          await notificationService.notifyRecruiter({
            recruiterId: 'all',
            type: 'candidate_progress',
            candidateId: user!.uid,
            candidateName: profile?.displayName || 'Unknown Candidate',
            jobId: jobId,
            jobTitle: jobData?.title || 'Unknown Job',
            round: 'Offered'
          });
        }
      }

      setResult(evaluation);
      toast.success("Inquiry submission evaluated!");
    } catch (e) {
      toast.error("Evaluation failed");
    } finally {
      setEvaluating(false);
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
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-tight">Inquiry Profile</h2>
              <p className="text-sm text-gray-500 italic">How you bridge gaps in information</p>
            </div>
            <div className="text-6xl font-black text-[#F27D26]">{result.score}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 items-center">
            <div className="bg-gray-50 p-6 shadow-inner border border-gray-100 flex items-center justify-center">
               <SkillRadarChart />
            </div>
            
            <div className="space-y-6">
              {Object.entries(result.metrics || {}).map(([key, val]: [string, any]) => (
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

          <div className="bg-gray-50 p-8 border-l-4 border-[#141414] mb-12">
            <h3 className="uppercase text-xs font-bold tracking-widest text-gray-500 mb-4">Inquiry Depth Analysis</h3>
            <div className="space-y-6">
               <div className="markdown-body text-sm leading-relaxed prose prose-neutral">
                 <ReactMarkdown>{result.feedback}</ReactMarkdown>
               </div>
            </div>
          </div>

          <button 
            onClick={onComplete}
            className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm hover:gap-4 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Finalize Application
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#141414] flex items-center justify-center rounded-sm">
                <HelpCircle className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Round 3</h4>
              <h3 className="font-bold uppercase tracking-tight">The Inquiry Bridge</h3>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-10 overflow-y-auto">
        <div className="max-w-4xl w-full space-y-10">
          {/* Scenario Card */}
          <div className="bg-white border border-[#141414]/10 p-12">
            {loading ? (
               <div className="flex flex-col items-center py-10">
                 <Loader2 className="w-8 h-8 animate-spin text-[#F27D26] mb-4" />
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Generating Incomplete Scenario...</p>
               </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#F27D26]">Incomplete Scenario</h2>
                <p className="text-2xl font-serif leading-snug">
                  "{task?.scenario}"
                </p>
                <div className="pt-8 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 leading-relaxed italic">
                    The prompt above is missing critical information you would need to execute effectively. 
                    Ask as many questions as you need to uncover the hidden variables. Quality over Quantity.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Question Builder */}
          <div className="space-y-6">
            <div className="flex gap-4">
              <input 
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                placeholder="What else do you need to know?"
                className="flex-1 px-8 py-5 bg-white border border-[#141414]/10 rounded-none shadow-sm font-medium text-lg focus:outline-none focus:border-[#F27D26] transition-colors"
              />
              <button 
                onClick={addQuestion}
                className="px-10 py-5 bg-[#141414] text-white font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#F27D26] transition-colors"
              >
                Add Question <ListPlus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 bg-white border border-[#141414]/5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                       <span className="text-xs font-bold text-gray-300">Q{i+1}</span>
                       <span className="font-medium text-gray-700">{q}</span>
                    </div>
                    <button 
                      onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                      className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {questions.length > 0 && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={submitInquiry}
                  disabled={evaluating}
                  className="px-12 py-5 bg-[#F27D26] text-white font-black uppercase tracking-[0.2em] text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-lg"
                >
                  {evaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Submit Inquiry for Evaluation
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
