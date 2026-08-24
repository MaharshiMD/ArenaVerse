import React, { useState } from 'react';
import MatchNode from './MatchNode';
import './BracketView.css';

const BracketView = ({ matches, isOrganizer, onUpdateScore }) => {
  const [activeBracket, setActiveBracket] = useState('winners'); // 'winners' or 'losers'

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center mt-4 glass-panel">
        <p className="text-secondary">No bracket has been generated for this tournament yet.</p>
      </div>
    );
  }

  // Filter matches based on winners/losers bracket
  const filteredMatches = matches.filter(m => m.bracketType === activeBracket);

  // Group matches by round
  const roundsMap = {};
  filteredMatches.forEach(m => {
    if (!roundsMap[m.round]) {
      roundsMap[m.round] = [];
    }
    roundsMap[m.round].push(m);
  });

  // Sort rounds and sort matches in each round by position
  const sortedRounds = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  sortedRounds.forEach(r => {
    roundsMap[r].sort((a, b) => a.position - b.position);
  });

  const hasLoserMatches = matches.some(m => m.bracketType === 'losers');

  return (
    <div className="bracket-wrapper">
      {hasLoserMatches && (
        <div className="bracket-toggle-container">
          <button 
            className={`btn btn-sm ${activeBracket === 'winners' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveBracket('winners')}
          >
            Winners Bracket
          </button>
          <button 
            className={`btn btn-sm ${activeBracket === 'losers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveBracket('losers')}
          >
            Losers Bracket
          </button>
        </div>
      )}

      <div className="bracket-scroll-container">
        <div className="bracket-container">
          {sortedRounds.map((roundNum, index) => {
            const isLast = index === sortedRounds.length - 1;
            const isSecondLast = index === sortedRounds.length - 2;
            const isThirdLast = index === sortedRounds.length - 3;

            let title = `Round ${index + 1}`;

            if (!hasLoserMatches) {
              // Single Elimination Naming
              if (isLast) {
                title = 'Finals 🏆';
              } else if (isSecondLast && sortedRounds.length > 1) {
                title = 'Semi-Finals ⚔️';
              } else if (isThirdLast && sortedRounds.length > 2) {
                title = 'Quarter-Finals 🎯';
              }
            } else {
              // Double Elimination Naming
              if (activeBracket === 'winners') {
                if (isLast && sortedRounds.length > 1) {
                  title = 'Grand Final 🏆';
                } else if (isSecondLast && sortedRounds.length > 2) {
                  title = 'Winners Final 👑';
                } else if (isThirdLast && sortedRounds.length > 3) {
                  title = 'Winners Semi-Finals ⚔️';
                }
              } else if (activeBracket === 'losers') {
                if (isLast && sortedRounds.length > 1) {
                  title = 'Losers Final 🔥';
                } else if (isSecondLast && sortedRounds.length > 2) {
                  title = 'Losers Semi-Finals ⚔️';
                } else {
                  title = `Losers Round ${index + 1}`;
                }
              }
            }

            return (
              <div key={roundNum} className="bracket-round-column">
                <h4 className="round-title">{title}</h4>
                <div className="round-matches-list">
                  {roundsMap[roundNum].map(match => (
                    <div key={match._id} className="match-node-wrapper">
                      <MatchNode 
                        match={{ ...match, relativeRound: index + 1 }} 
                        isOrganizer={isOrganizer} 
                        onUpdateScore={onUpdateScore} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BracketView;
