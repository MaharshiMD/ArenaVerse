import React from 'react';
import { Target, Users, Code, Activity, ShieldAlert, Cpu } from 'lucide-react';
import './About.css';

const About = () => {
  return (
    <div className="about-page container">
      <div className="text-center mb-4 mt-4">
        <h1 className="section-title">About Arena-Verse</h1>
        <p className="section-subtitle">Empowering gamers and organizers with next-gen automated tools.</p>
      </div>

      {/* Grid Mission */}
      <section className="about-grid grid-3 mb-4">
        <div className="glass-panel text-center">
          <Target className="about-icon text-indigo" />
          <h3>Our Mission</h3>
          <p>To eliminate manual spreadsheet admin work, discord messaging updates, and scheduling conflicts in community gaming tournaments.</p>
        </div>

        <div className="glass-panel text-center">
          <Cpu className="about-icon text-purple" />
          <h3>AI-Powered Core</h3>
          <p>Automated round progressions and bye seed distribution make bracket generation mathematical and error-free.</p>
        </div>

        <div className="glass-panel text-center">
          <Activity className="about-icon text-pink" />
          <h3>Real-Time Live Updates</h3>
          <p>Built with Socket.io WebSockets, live updates propagate instantly to all active player screens without browser reload.</p>
        </div>
      </section>

      {/* Platform objectives */}
      <section className="objectives-section glass-panel mb-4">
        <h2>Key Platform Objectives</h2>
        <ul className="objectives-list">
          <li>
            <strong>1. Secure Auth Systems:</strong> Role-based access keys specifically engineered for platform Admins, Organizers, and Players.
          </li>
          <li>
            <strong>2. Custom Tournaments:</strong> Organizers customize limits, rules, start times, entry fees, prize values, and solo/team format options.
          </li>
          <li>
            <strong>3. Advanced Bracket Tree:</strong> Generates fully compliant single and double elimination charts supporting mathematical bye seeds.
          </li>
          <li>
            <strong>4. Match & Standings Tracker:</strong> Instant score reporting, automated participant progression, and real-time dashboard listings.
          </li>
        </ul>
      </section>

      {/* Tech Stack Component */}
      <section className="tech-stack-section">
        <div className="text-center mb-4">
          <h2>Technical Architecture</h2>
          <p>A look under the hood at our technology stack.</p>
        </div>

        <div className="grid-3">
          <div className="tech-card glass-panel">
            <h4>Frontend Layer</h4>
            <ul>
              <li>React.js (Vite compiler)</li>
              <li>Lucide Icons</li>
              <li>Vanilla CSS Design Tokens</li>
              <li>Socket.io-Client</li>
            </ul>
          </div>

          <div className="tech-card glass-panel">
            <h4>API Service Layer</h4>
            <ul>
              <li>Node.js / Express.js Server</li>
              <li>JWT (JSON Web Tokens)</li>
              <li>Bcrypt Password Hashing</li>
              <li>Socket.io Event Emitting</li>
            </ul>
          </div>

          <div className="tech-card glass-panel">
            <h4>Database Storage</h4>
            <ul>
              <li>MongoDB Database</li>
              <li>Mongoose Object Modeling</li>
              <li>Relational Reference Schemas</li>
              <li>Unique Index Optimizations</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
