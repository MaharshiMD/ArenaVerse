# Database Schema Design: Arena-Verse

Arena-Verse stores its data in MongoDB. Mongoose is used as the Object Data Modeling (ODM) library. The schema is organized into five main collections: `users`, `teams`, `tournaments`, `matches`, and `brackets`.

---

## 1. Users Collection

Stores registration, login details, profile bios, and user access permissions.

```javascript
{
  _id: ObjectId,
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // Bcrypt hashed password
  role: { type: String, enum: ['player', 'organizer', 'admin'], default: 'player' },
  profile: {
    bio: { type: String, default: "" },
    avatar: { type: String, default: "" }, // URL or Base64 representation
    favoriteGames: [{ type: String }],
    socialLinks: {
      discord: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" }
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 2. Teams Collection

Stores groups created by players for team-based eSports tournaments.

```javascript
{
  _id: ObjectId,
  name: { type: String, required: true, unique: true, trim: true },
  logo: { type: String, default: "" },
  description: { type: String, default: "" },
  captain: { type: ObjectId, ref: 'User', required: true },
  members: [{ type: ObjectId, ref: 'User' }], // Array containing captain & other users
  inviteCode: { type: String, unique: true }, // Unique code to invite players
  createdAt: Date,
  updatedAt: Date
}
```

---

## 3. Tournaments Collection

Stores information about tournaments created by organizers.

```javascript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  game: { type: String, required: true, trim: true },
  banner: { type: String, default: "" }, // Base64 or image URL
  startDate: { type: Date, required: true },
  entryFee: { type: Number, default: 0 },
  prizePool: { type: Number, default: 0 },
  rules: { type: String, required: true },
  maxTeams: { type: Number, required: true, default: 16 },
  type: { type: String, enum: ['solo', 'team'], default: 'team' },
  status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed'], default: 'draft' },
  organizer: { type: ObjectId, ref: 'User', required: true },
  registeredPlayers: [{ type: ObjectId, ref: 'User' }], // Used if type = 'solo'
  registeredTeams: [{ type: ObjectId, ref: 'Team' }], // Used if type = 'team'
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. Matches Collection

Represents individual matches within a tournament bracket. Matches form a tree-like structure.

```javascript
{
  _id: ObjectId,
  tournament: { type: ObjectId, ref: 'Tournament', required: true },
  round: { type: Number, required: true }, // Round index (1-based: 1, 2, 3, etc.)
  position: { type: Number, required: true }, // Match position in that round (1-based)
  bracketType: { type: String, enum: ['winners', 'losers'], default: 'winners' }, // For Double Elimination
  teamA: {
    id: { type: ObjectId, refPath: 'participantModel' }, // References User or Team
    name: { type: String }
  },
  teamB: {
    id: { type: ObjectId, refPath: 'participantModel' }, // References User or Team
    name: { type: String }
  },
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  winner: { type: ObjectId, refPath: 'participantModel' }, // Winner ID
  status: { type: String, enum: ['scheduled', 'completed'], default: 'scheduled' },
  participantModel: { type: String, required: true, enum: ['User', 'Team'] }, // Dynamic ref path
  nextMatchId: { type: ObjectId, ref: 'Match', default: null }, // ID of the next match winner progresses to
  loserDropMatchId: { type: ObjectId, ref: 'Match', default: null }, // For Double Elimination: Loser goes here
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. Brackets Collection

Stores configuration and global metadata of a tournament bracket.

```javascript
{
  _id: ObjectId,
  tournament: { type: ObjectId, ref: 'Tournament', required: true, unique: true },
  type: { type: String, enum: ['single_elimination', 'double_elimination'], required: true },
  roundsCount: { type: Number, default: 0 },
  teamsCount: { type: Number, default: 0 },
  createdAt: Date,
  updatedAt: Date
}
```
