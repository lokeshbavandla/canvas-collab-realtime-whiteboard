const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

let drawHistory = [];
let cursors = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("client-ready", () => {
    socket.emit("get-canvas-state", drawHistory);
  });

  socket.on("draw-line", (data) => {
    if (!data.strokeId) return;

    drawHistory = drawHistory.filter((item) => {
      return !(item.userId === socket.id && item.isDeleted);
    });

    const newEntry = { ...data, userId: socket.id, isDeleted: false };
    drawHistory.push(newEntry);

    socket.broadcast.emit("draw-line", newEntry);
  });

  socket.on("cursor-move", (data) => {
    cursors[socket.id] = { ...data, lastUpdate: Date.now() };
    socket.broadcast.emit("cursor-update", {
      id: socket.id,
      ...cursors[socket.id],
    });
  });

  socket.on("undo", () => {
    let lastVisibleStrokeId = null;
    for (let i = drawHistory.length - 1; i >= 0; i--) {
      if (drawHistory[i].userId === socket.id && !drawHistory[i].isDeleted) {
        lastVisibleStrokeId = drawHistory[i].strokeId;
        break;
      }
    }
    if (!lastVisibleStrokeId) return;

    drawHistory = drawHistory.map((item) =>
      item.strokeId === lastVisibleStrokeId
        ? { ...item, isDeleted: true }
        : item
    );
    io.emit("get-canvas-state", drawHistory);
  });

  socket.on("redo", () => {
    let lastVisibleIndex = -1;
    for (let i = drawHistory.length - 1; i >= 0; i--) {
      if (drawHistory[i].userId === socket.id && !drawHistory[i].isDeleted) {
        lastVisibleIndex = i;
        break;
      }
    }

    let strokeIdToRestore = null;
    for (let i = lastVisibleIndex + 1; i < drawHistory.length; i++) {
      if (drawHistory[i].userId === socket.id && drawHistory[i].isDeleted) {
        strokeIdToRestore = drawHistory[i].strokeId;
        break;
      }
    }

    if (!strokeIdToRestore) return;

    drawHistory = drawHistory.map((item) =>
      item.strokeId === strokeIdToRestore ? { ...item, isDeleted: false } : item
    );
    io.emit("get-canvas-state", drawHistory);
  });

  socket.on("clear", () => {
    drawHistory = [];
    io.emit("clear");
  });

  socket.on("disconnect", () => {
    delete cursors[socket.id];
    io.emit("cursor-remove", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✔️ Server running on port ${PORT}`);
});
