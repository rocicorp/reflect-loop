# Loop

Multiplayer loop station demo.

# Overview

Loop is a little different from a typical Reflect project in that it uses three different Reflect "apps", one for each view of the app:

1. The "orchestrator" is what users initially connect to and assigns users to rooms. We limit to 8 concurrent connections to a "play" rooom and "50" concurrent connections to a "share" room.
2. The "play" app is where users can edit the grid and choose sounds
3. The "share" app is the snapshot view where the grid is read-only

While it would be possible to have all this in a single app, it would mean mixing all the mutators for the different views in a single app, which doesn't really make sense. The orchestrator mutators can't be used in the the share/play views.

We will improve Reflect's APIs over time to not require separate apps for this type of usage.

# Local Setup

1. Clone repo
2. `npm install`
3. In four different terminal tabs:

- `cd reflect/orchestrator; npx reflect dev --server-path=./server.ts`
- `cd reflect/play; npx reflect dev --server-path=./server.ts -p 8081`
- `cd reflect/share; npx reflect dev --server-path=./server.ts -p 8082`
- `NEXT_PUBLIC_ORCHESTRATOR_SERVER=http://localhost:8080 NEXT_PUBLIC_PLAY_SERVER=http://localhost:8081 NEXT_PUBLIC_SHARE_SERVER=http://localhost:8082  npm run dev`

# Publish

1. Publish each app to reflect with `npx reflect publish`
2. Publish the frontend to some host, i.e., Vercel and set `NEXT_PUBLIC_ORCHESTRATOR_SERVER`, `NEXT_PUBLIC_PLAY_SERVER`, and `NEXT_PUBLIC_SHARE_SERVER` accordingly.
