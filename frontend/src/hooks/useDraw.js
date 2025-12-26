import { useEffect, useRef, useState } from "react";

export const useDraw = (onDraw) => {
  const [mouseDown, setMouseDown] = useState(false);
  const canvasRef = useRef(null);
  const prevPoint = useRef(null);
  const startPoint = useRef(null);

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const handleMouseDown = (e) => {
      setMouseDown(true);
      const point = computePointInCanvas(e, canvasRef.current);
      startPoint.current = point;
      prevPoint.current = point;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && point) {
        onDraw({
          ctx,
          currentPoint: point,
          prevPoint: null,
          startPoint: point,
          isFinished: false,
          isStarting: true,
        });
      }
    };

    const handleMouseMove = (e) => {
      if (!mouseDown) return;
      const currentPoint = computePointInCanvas(e, canvasRef.current);
      const ctx = canvasRef.current?.getContext("2d");

      if (!ctx || !currentPoint) return;

      onDraw({
        ctx,
        currentPoint,
        prevPoint: prevPoint.current,
        startPoint: startPoint.current,
        isFinished: false,
        isStarting: false,
      });
      prevPoint.current = currentPoint;
    };

    const handleMouseUp = (e) => {
      setMouseDown(false);
      const currentPoint = computePointInCanvas(e, canvasRef.current);
      const ctx = canvasRef.current?.getContext("2d");

      if (ctx && startPoint.current) {
        onDraw({
          ctx,
          currentPoint,
          prevPoint: prevPoint.current,
          startPoint: startPoint.current,
          isFinished: true,
          isStarting: false,
        });
      }
      prevPoint.current = null;
      startPoint.current = null;
    };

    const canvas = canvasRef.current;
    canvas?.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas?.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onDraw, mouseDown]);

  return { canvasRef, clear };
};

const computePointInCanvas = (e, canvas) => {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};
