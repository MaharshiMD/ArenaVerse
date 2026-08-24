# Entity Relationship (ER) Diagram: Arena-Verse

The following ER diagram describes the entities and associations in the Arena-Verse database.

```mermaid
erDiagram
    USER ||--o{ TEAM : captains
    USER }o--o{ TEAM : members
    USER ||--o{ TOURNAMENT : organizes
    USER }o--o{ TOURNAMENT : registers_solo
    TEAM }o--o{ TOURNAMENT : registers_team

    TOURNAMENT ||--|| BRACKET : generates
    TOURNAMENT ||--o{ MATCH : contains

    MATCH }o--o| USER : participant_user
    MATCH }o--o| TEAM : participant_team
    MATCH ||--o| MATCH : progresses_to_nextMatchId
    MATCH ||--o| MATCH : drops_to_loserDropMatchId
    
    USER {
        ObjectId id PK
        string username
        string email
        string password
        string role
        string bio
        string avatar
    }

    TEAM {
        ObjectId id PK
        string name
        string logo
        string description
        ObjectId captain FK
        string inviteCode
    }

    TOURNAMENT {
        ObjectId id PK
        string name
        string game
        string banner
        date startDate
        number entryFee
        number prizePool
        string rules
        number maxTeams
        string type
        string status
        ObjectId organizer FK
    }

    MATCH {
        ObjectId id PK
        ObjectId tournament FK
        number round
        number position
        string bracketType
        ObjectId teamA_id FK
        string teamA_name
        ObjectId teamB_id FK
        string teamB_name
        number scoreA
        number scoreB
        ObjectId winner FK
        string status
        string participantModel
        ObjectId nextMatchId FK
        ObjectId loserDropMatchId FK
    }

    BRACKET {
        ObjectId id PK
        ObjectId tournament FK
        string type
        number roundsCount
        number teamsCount
    }
```

## Relationships Explained
- **USER & TEAM**: A User can captain 0 or more Teams (`captains`). A User can be a member of multiple Teams (`members`).
- **USER & TOURNAMENT**: An organizer User can create 0 or more Tournaments (`organizes`). A player User can register for 0 or more solo Tournaments (`registers_solo`).
- **TEAM & TOURNAMENT**: A Team can register for 0 or more team Tournaments (`registers_team`).
- **TOURNAMENT & BRACKET**: A Tournament has exactly 1 Bracket associated with it once started (`generates`).
- **TOURNAMENT & MATCH**: A Tournament contains multiple Matches.
- **MATCH SELF-REFERENCE**: A Match can link to another Match (`nextMatchId` and `loserDropMatchId`) to enable automatic progression of the winner and dropping of the loser.
