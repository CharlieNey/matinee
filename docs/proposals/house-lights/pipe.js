// Draws the lighting pipe: a batten with instruments in plan symbol and
// channel numbers; one instrument is lit and aimed at the title.
(function () {
  const svg = document.getElementById("plot");
  const W = svg.getBoundingClientRect().width;
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs) => {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    svg.appendChild(node);
    return node;
  };
  el("line", { x1: 0, y1: 18, x2: W, y2: 18, stroke: "#3b332c", "stroke-width": 2.5 });
  const xs = [0.08, 0.27, 0.5, 0.73, 0.92];
  const lit = Number(svg.dataset.lit ?? 2);
  xs.forEach((f, i) => {
    const x = f * W;
    const on = i === lit;
    const c = on ? "#e9c8a2" : "#6f6358";
    el("line", { x1: x, y1: 14, x2: x, y2: 23, stroke: c, "stroke-width": 1.2 });
    const g = el("g", {
      transform: `translate(${x} 31) rotate(${on ? 0 : i % 2 ? -8 : 8})`,
      fill: on ? "rgba(255,196,150,.2)" : "none",
      stroke: c,
      "stroke-width": 1.2,
    });
    const body = document.createElementNS(NS, "path");
    body.setAttribute("d", "M-7 -8 h14 v10 l3.5 6 h-21 l3.5 -6 z M-6 -3 h12");
    g.appendChild(body);
    el("circle", { cx: x, cy: 4, r: 6.5, fill: "none", stroke: c, "stroke-width": 1 });
    const t = el("text", {
      x,
      y: 7,
      "text-anchor": "middle",
      "font-family": "Menlo, monospace",
      "font-size": 8,
      fill: c,
    });
    t.textContent = i + 1;
  });
})();
