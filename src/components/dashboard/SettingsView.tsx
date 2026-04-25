import React from 'react';
import { Bell, Lock, Eye, Globe, Sliders, Smartphone } from 'lucide-react';

export default function SettingsView() {
  const sections = [
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        { label: 'Job Alerts', description: 'Get notified when new roles match your DNA', enabled: true },
        { label: 'Assessment Feedback', description: 'Receive detailed AI insights after each round', enabled: true },
        { label: 'Platform Events', description: 'General announcements and feature updates', enabled: false }
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Lock,
      settings: [
        { label: 'Public Profile', description: 'Allow recruiters to find your Skill DNA in talent pool', enabled: true },
        { label: 'Data Sharability', description: 'Share anonymized DNA data for industry benchmarks', enabled: true },
        { label: 'Two-Factor Auth', description: 'Add an extra layer of security to your account', enabled: false }
      ]
    },
    {
      title: 'Preferences',
      icon: Sliders,
      settings: [
        { label: 'Dark Mode', description: 'Toggle between light and midnight themes', enabled: false },
        { label: 'Auto-Start Assessments', description: 'Jump straight into Round 1 after applying', enabled: false }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-12">
      <header>
        <h1 className="text-4xl font-black uppercase tracking-tighter">Account Settings</h1>
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-2">Manage your platform experience and security</p>
      </header>

      <div className="space-y-12">
        {sections.map((section, idx) => (
          <section key={idx} className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400">
              <section.icon className="w-4 h-4" /> {section.title}
            </h3>
            <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {section.settings.map((setting, sIdx) => (
                  <div key={sIdx} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">{setting.label}</h4>
                      <p className="text-xs text-gray-400 font-medium">{setting.description}</p>
                    </div>
                    <button 
                      className={`w-12 h-6 rounded-full relative transition-colors ${setting.enabled ? 'bg-[#F27D26]' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${setting.enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <div className="pt-8 border-t border-red-50 space-y-6">
           <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Danger Zone</h3>
           <div className="bg-red-50 border border-red-100 p-8 flex justify-between items-center">
              <div>
                 <h4 className="text-sm font-bold text-red-600">Delete Account</h4>
                 <p className="text-xs text-red-400 font-medium whitespace-nowrap">This will permanently erase your Skill DNA and assessment history</p>
              </div>
              <button className="px-6 py-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors">
                 Destroy Data
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
