import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { User, Mail, Shield, Award, Calendar, ExternalLink, ThumbsUp, Loader2, BookmarkCheck, Bookmark } from 'lucide-react';
import { UserProfile, Endorsement } from '../../types';
import toast from 'react-hot-toast';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

const CustomPolarAngleAxis = ({ payload, x, y, cx, cy, ...rest }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x="-50"
        y="-12"
        width="100"
        height="24"
        rx="12"
        fill="white"
        stroke="#141414"
        strokeWidth="2"
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        style={{
          fill: '#141414',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {payload.value}
      </text>
    </g>
  );
};

export default function ProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [endorsing, setEndorsing] = useState<string | null>(null);

  const targetUserId = userId || currentUser?.uid;

  useEffect(() => {
    async function fetchProfile() {
      if (!targetUserId) return;
      try {
        const docRef = doc(db, 'users', targetUserId);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${targetUserId}`);
          return;
        }

        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          console.warn('Profile document does not exist for ID:', targetUserId);
        }

        try {
          const endoQuery = query(collection(db, 'endorsements'), where('recipientId', '==', targetUserId));
          const endoSnap = await getDocs(endoQuery);
          setEndorsements(endoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Endorsement)));
        } catch (endoError) {
          console.error('Error fetching endorsements:', endoError);
          // Don't fail the whole profile view if endorsements fail
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [targetUserId]);

  const toggleEndorsement = async (skillId: string) => {
    if (!currentUser || !currentProfile || !targetUserId || targetUserId === currentUser.uid) return;
    
    setEndorsing(skillId);
    try {
      const existing = endorsements.find(e => e.endorserId === currentUser.uid && e.skillId === skillId);
      
      if (existing) {
        await deleteDoc(doc(db, 'endorsements', existing.id));
        setEndorsements(prev => prev.filter(e => e.id !== existing.id));
        toast.success('Endorsement removed');
      } else {
        const endoData = {
          endorserId: currentUser.uid,
          endorserName: currentProfile.displayName,
          recipientId: targetUserId,
          skillId,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'endorsements'), endoData);
        setEndorsements(prev => [...prev, { id: docRef.id, ...endoData } as Endorsement]);
        toast.success(`Endorsed for ${skillId}`);
      }
    } catch (error) {
      console.error('Error toggling endorsement:', error);
      toast.error('Failed to update endorsement');
    } finally {
      setEndorsing(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#F27D26]" />
    </div>
  );

  if (!profile) return (
    <div className="max-w-4xl mx-auto py-12 text-center">
      <h2 className="text-2xl font-bold uppercase">Profile Not Found</h2>
      <Link to="/" className="text-[#F27D26] mt-4 inline-block hover:underline">Back to Dashboard</Link>
    </div>
  );

  const isOwnProfile = profile.uid === currentUser?.uid;

  const chartData = Object.entries(profile.skills || {}).map(([_, skill]) => ({
    subject: skill.name,
    score: skill.score,
    fullMark: 100,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-12">
      <header className="flex justify-between items-end flex-wrap gap-8">
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 bg-white border border-[#141414]/10 p-2 shadow-sm relative group">
            {profile.photoURL ? (
              <img src={profile.photoURL} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-5xl font-bold text-gray-300">
                {profile.displayName[0]}
              </div>
            )}
            {isOwnProfile && (
              <div className="absolute inset-0 bg-[#F27D26]/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold uppercase tracking-widest">
                Upload New
              </div>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase">{profile.displayName}</h1>
            <div className="flex gap-4 items-center flex-wrap">
              <span className="px-3 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                 <Shield className="w-3 h-3" /> {profile.role}
              </span>
              <span className="text-sm font-medium text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" /> {profile.email}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-12 border-l border-gray-100 pl-12">
           <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">DNA Consistency</p>
              <p className="text-3xl font-mono">{profile.consistencyScore || 0}%</p>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Learning Velocity</p>
              <p className="text-3xl font-mono text-[#F27D26]">{(profile.learningVelocity || 1).toFixed(1)}x</p>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {chartData.length > 0 && (
            <section className="bg-white border border-gray-100 p-8 shadow-sm space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] border-b pb-4">
                Skill DNA Analysis
              </h3>
              <div className="h-[400px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                    <PolarGrid stroke="#141414" strokeWidth={2} strokeOpacity={0.15} />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={<CustomPolarAngleAxis />}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#F27D26"
                      strokeWidth={4}
                      fill="#F27D26"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="bg-white border border-gray-100 p-8 shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] border-b pb-4 flex justify-between items-center">
              Skill DNA & Endorsements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(profile.skills || {}).map(([id, skill]) => {
                const skillEndorsements = endorsements.filter(e => e.skillId === id);
                const hasEndorsed = endorsements.some(e => e.skillId === id && e.endorserId === currentUser?.uid);
                
                return (
                  <div key={id} className="border border-gray-100 p-4 space-y-3 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm uppercase">{skill.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{skill.level}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono">{skill.score}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex -space-x-2 overflow-hidden">
                        {skillEndorsements.slice(0, 3).map((e, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-bold" title={e.endorserName}>
                            {e.endorserName[0]}
                          </div>
                        ))}
                        {skillEndorsements.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-500">
                            +{skillEndorsements.length - 3}
                          </div>
                        )}
                        {skillEndorsements.length === 0 && (
                          <span className="text-[10px] text-gray-300 font-medium italic">No endorsements</span>
                        )}
                      </div>
                      
                      {!isOwnProfile && (
                        <button
                          onClick={() => toggleEndorsement(id)}
                          disabled={!!endorsing}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                            hasEndorsed 
                            ? 'bg-[#F27D26] text-white' 
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {endorsing === id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ThumbsUp className={`w-3 h-3 ${hasEndorsed ? 'fill-white' : ''}`} />
                          )}
                          {hasEndorsed ? 'Endorsed' : 'Endorse'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white border border-gray-100 p-8 shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] border-b pb-4 flex justify-between items-center">
              Personal Bio
              {isOwnProfile && <button className="text-[10px] text-[#F27D26] hover:underline">Edit</button>}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed italic">
              "Passionate software professional focused on system architecture and product-led growth. Constantly validating my Skill DNA through rigorous assessment proof points."
            </p>
          </section>
        </div>

        <div className="space-y-6">
           <section className="bg-[#141414] text-white p-8 space-y-6">
             <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Connected Accounts</h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                 <span className="text-gray-500">GitHub</span>
                 <span className="text-[#F27D26]">Connected</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                 <span className="text-gray-500">LinkedIn</span>
                 <span className="text-[#F27D26]">Connected</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                 <span className="text-gray-500">Twitter</span>
                 <button className="hover:text-white transition-colors">Connect</button>
               </div>
             </div>
           </section>

           <section className="bg-white border border-gray-100 p-8 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Membership</h3>
              <div className="flex items-center gap-3 text-[#F27D26]">
                 <Award className="w-5 h-5" />
                 <span className="text-xs font-bold uppercase tracking-widest">Elite Tier</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">This profile is in the top 5% of active candidates this week.</p>
           </section>
        </div>
      </div>
    </div>
  );
}
