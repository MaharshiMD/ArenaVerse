import React, { useState } from 'react';
import { BookOpen, ShieldAlert, Award, FileText, Landmark, UserCheck } from 'lucide-react';
import './SupportPages.css';

const Rules = () => {
  const [activeTab, setActiveTab] = useState('conduct');

  const tabs = [
    { id: 'conduct', name: 'General Conduct', icon: ShieldAlert },
    { id: 'registration', name: 'Registration & Squads', icon: UserCheck },
    { id: 'disputes', name: 'Match Disputes', icon: Landmark },
    { id: 'organizers', name: 'Organizers Manual', icon: FileText },
  ];

  return (
    <div className="support-page container">
      <div className="support-header text-center">
        <h1>Fair Play & Regulations</h1>
        <p className="support-subtitle">The official handbook governing tournament operations and squad ethics in Arena-Verse.</p>
      </div>

      <div className="rules-grid">
        <aside className="rules-sidebar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`rules-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </aside>

        <main className="rules-content-card">
          {activeTab === 'conduct' && (
            <div>
              <h2><ShieldAlert size={24} className="text-primary" /> General Conduct & Ethics</h2>
              
              <div className="rule-section-block">
                <h3>1. Sportsmanship & Respect</h3>
                <p>
                  All competitors, captains, and organizers are expected to maintain professional standards of respect. 
                  Hate speech, personal insults, racism, sexism, or general toxicity will result in an immediate and permanent account suspension.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>2. Fair Play & Anti-Cheat</h3>
                <p>
                  Any use of external hacking utilities, scripts, map-hacks, macro tools, aimbots, or third-party performance assistance is strictly prohibited. 
                  Competing squads found utilizing these utilities will be disqualified, their match scores reversed, and their accounts banned.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>3. Smurfing & Multi-Accounts</h3>
                <p>
                  Players may only register and compete using their primary account. Utilizing secondary smurf accounts to bypass bracket restrictions, 
                  hide competitive ratings, or play in multiple squads simultaneously will result in team disqualification.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'registration' && (
            <div>
              <h2><UserCheck size={24} className="text-primary" /> Registration & Squads</h2>

              <div className="rule-section-block">
                <h3>1. Squad Composition</h3>
                <p>
                  For team tournaments, squad rosters must be fully locked prior to bracket generation. 
                  No roster substitutions or stand-ins are allowed unless specifically approved by the tournament organizer in writing prior to the match starting.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>2. Player Eligibility</h3>
                <p>
                  Competitors must satisfy any game-specific requirements specified in the tournament overview page (e.g., minimum level, platform restrictions, regional eligibility). 
                  Joining a tournament with incorrect profile credentials will result in a match forfeit.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>3. No-Show & Check-In Window</h3>
                <p>
                  Teams must check in within 15 minutes of the scheduled match starting time. 
                  Failure to present a full squad roster in the match lobby after this window will result in an automatic walkover victory for the opposing squad.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <div>
              <h2><Landmark size={24} className="text-primary" /> Match Disputes & Score Claims</h2>

              <div className="rule-section-block">
                <h3>1. Submitting Proof</h3>
                <p>
                  In the event of a dispute regarding a match score or outcome, team captains must submit clear, unedited screenshots or video recordings of the endgame screen. 
                  Proof must show the final scoreboard, matching player tags, and the date/time of completion.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>2. Dispute Window</h3>
                <p>
                  Match disputes must be filed within 30 minutes of match completion via the tournament lobby or organizer contact portal. 
                  Claims submitted after this window will not be reviewed, and the recorded bracket score will stand as final.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>3. Connection Issues & Server Lag</h3>
                <p>
                  Teams are responsible for their network connection stability. 
                  Matches will not be paused or restarted due to client lag or individual disconnection unless server-wide outages occur.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'organizers' && (
            <div>
              <h2><FileText size={24} className="text-primary" /> Organizers Handbook</h2>

              <div className="rule-section-block">
                <h3>1. Bracket Integrity</h3>
                <p>
                  Organizers must generate brackets in a fair and transparent manner, using either the Single Elimination or Double Elimination templates provided by Arena-Verse. 
                  Manual seeding changes must be clearly communicated to all participating captains beforehand.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>2. Timely Match Updates</h3>
                <p>
                  Organizers are responsible for auditing match scores and advancing winners in a timely manner. 
                  Unresolved disputes should be settled within 2 hours of receipt to avoid halting the progression of the overall bracket.
                </p>
              </div>

              <div className="rule-section-block">
                <h3>3. Prize Distribution</h3>
                <p>
                  Prize pools must be distributed exactly as advertised on the tournament overview page. 
                  Failure to fulfill reward obligations will result in the loss of organizer privileges and removal from the Arena-Verse network.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Rules;
