export const drawShape = ({
  ctx,
  startPoint,
  endPoint,
  color,
  width,
  shape,
}) => {
  if (!startPoint || !endPoint) return;

  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  if (shape === "rectangle") {
    ctx.strokeRect(startPoint.x, startPoint.y, dx, dy);
  } else if (shape === "circle") {
    const radius = Math.sqrt(dx * dx + dy * dy);
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (shape === "triangle") {
    ctx.beginPath();
    ctx.moveTo(startPoint.x + dx / 2, startPoint.y);
    ctx.lineTo(startPoint.x, endPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.closePath();
    ctx.stroke();
  } else if (shape === "arrow") {
    // Line
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(dy, dx);
    const headLength = 20;

    ctx.beginPath();
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
      endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
      endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
      endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
      endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }
};
