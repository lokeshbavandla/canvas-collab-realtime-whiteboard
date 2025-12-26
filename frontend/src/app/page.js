"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useDraw } from "@/hooks/useDraw";
import { io } from "socket.io-client";
import { drawShape } from "@/utils/drawHelpers";
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Triangle,
  ArrowUpRight,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
const socket = io(serverUrl, { transports: ["websocket"] });

const ADJECTIVES = ["Neon", "Cyber", "Happy", "Lazy", "Brave", "Quiet"];
const ANIMALS = ["Tiger", "Panda", "Eagle", "Fox", "Wolf", "Bear"];
const getRandomName = () =>
  `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${
    ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  }`;

export default function Home() {
  const [color, setColor] = useState("#000");
  const [tool, setTool] = useState("pen");
  const historyRef = useRef([]);
  const currentStrokeId = useRef(null);

  const [remoteCursors, setRemoteCursors] = useState({});
  const [userName, setUserName] = useState("");

  const { canvasRef, clear } = useDraw(handleDraw);

  useEffect(() => {
    setUserName(getRandomName());
  }, []);

  const renderCanvas = useCallback((ctx) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    historyRef.current.forEach((item) => {
      if (item.isDeleted) return;
      if (item.type === "shape") drawShape({ ...item, ctx });
      else drawLine({ ...item, ctx });
    });
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");

    socket.emit("client-ready");

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        renderCanvas(canvas.getContext("2d"));
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    // FULL SYNC (Used for Undo/Redo)
    socket.on("get-canvas-state", (serverHistory) => {
      historyRef.current = serverHistory;
      if (canvasRef.current) renderCanvas(canvasRef.current.getContext("2d"));
    });

    // LIVE UPDATE
    socket.on("draw-line", (newItem) => {
      historyRef.current.push(newItem);
      const canvasCtx = canvasRef.current?.getContext("2d");
      if (!canvasCtx) return;
      if (!newItem.isDeleted) {
        if (newItem.type === "shape") drawShape({ ...newItem, ctx: canvasCtx });
        else drawLine({ ...newItem, ctx: canvasCtx });
      }
    });

    socket.on("cursor-update", (cursorData) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [cursorData.id]: { ...cursorData, localTimestamp: Date.now() },
      }));
    });

    socket.on("cursor-remove", (socketId) => {
      setRemoteCursors((prev) => {
        const newState = { ...prev };
        delete newState[socketId];
        return newState;
      });
    });

    socket.on("clear", () => {
      historyRef.current = [];
      clear();
    });

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        socket.emit("undo");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        socket.emit("redo");
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const idleInterval = setInterval(() => {
      setRemoteCursors((prev) => ({ ...prev }));
    }, 1000);

    return () => {
      socket.off("get-canvas-state");
      socket.off("draw-line");
      socket.off("clear");
      socket.off("cursor-update");
      socket.off("cursor-remove");
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(idleInterval);
    };
  }, [clear, renderCanvas]);

  useEffect(() => {
    let lastEmit = 0;
    const handleWindowMouseMove = (e) => {
      const now = Date.now();
      if (now - lastEmit > 30) {
        socket.emit("cursor-move", {
          x: e.clientX,
          y: e.clientY,
          name: userName,
          color,
        });
        lastEmit = now;
      }
    };
    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => window.removeEventListener("mousemove", handleWindowMouseMove);
  }, [userName, color]);

  function handleDraw({
    ctx,
    currentPoint,
    prevPoint,
    isFinished,
    isStarting,
    startPoint,
  }) {
    if (isStarting) {
      historyRef.current = historyRef.current.filter((item) => {
        return !(item.userId === socket.id && item.isDeleted);
      });
    }

    if (tool === "pen" || tool === "eraser") {
      if (isStarting) {
        currentStrokeId.current = crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9);
      }
      if (isFinished) {
        currentStrokeId.current = null;
        return;
      }
      if (!currentStrokeId.current) return;

      const drawOptions = {
        prevPoint,
        currentPoint,
        ctx,
        color,
        width: tool === "eraser" ? 20 : 5,
        tool,
        type: "freehand",
        strokeId: currentStrokeId.current,
      };

      drawLine(drawOptions);
      const socketData = { ...drawOptions, ctx: undefined };
      socket.emit("draw-line", socketData);

      historyRef.current.push({
        ...socketData,
        userId: socket.id,
        isDeleted: false,
      });
      return;
    }

    renderCanvas(ctx);
    drawShape({
      ctx,
      startPoint,
      endPoint: currentPoint,
      color,
      width: 5,
      shape: tool,
    });

    if (isFinished) {
      const shapeData = {
        type: "shape",
        shape: tool,
        startPoint,
        endPoint: currentPoint,
        color,
        width: 5,
        isDeleted: false,
        strokeId: crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substr(2, 9),
        userId: socket.id,
      };
      socket.emit("draw-line", shapeData);
      historyRef.current.push(shapeData);
    }
  }

  function drawLine({ prevPoint, currentPoint, ctx, color, width, tool }) {
    const start = prevPoint ?? currentPoint;
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  const renderRemoteCursors = () => {
    return Object.keys(remoteCursors).map((key) => {
      const cursor = remoteCursors[key];
      const isIdle = Date.now() - cursor.localTimestamp > 3000;
      return (
        <div
          key={key}
          style={{
            position: "absolute",
            left: cursor.x,
            top: cursor.y,
            pointerEvents: "none",
            transition: "all 0.1s linear",
            zIndex: 100,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={cursor.color}
            stroke="white"
            strokeWidth="2"
            style={{ transform: "rotate(-15deg)" }}
          >
            <path d="M5.5 3.21l10.8 15.66a.5.5 0 0 1-.76.65l-3.3-3.48-3.46 6.34a.5.5 0 0 1-.88-.48l3.46-6.34-4.57.84a.5.5 0 0 1-.58-.57l1.35-12.62z" />
          </svg>
          <div
            className="px-2 py-1 rounded text-xs text-white font-bold whitespace-nowrap"
            style={{
              backgroundColor: cursor.color,
              marginTop: "4px",
              marginLeft: "12px",
            }}
          >
            {cursor.name} {isIdle ? "(Idle)" : ""}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="w-screen h-screen bg-gray-50 overflow-hidden relative">
      {renderRemoteCursors()}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 flex gap-4 px-6 py-3 bg-white rounded-full shadow-xl border border-gray-200 z-50 items-center select-none">
        <div className="flex gap-2 border-r pr-4 border-gray-200">
          {["#000", "#ef4444", "#3b82f6", "#22c55e", "#eab308"].map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (tool === "eraser") setTool("pen");
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c && tool !== "eraser"
                  ? "border-gray-800 scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-1 text-sm font-semibold text-gray-600">
          <button
            onClick={() => setTool("pen")}
            className={`p-2 rounded-lg hover:bg-gray-100 transition ${
              tool === "pen" ? "text-blue-600 bg-blue-50" : ""
            }`}
            title="Pen"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-lg hover:bg-gray-100 transition ${
              tool === "eraser" ? "text-blue-600 bg-blue-50" : ""
            }`}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6 self-center"></div>

          <button
            onClick={() => setTool("rectangle")}
            className={`p-2 rounded-lg hover:bg-gray-100 transition ${
              tool === "rectangle" ? "text-blue-600 bg-blue-50" : ""
            }`}
            title="Rectangle"
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setTool("circle")}
            className={`p-2 rounded-lg hover:bg-gray-100 transition ${
              tool === "circle" ? "text-blue-600 bg-blue-50" : ""
            }`}
            title="Circle"
          >
            <Circle size={20} />
          </button>
          <button
            onClick={() => setTool("triangle")}
            className={`p-2 rounded-lg hover:bg-gray-100 transition ${
              tool === "triangle" ? "text-blue-600 bg-blue-50" : ""
            }`}
            title="Triangle"
          >
            <Triangle size={20} />
          </button>
          <button
            onClick={() => setTool("arrow")}
            className={`p-2 rounded-lg hover:bg-gray-100 transition ${
              tool === "arrow" ? "text-blue-600 bg-blue-50" : ""
            }`}
            title="Arrow"
          >
            <ArrowUpRight size={20} />
          </button>
        </div>

        <div className="flex gap-1 border-l pl-4 border-gray-200">
          <button
            onClick={() => socket.emit("undo")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition active:scale-95"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={() => socket.emit("redo")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition active:scale-95"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={20} />
          </button>
          <button
            onClick={() => socket.emit("clear")}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Clear Canvas"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      <div className="fixed bottom-5 left-5 bg-white px-4 py-2 rounded-lg shadow-md border border-gray-200 text-sm font-medium z-50 text-black">
        You are: <span style={{ color: color }}>{userName}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="bg-white shadow-lg border border-gray-200 cursor-none touch-none"
        style={{ cursor: "crosshair" }}
      />
    </div>
  );
}
