# REST & Socket API Reference: Arena-Verse

This document lists all HTTP and WebSocket endpoints available on the Arena-Verse platform.

---

## 1. Authentication Endpoints

All requests under `/api/auth`

### Register User
* **POST** `/api/auth/register`
* **Request Body:**
  ```json
  {
    "username": "gamer123",
    "email": "gamer@gmail.com",
    "password": "Password123",
    "role": "player" // 'player' or 'organizer' (admin role cannot be registered directly)
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "token": "JWT_TOKEN_HERE",
    "user": {
      "id": "USER_ID",
      "username": "gamer123",
      "email": "gamer@gmail.com",
      "role": "player"
    }
  }
  ```

### Login User
* **POST** `/api/auth/login`
* **Request Body:**
  ```json
  {
    "email": "gamer@gmail.com",
    "password": "Password123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "token": "JWT_TOKEN_HERE",
    "user": {
      "id": "USER_ID",
      "username": "gamer123",
      "email": "gamer@gmail.com",
      "role": "player"
    }
  }
  ```

### Get Authenticated User Profile
* **GET** `/api/auth/me`
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):**
  ```json
  {
    "id": "USER_ID",
    "username": "gamer123",
    "email": "gamer@gmail.com",
    "role": "player",
    "profile": {
      "bio": "",
      "avatar": "",
      "favoriteGames": [],
      "socialLinks": { "discord": "", "twitter": "", "youtube": "" }
    }
  }
  ```

### Update User Profile
* **PUT** `/api/auth/profile`
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "bio": "Apex Legends professional player",
    "avatar": "data:image/png;base64,...",
    "favoriteGames": ["Apex Legends", "Valorant"],
    "socialLinks": { "discord": "gamer#1111", "twitter": "@gamer123", "youtube": "" }
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "Profile updated successfully",
    "profile": { ... }
  }
  ```

---

## 2. Tournament Endpoints

All requests under `/api/tournaments`

### Create Tournament
* **POST** `/api/tournaments`
* **Headers:** `Authorization: Bearer <token>` (Organizer/Admin only)
* **Request Body:**
  ```json
  {
    "name": "VCT Champions Tour",
    "game": "Valorant",
    "banner": "data:image/png;base64,...",
    "startDate": "2026-08-01T15:00:00.000Z",
    "entryFee": 10,
    "prizePool": 500,
    "rules": "1. No cheats. 2. Be on time.",
    "maxTeams": 16,
    "type": "team" // 'solo' or 'team'
  }
  ```
* **Response (201 Created):**
  ```json
  { "id": "TOURNAMENT_ID", "name": "VCT Champions Tour", ... }
  ```

### Get All Tournaments
* **GET** `/api/tournaments`
* **Query Params (Optional):** `game=Valorant`, `status=published`
* **Response (200 OK):**
  ```json
  [
    { "id": "TOURNAMENT_ID", "name": "VCT Champions Tour", ... }
  ]
  ```

### Get Tournament Details
* **GET** `/api/tournaments/:id`
* **Response (200 OK):**
  ```json
  {
    "tournament": { ... },
    "bracket": { ... },
    "matches": [ ... ]
  }
  ```

### Join Tournament
* **POST** `/api/tournaments/:id/join`
* **Headers:** `Authorization: Bearer <token>` (Player only)
* **Request Body (Required if tournament type is 'team'):**
  ```json
  {
    "teamId": "TEAM_ID"
  }
  ```
* **Response (200 OK):**
  ```json
  { "message": "Successfully joined the tournament" }
  ```

### Leave Tournament
* **POST** `/api/tournaments/:id/leave`
* **Headers:** `Authorization: Bearer <token>` (Player only)
* **Request Body (Required if tournament type is 'team'):**
  ```json
  {
    "teamId": "TEAM_ID"
  }
  ```
* **Response (200 OK):**
  ```json
  { "message": "Successfully left the tournament" }
  ```

### Publish Tournament (Generate Bracket)
* **POST** `/api/tournaments/:id/publish`
* **Headers:** `Authorization: Bearer <token>` (Organizer/Admin only)
* **Request Body:**
  ```json
  {
    "bracketType": "single_elimination" // or 'double_elimination'
  }
  ```
* **Response (200 OK):**
  ```json
  { "message": "Tournament published and bracket generated successfully" }
  ```

---

## 3. Team Endpoints

All requests under `/api/teams`

### Create Team
* **POST** `/api/teams`
* **Headers:** `Authorization: Bearer <token>` (Player only)
* **Request Body:**
  ```json
  {
    "name": "Sentinels Reborn",
    "description": "NA Competitive Valorant Team"
  }
  ```
* **Response (201 Created):**
  ```json
  { "id": "TEAM_ID", "name": "Sentinels Reborn", "inviteCode": "XYZ123", ... }
  ```

### Join Team by Invite Code
* **POST** `/api/teams/join`
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "inviteCode": "XYZ123"
  }
  ```
* **Response (200 OK):**
  ```json
  { "message": "Successfully joined the team", "team": { ... } }
  ```

### Leave Team
* **POST** `/api/teams/:id/leave`
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):**
  ```json
  { "message": "Successfully left the team" }
  ```

---

## 4. Match Endpoints

All requests under `/api/matches`

### Update Match Score (Progress Winner)
* **PUT** `/api/matches/:id/score`
* **Headers:** `Authorization: Bearer <token>` (Organizer/Admin only)
* **Request Body:**
  ```json
  {
    "scoreA": 2,
    "scoreB": 1
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "Match updated successfully",
    "match": { ... },
    "bracketUpdated": true
  }
  ```

---

## 5. WebSockets Events

Connected clients must join the tournament room.

### Server Events (Emitted to Client)
- `join_tournament_room`: Command sent by client on loading the tournament page to join room: `tournament_<id>`
- `match_updated`: Emitted by server to all clients in `tournament_<id>` when a score is updated. Contains the updated match lists.

### Client Events (Sent to Server)
- `join`: Payload `{ "tournamentId": "TOURNAMENT_ID" }`
