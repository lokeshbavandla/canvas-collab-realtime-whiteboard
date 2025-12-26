# CanvasCollab: Real-Time Whiteboard

**CanvasCollab** is a multiplayer whiteboard I built to understand the engineering challenges behind tools like Figma or Excalidraw.

I wanted to move beyond basic CRUD apps and tackle **real-time concurrency**. This project forced me to learn how to handle bi-directional data streaming, manage state across multiple clients, and optimize HTML5 Canvas for performance.

**🚀 Live Demo:** https://canvas-collab-realtime-whiteboard.vercel.app

---

## 🛠️ The Tech Stack

I chose this stack to balance modern developer experience with raw performance needs:

- **Frontend:** Next.js (App Router), Tailwind CSS
- **State/Logic:** React Hooks, Socket.io-client
- **Graphics:** HTML5 Canvas API
- **Backend:** Node.js, Express, Socket.io
- **Tools:** Git

---

## 🎯 Key Features I Built

- **Real-Time Sync:** Users can see each other's drawings instantly (low latency).
- **Presence System:** Shows who is online and where their mouse cursor is.
- **Shape Engine:** Supports Rectangles, Circles, and Freehand drawing.
- **Timeline History:** A functional Undo/Redo stack that handles new actions correctly.
- **Smart Eraser:** Uses `destination-out` logic to actually remove pixels, not just paint white over them.

---

## 🧠 Technical Challenges & Solutions

This project was a deep dive into "Browser Internals." Here are the hardest problems I faced and how I solved them:

### 1. The "React Lag" Problem

**The Challenge:** Initially, I tried storing every mouse coordinate in React State (`useState`). This caused a re-render on every mouse move, crashing the FPS and freezing the UI.
**My Solution:** I decoupled the drawing logic from React.

- I used **React Refs** to hold the mutable canvas state.
- I utilized a custom `useDraw` hook to listen to browser events directly.
- This allows the drawing to happen at the speed of the browser (60FPS) without triggering React's reconciliation cycle.

### 2. The "Late Joiner" Issue

**The Challenge:** When a user joined a room 5 minutes late, they saw a blank screen, even though others had already drawn things.
**My Solution:** I implemented a "History Handshake."

- When a new client connects, the server doesn't just say "Welcome."
- It immediately sends a serialized copy of the entire `drawHistory` array.
- The client "replays" these strokes upon mounting, ensuring everyone sees the exact same board state.

### 3. Rendering Cursors Without Lag

**The Challenge:** Drawing remote users' cursors directly onto the main Canvas meant clearing and redrawing the _entire_ board every time someone moved their mouse (which is constant).
**My Solution:** I separated the layers.

- **Layer 1 (Bottom):** The Canvas (Static drawings).
- **Layer 2 (Top):** An HTML `<div>` overlay (Cursors).
- This way, cursor updates only affect the DOM overlay and never trigger a heavy Canvas redraw.

---

## 🚀 How to Run Locally

I built this to be easy to run. You can spin it up in 5 minutes.

**Prerequisites:** Node.js 18+

1. **Clone the Repo:**

```bash
git clone https://github.com/lokeshbavandla/canvas-collab-realtime-whiteboard.git

```

2. **Start Backend:**

```bash
cd backend
npm install
npm run dev
# Server runs on port 3001

```

3. **Start Frontend:**

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000

```

---

## What I Learned & What's Next

Building this taught me that WebSockets are tricky. Handling race conditions (what if two users draw at the exact same millisecond?) is a hard problem I'm still exploring.

**Roadmap for improvements:**

- **Database:** Currently, history is in-memory. I want to add **PostgreSQL** to save drawings permanently.
- **Zoom/Pan:** Adding an infinite canvas capability.
- **Room Logic:** Better namespace handling for private rooms.

---

### 📬 Connect with me

I am a Full Stack Builder looking for roles where I can ship features and learn from a senior team.

- **LinkedIn:** http://www.linkedin.com/in/lokesh-bavandla
- **Email:** lokeshbavandla@gmail.com
