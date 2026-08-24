# 🔄 ArenaVerse – Complete Platform Workflows & Interaction Diagrams

![ArenaVerse 2-Column White Workflow Diagram](file:///d:/College/Semester%207/UDP/ArenaVerse/docs/arenaverse_2column_white_workflow_diagram.png)

![ArenaVerse Dark Full Workflow Diagram](file:///d:/College/Semester%207/UDP/ArenaVerse/docs/arenaverse_full_workflow_diagram.png)

This document contains detailed workflow diagrams detailing user journeys, operational logic, real-time data flows, and system interactions across the ArenaVerse eSports Platform.

---

## 1. 👤 User Authentication & Career Lifecycle Workflow

This workflow illustrates how a user registers, selects a role, links game IDs (Steam, Riot Games, Epic, Xbox, PSN), builds their career profile, and earns competitive rankings (Bronze to Grandmaster).

```mermaid
flowchart TD
    Start([User visits ArenaVerse]) --> AuthCheck{Has Account?}
    
    %% Registration Branch
    AuthCheck -- No --> RegisterPage[Navigate to /register]
    RegisterPage --> InputRegDetails[Fill Username, Email, Password, Role]
    InputRegDetails --> SelectRole{Select Role}
    SelectRole -- Player --> CreatePlayerUser[Create Account with Role: 'player']
    SelectRole -- Organizer --> CreateOrgUser[Create Account with Role: 'organizer']
    CreatePlayerUser --> IssueJWT[Generate & Return JWT Token]
    CreateOrgUser --> IssueJWT
    
    %% Login Branch
    AuthCheck -- Yes --> LoginPage[Navigate to /login]
    LoginPage --> InputAuth[Enter Credentials]
    InputAuth --> VerifyAuth{Credentials Valid?}
    VerifyAuth -- No --> AuthError[Display Error Notification]
    AuthError --> LoginPage
    VerifyAuth -- Yes --> IssueJWT

    %% Profile Setup & Customization
    IssueJWT --> SaveSession[Store Token in LocalStorage / Context]
    SaveSession --> NavProfile[Navigate to Profile Settings]
    NavProfile --> LinkGameIDs[Link Steam / Riot / Epic / Xbox / PSN Accounts]
    LinkGameIDs --> SetCosmetics[Equip Profile Avatar, Banner & Animated Frame]
    SetCosmetics --> ViewDashboard[Access Role Dashboard]

    %% Career Progression
    ViewDashboard --> PlayMatches[Participate in Scrims & Tournaments]
    PlayMatches --> RecordStats[Backend Records KDA, Win Rate, Matches Played]
    RecordStats --> RankEngine{XP Threshold Met?}
    RankEngine -- Yes --> TierUpgrade[Promote Division Rank: Bronze ➔ Grandmaster]
    RankEngine -- No --> UpdateLeaderboard[Update Player Leaderboard & Stats]
    TierUpgrade --> UpdateLeaderboard
    UpdateLeaderboard --> EndPlayerFlow([Active Platform Member])
```

---

## 2. 👥 Team Squad, Recruitment & Scrim Drafting Workflow

This workflow details how players create or join team squads using invite codes, assign tactical roles (Captain, Coach, Analyst, Player), post recruitment listings, and enter WebRTC scrim lobbies with tactical whiteboards.

```mermaid
flowchart TD
    subgraph SquadManagement["Squad & Team Lifecycle"]
        Player[Player Action] --> TeamDecision{Action Type}
        TeamDecision -- Create Team --> FormTeam[Submit Team Name, Logo & Tag]
        FormTeam --> SaveTeam[MongoDB Saves Team Document]
        SaveTeam --> GenInvite[Generate Unique Invite Code e.g. XYZ123]
        GenInvite --> AssignCaptain[Set User as Team Captain]

        TeamDecision -- Join Team --> EnterCode[Input Invite Code]
        EnterCode --> ValidateCode{Code Valid & Slot Open?}
        ValidateCode -- No --> CodeErr[Display Code Invalid / Team Full]
        ValidateCode -- Yes --> AddMember[Add Player to Squad Roster]
        AddMember --> SelectRole[Assign Roster Role: Captain / Co-Captain / Coach / Analyst / Player]
    end

    subgraph RecruitmentBoard["Recruitment Board (LFT / LFP)"]
        Player --> PostRecruitment{Recruitment Intent}
        PostRecruitment -- LFT (Player) --> PostLFT[Create Looking For Team Listing]
        PostRecruitment -- LFP (Captain) --> PostLFP[Create Looking For Player Listing]
        PostLFT --> DisplayBoard[Publish to Recruitment Board Page]
        PostLFP --> DisplayBoard
        DisplayBoard --> DirectMsg[In-App Squad Invite / Direct Contact]
    end

    subgraph ScrimLobby["Tactical Draft & WebRTC Scrim Room"]
        AssignCaptain --> ScrimLobbyInit[Schedule Scrim Match]
        SelectRole --> ScrimLobbyInit
        ScrimLobbyInit --> JoinVoice[Establish WebRTC Peer Connection]
        JoinVoice --> EnableAudio[Enable Team Voice Channel & Screen Share]
        ScrimLobbyInit --> OpenWhiteboard[Open Interactive Tactical Coach Canvas]
        OpenWhiteboard --> DrawTactics[Draw Strategy / Map Callouts Real-time]
    end
```

---

## 3. 🏆 Tournament Setup, Bracket Engine & Match Progression Workflow

This core workflow covers tournament creation by an organizer, player/squad registration, automated double/single elimination bracket generation, match check-in, live score reporting via Socket.io, walkover timers, MVP awards, and PDF certificate generation.

```mermaid
flowchart TD
    subgraph SetupPhase["1. Tournament Creation & Registration"]
        Org[Organizer] --> CreateTourn[Create Tournament: Rules, Max Teams, Entry Fee, Prize Pool]
        CreateTourn --> SaveDraft[Save Tournament Document in Status: 'draft']
        SaveDraft --> PublishTourn[Publish Tournament to Public Directory]
        
        Players[Players / Squad Captains] --> BrowseTourn[Browse Tournament Directory]
        BrowseTourn --> RegisterTourn[Click Register]
        RegisterTourn --> CheckWallet{Check Arena Wallet Balance}
        CheckWallet -- Insufficient --> DepositFunds[Prompt Razorpay Wallet Deposit]
        DepositFunds --> CheckWallet
        CheckWallet -- Sufficient --> DeductFee[Deduct Entry Fee & Lock Slot]
        DeductFee --> RosterConfirmed[Add Team / Player to Tournament Roster]
    end

    subgraph BracketPhase["2. Seed Distribution & Bracket Generation"]
        PublishTourn --> CapacityCheck{Max Participants Reached?}
        RosterConfirmed --> CapacityCheck
        CapacityCheck -- Yes / Start Date Reached --> TriggerBracket[Organizer Triggers Bracket Generation]
        TriggerBracket --> BracketType{Select Bracket Format}
        BracketType -- Single Elimination --> GenSingle[Build Single-Elimination Match Trees]
        BracketType -- Double Elimination --> GenDouble[Build Winner & Loser Bracket Trees]
        GenSingle --> InitMatches[Insert Match Records with nextMatchId & loserDropMatchId]
        GenDouble --> InitMatches
        InitMatches --> UpdateStatus[Set Tournament Status: 'active']
        UpdateStatus --> SocketBroadcast[Socket.io Broadcasts 'bracket_generated' to Clients]
    end

    subgraph MatchPhase["3. Match Execution, Check-In & Score Progression"]
        SocketBroadcast --> MatchStartNotification[Send Match Alert to Assigned Players]
        MatchStartNotification --> MatchCheckIn[Players Click 'Check In' Button]
        MatchCheckIn --> CheckInTimer{Both Checked In within 15 mins?}
        CheckInTimer -- No (No-Show) --> AutoWalkover[Trigger Automated Walkover: Advance Present Team]
        CheckInTimer -- Yes --> LiveMatch[Execute Scrim / Match Play]
        
        LiveMatch --> ReportScore[Organizer / Captain Submits Match Scores]
        ReportScore --> ValidateScore{Score Confirmed?}
        ValidateScore -- Dispute --> AdminReview[Route Match to Dispute Console]
        AdminReview --> ResolveScore[Admin Overrides Score]
        ValidateScore -- Valid --> SaveScore[Save Score & Determine Winner]
        ResolveScore --> SaveScore

        AutoWalkover --> SaveScore
        SaveScore --> ProgressEngine[Backend Bracket Progression Engine]
        ProgressEngine --> AdvanceWinner[Set Winner in nextMatchId Slot]
        ProgressEngine --> DropLoser{Is Double Elimination?}
        DropLoser -- Yes --> DropToLosers[Set Loser in loserDropMatchId Slot]
        DropLoser -- No --> Eliminate[Mark Player / Team Eliminated]
        
        AdvanceWinner --> SocketLiveScore[Socket.io Emits 'match_updated' Event]
        SocketLiveScore --> RefreshUI[Live Bracket Updates Dynamically on Client]
    end

    subgraph RewardPhase["4. MVP Award, PDF Certificates & Payout"]
        RefreshUI --> FinalsCheck{Is Tournament Final Match?}
        FinalsCheck -- No --> MatchStartNotification
        FinalsCheck -- Yes --> DeclareChampion[Declare Tournament Champion & Runner-Up]
        DeclareChampion --> SelectMVP[Organizer Selects Match & Tournament MVPs]
        SelectMVP --> DistributePrize[Transfer Prize Pool to Winner Wallet]
        DistributePrize --> GenPDF[PDFKit Streaming Engine Generates PDF Certificates]
        GenPDF --> DownloadCert[Certificates Available in '/my-certificates']
        DownloadCert --> CompleteTourn([Tournament Status: 'completed'])
    end
```

---

## 3.5 🔄 System Workflow

![ArenaVerse 3.5 System Workflow Diagram](file:///d:/College/Semester%207/UDP/ArenaVerse/docs/system_workflow_diagram.png)

This workflow details the sequential architecture processing pipeline, moving from user authentication and role-based dashboard redirection, through core platform service execution, backend API processing, database persistence, and real-time Socket.io/WebRTC event broadcasting back to the client interface.

```mermaid
flowchart TD
    %% 1. User Registration / Login
    subgraph AuthLayer["1. Authentication & Identity Tier"]
        A1["User Registration / Login"] --> A2["JWT Authentication & Role Identification"]
    end

    %% 2. Dashboards
    subgraph Dashboards["2. Role Dashboard Tier"]
        A2 --> R1{"Role Identification"}
        R1 -- Player --> D1["Player Dashboard"]
        R1 -- Organizer --> D2["Organizer Dashboard"]
        R1 -- Admin --> D3["Admin Dashboard"]
    end

    %% 3. Functionality Selection
    subgraph ActionSelection["3. Functionality Selection"]
        D1 --> S1["Select Required Functionality"]
        D2 --> S1
        D3 --> S1
    end

    %% 4. Platform Services
    subgraph ServicesTier["4. Core Platform Services"]
        S1 --> ServiceNode{"Select Service"}
        ServiceNode -- Tournament --> S_Tourn["Tournament Management\n(Brackets, Seeding, Scores, Payouts)"]
        ServiceNode -- Team --> S_Team["Team / Squad Management\n(Rosters, Invite Codes, Scrims)"]
        ServiceNode -- Recruitment --> S_Recruit["Recruitment Board\n(LFT / LFP Listings)"]
        ServiceNode -- Community --> S_Comm["Community & Forums\n(Discussions, Polls, Feed)"]
        ServiceNode -- AI Services --> S_AI["AI Services\n(ArenaBot, Creative Studio, Match Analytics)"]
    end

    %% 5. Backend Processing
    subgraph ProcessingTier["5. Backend API Engine"]
        S_Tourn --> API["Backend API Processing\n(Node.js / Express Controllers & RBAC Middleware)"]
        S_Team --> API
        S_Recruit --> API
        S_Comm --> API
        S_AI --> API
    end

    %% 6. Data Storage & External Services
    subgraph PersistenceTier["6. Data Persistence & Integrations"]
        API --> DB[("MongoDB Data Storage\n(Users, Teams, Tournaments, Matches, Posts)")]
        API --> Ext["External Services\n(Google Gemini AI, Razorpay, Game APIs, Twitch/YT)"]
    end

    %% 7. Real-Time Infrastructure
    subgraph RealtimeTier["7. Real-Time Communication"]
        DB --> RT["Real-Time Updates through Socket.io / WebRTC\n(Live Event Emitters & Peer Audio Channels)"]
        Ext --> RT
    end

    %% 8. Client Output & Feedback
    subgraph OutputTier["8. Result & Feedback Loop"]
        RT --> Out["Result / Notification / Dashboard Update\n(Dynamic UI Refresh, Toast Alerts & Bracket Sync)"]
    end
```

---

## 4. 🤖 AI Creative Studio, Chatbot & Tactical Analytics Workflow

This workflow illustrates how Gemini AI integrates with MongoDB context to drive the floating ArenaBot chatbot, generate promotional assets in the AI Creative Studio, and calculate live win probabilities & draft recommendations.

```mermaid
flowchart TD
    subgraph ArenaBotFlow["ArenaBot Chatbot Assistant"]
        UserQuery[User types query in ArenaBot Floating Widget] --> FetchContext[Backend fetches User, Team & Tournament Context from MongoDB]
        FetchContext --> ConstructPrompt[Construct System Prompt + Live DB Payload]
        ConstructPrompt --> CallGeminiBot[Invoke Google Gemini 1.5 API]
        CallGeminiBot --> StreamResponse[Stream Markdown Response back to Widget UI]
    end

    subgraph CreativeStudioFlow["AI Creative Studio Asset Generator"]
        OrganizerUser[Organizer / Player] --> SelectAssetType{Select Creative Asset}
        SelectAssetType -- Tournament Poster --> PosterForm[Input Event Title, Game, Date & Color Theme]
        SelectAssetType -- Team Logo --> LogoForm[Input Team Tag, Mascot & Style]
        SelectAssetType -- Rulebook / Proposal --> RuleForm[Input Rules Summary & Sponsor Targets]
        
        PosterForm --> GeneratePrompt[Format AI Creative Prompt]
        LogoForm --> GeneratePrompt
        RuleForm --> GeneratePrompt

        GeneratePrompt --> CallGeminiStudio[Send Request to Gemini API / Asset Renderer]
        CallGeminiStudio --> ReturnAsset[Return Generated Visual Poster, Banner, SVG Logo or Markdown Text]
        ReturnAsset --> RenderStudioUI[Display Asset Preview & Download Button]
    end

    subgraph MatchAnalyticsFlow["AI Match Predictor & Draft Coach"]
        SelectMatch[Select Upcoming Match Node] --> GatherHistoricalData[Gather Teams' Historical Win Rate, KDA & Map Stats]
        GatherHistoricalData --> MLPredictor[Calculate Win Probability % & Key Matchups]
        MLPredictor --> DraftAdvice[Generate Recommended Pick/Ban Draft Recommendations]
        DraftAdvice --> RenderMatchBadge[Display AI Prediction Widget on Match Card]
    end
```

---

## 5. 🛍️ Arena Coins, Rewards Store & Merchandise Workflow

This workflow shows how users acquire Arena Coins through tournament participation and daily quests, spend them in the Reward Store for digital cosmetics, or purchase physical/digital merchandise.

```mermaid
flowchart TD
    subgraph CoinAcquisition["Arena Coins Earning Engine"]
        UserAction[User Platform Activity] --> ActivityType{Activity Type}
        ActivityType -- Complete Tournament Match --> EarnMatchCoins[Award 50 Arena Coins]
        ActivityType -- Win Tournament --> EarnWinCoins[Award 500 Arena Coins]
        ActivityType -- Daily Check-in / Quest --> EarnQuestCoins[Award 20 Arena Coins]
        
        EarnMatchCoins --> UpdateWallet[Update User Arena Wallet Balance in MongoDB]
        EarnWinCoins --> UpdateWallet
        EarnQuestCoins --> UpdateWallet
    end

    subgraph RewardStoreFlow["Arena Coins Reward Store"]
        UpdateWallet --> VisitRewardStore[Navigate to /reward-store]
        VisitRewardStore --> SelectCosmetic[Select Item: Animated Profile Frame / Title / Battle Pass Level]
        SelectCosmetic --> CheckCoins{Has Sufficient Arena Coins?}
        CheckCoins -- No --> InsufficientAlert[Display 'Insufficient Arena Coins']
        CheckCoins -- Yes --> DeductCoins[Deduct Arena Coins from Wallet]
        DeductCoins --> AddInventory[Add Cosmetic Item to User Inventory Document]
        AddInventory --> EquipCosmetic[User Equips Frame / Title on Profile]
    end

    subgraph MerchStoreFlow["Merchandise Store & Checkout"]
        VisitMerchStore[Navigate to /merch-store] --> SelectMerch[Select Esports Jersey / Hoodie / Mousepad / Stream Overlay]
        SelectMerch --> AddCart[Add to Shopping Cart & Proceed to Checkout]
        AddCart --> PaymentGateway[Initialize Razorpay Gateway Modal]
        PaymentGateway --> PayProcess{Payment Successful?}
        PayProcess -- Failed --> PayError[Display Payment Failed Notice]
        PayProcess -- Success --> LogTransaction[Log Payment Transaction Record]
        LogTransaction --> OrderConfirm[Send Order Confirmation & Update Stock]
    end
```

---

## 6. 🛡️ Anti-Cheat, Anti-Smurf & Admin System Operations Workflow

This workflow details the automated security telemetry, duplicate account detection, risk score calculation, and admin operational tools.

```mermaid
flowchart TD
    subgraph Telemetry["Passive Telemetry & Risk Analytics"]
        ClientReq[Client Request / Login / Registration] --> ExtractTelemetry[Extract IP Address, User-Agent & Device Fingerprint]
        ExtractTelemetry --> QueryRisk[Search DB for Existing Accounts with Identical IP/Fingerprint]
        QueryRisk --> EvaluateRisk{Matching Accounts Found?}
        EvaluateRisk -- No --> LowRisk[Assign Low Risk Score: 0-10]
        EvaluateRisk -- Yes --> CalcRisk[Calculate Risk Score: 60-100 & Flag 'Potential Smurf/Alt']
        LowRisk --> LogAccess[Log Activity in Audit History]
        CalcRisk --> TriggerFlag[Create Entry in AntiCheatReports Collection]
    end

    subgraph AdminOps["Admin Console & Dispute Resolution"]
        TriggerFlag --> AdminAlert[Display Security Notification on Admin Dashboard]
        AdminUser[Admin User] --> OpenConsole[Access /admin Platform Dashboard]
        OpenConsole --> ReviewReport[Inspect User Profile, Linked Accounts, Match History & Risk Score]
        ReviewReport --> Decision{Admin Action Decision}
        
        Decision -- Dismiss --> ClearFlag[Mark Flag as Resolved / False Positive]
        Decision -- Warning --> IssueWarning[Send Official In-App System Warning]
        Decision -- Suspension --> SuspendUser[Temporary Account Lockout for X Days]
        Decision -- Ban Account --> BanUser[Set User Status: 'banned' & Revoke JWT Tokens]

        BanUser --> AuditTrail[Write Permanent Entry to System Audit Logs]
        SuspendUser --> AuditTrail
        IssueWarning --> AuditTrail
        ClearFlag --> AuditTrail
    end
```

---

## 7. 🌐 End-to-End Real-Time Data & System Infrastructure Flow

This architecture flow illustrates how client requests traverse Nginx, Kubernetes, Node.js/Express, Redis, Socket.io, WebRTC, MongoDB, and External APIs.

```mermaid
flowchart LR
    subgraph Clients["Clients Tier"]
        Browser["React 18 SPA (Vite)"]
        Mobile["PWA Mobile Web App"]
    end

    subgraph Edge["Edge Infrastructure Tier"]
        NginxProxy["Nginx Reverse Proxy & SSL Termination"]
    end

    subgraph AppTier["Application Compute Tier (Kubernetes Pods)"]
        ExpressApp["Node.js / Express REST API Engine"]
        SocketEngine["Socket.io Real-Time Event Server"]
        WebRTCSignaling["WebRTC Mesh Audio & Screen Share"]
    end

    subgraph CacheDB["Caching & Persistence Tier"]
        RedisCache[("Redis Session Store & Pub/Sub")]
        MongoDBAtlas[("MongoDB Central Database")]
    end

    subgraph ThirdParty["External Services Tier"]
        GeminiAPI["Google Gemini AI API"]
        Razorpay["Razorpay Payment Gateway"]
        GameAPIs["Steam / Riot / Epic External APIs"]
        Streaming["Twitch / YouTube Live Stream API"]
    end

    Clients -->|HTTPS REST API Requests| NginxProxy
    Clients -->|WSS Socket Connections| NginxProxy
    Clients -->|WebRTC P2P Voice Stream| WebRTCSignaling

    NginxProxy --> ExpressApp
    NginxProxy --> SocketEngine

    ExpressApp <--> RedisCache
    SocketEngine <--> RedisCache

    ExpressApp <--> MongoDBAtlas
    
    ExpressApp <--> GeminiAPI
    ExpressApp <--> Razorpay
    ExpressApp <--> GameAPIs
    ExpressApp <--> Streaming
```
