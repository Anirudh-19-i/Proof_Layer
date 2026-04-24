import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, MessageSquare, ChevronLeft, Loader2, Send, Zap } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../auth/AuthProvider';
import toast from 'react-hot-toast';

interface Round2Props {
  jobId: string;
  onComplete: () => void;
}

export default function Round2({ jobId, onComplete }: Round2Props) {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sessionId = `${jobId}-panel-1`; // Simple static ID for demo

  useEffect(() => {
    const docRef = doc(db, 'panel_sessions', sessionId);
    
    const initializeAndJoin = async () => {
      if (!user || !profile) return;
      
      try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            jobId,
            participants: [{ uid: user.uid, name: profile.displayName }],
            messages: [],
            caseStudy: "Scenario: A major data breach just occurred. Your team (Security, PR, Engineering) must decide the first 3 steps in the next 60 minutes. Collaborate and reach a consensus.",
            status: 'active',
            createdAt: new Date().toISOString()
          });
        } else {
          await updateDoc(docRef, {
            participants: arrayUnion({ uid: user.uid, name: profile.displayName })
          });
        }
      } catch (err) {
        console.error("Session init failed", err);
      }
    };

    initializeAndJoin();

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSession(docSnap.data());
      }
    });

    return unsub;
  }, [user, profile, jobId, sessionId]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await updateDoc(doc(db, 'panel_sessions', sessionId), {
        messages: arrayUnion({
          uid: user?.uid,
          name: profile?.displayName,
          text: message,
          timestamp: new Date().toISOString()
        })
      });
      setMessage('');
    } catch (e) {
      toast.error("Failed to send message");
    }
  };

  const completeRound2 = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const appQuery = query(collection(db, 'applications'), where('userId', '==', user.uid), where('jobId', '==', jobId));
      const appSnap = await getDocs(appQuery);
      if (!appSnap.empty) {
        await updateDoc(doc(db, 'applications', appSnap.docs[0].id), {
          status: 'round3',
          updatedAt: new Date().toISOString()
        });
      }
      toast.success("Round 2 Completed! Moving to Round 3.");
      onComplete();
    } catch (e) {
      toast.error("Failed to complete round");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col">
      <header className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onComplete} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Round 2</h4>
            <h3 className="font-bold">Collaborative Panel Case Study</h3>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {session?.participants?.map((p: any) => (
             <div key={p.uid} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               <span className="text-xs font-bold uppercase tracking-tighter">{p.name}</span>
             </div>
           ))}
           <button 
             onClick={completeRound2}
             disabled={loading}
             className="ml-4 px-4 py-2 bg-[#F27D26] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] transition-colors disabled:opacity-50"
           >
             {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Finalize Selection'}
           </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Case Study Sidebar */}
        <div className="w-1/3 p-10 bg-white border-r border-[#141414]/10 overflow-y-auto">
          <div className="space-y-8">
            <div>
              <h3 className="font-bold uppercase text-xs tracking-widest mb-6 border-b pb-4">The Scenario</h3>
              <div className="p-6 bg-[#F27D26]/5 border-l-4 border-[#F27D26] text-sm leading-relaxed font-medium">
                {session?.caseStudy}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold uppercase text-xs tracking-widest">Panel Objectives</h3>
              <ul className="text-sm space-y-4">
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold">1</div>
                  <span>Identify immediate technical safeguards</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold">2</div>
                  <span>Draft a public transparency statement</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold">3</div>
                  <span>Propose a long-term preventive roadmap</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Chat / Collaboration Area */}
        <div className="flex-1 flex flex-col bg-gray-50/50">
          <div className="flex-1 p-10 overflow-y-auto space-y-6">
            {session?.messages?.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium italic">Start the discussion. How should we proceed?</p>
              </div>
            )}
            {session?.messages?.map((msg: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: msg.uid === user?.uid ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex flex-col ${msg.uid === user?.uid ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] font-bold uppercase text-gray-400 mb-1">{msg.name}</span>
                <div className={`max-w-[80%] p-4 rounded-none shadow-sm ${
                  msg.uid === user?.uid 
                  ? 'bg-[#141414] text-white rounded-l-xl rounded-tr-xl' 
                  : 'bg-white border border-gray-200 rounded-r-xl rounded-tl-xl'
                }`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-6 bg-white border-t border-gray-100 flex gap-4">
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Suggest a move or discuss with the panel..."
              className="flex-1 px-6 py-4 bg-gray-50 border-none focus:ring-1 focus:ring-[#F27D26] outline-none rounded-none font-medium italic"
            />
            <button 
              onClick={sendMessage}
              className="px-8 py-4 bg-[#141414] text-white font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#F27D26] transition-colors"
            >
              Send <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
