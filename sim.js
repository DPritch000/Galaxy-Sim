const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let WIDTH = 800;
let HEIGHT = 600;

// Grid / physics settings
const GRID_SPACING = 48; // spacing between grid lines in pixels
const SAMPLE_STEP = 12; // sampling step along lines (px)
const SOFTENING = 80; // prevents singularities near mass centers

// masses: array of { x, y, mass }
const masses = [];

function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	WIDTH = canvas.width;
	HEIGHT = canvas.height;
	// ensure at least one demo mass in center for immediate effect
	if (masses.length === 0) masses.push({ x: WIDTH / 2, y: HEIGHT / 2, mass: 2000 });
}

window.addEventListener('resize', resize);
resize();

// add / remove masses by user interaction
canvas.addEventListener('click', (e) => {
	const r = canvas.getBoundingClientRect();
	const x = e.clientX - r.left;
	const y = e.clientY - r.top;
	// add a mass at click
	masses.push({ x, y, mass: 2000 });
});

canvas.addEventListener('contextmenu', (e) => {
	e.preventDefault();
	const r = canvas.getBoundingClientRect();
	const x = e.clientX - r.left;
	const y = e.clientY - r.top;
	// remove nearest mass within threshold
	let best = -1;
	let bestD = 999999;
	for (let i = 0; i < masses.length; i++) {
		const dx = masses[i].x - x;
		const dy = masses[i].y - y;
		const d = Math.hypot(dx, dy);
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	if (best !== -1 && bestD < 120) masses.splice(best, 1);
});

function clear() {
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// warp a single point by summing contributions from masses
function warpPoint(px, py) {
	let wx = px;
	let wy = py;
	for (const m of masses) {
		const dx = px - m.x;
		const dy = py - m.y;
		const dist = Math.hypot(dx, dy);
		const att = m.mass / (dist * dist + SOFTENING);
		// move point toward the mass (space curvature visualized as attraction)
		const nx = dx / (dist + 1e-6);
		const ny = dy / (dist + 1e-6);
		const deflect = att * 12; // strength multiplier (tweakable)
		wx -= nx * deflect;
		wy -= ny * deflect;
	}
	return { x: wx, y: wy };
}

function drawMass(m) {
	const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 80);
	grad.addColorStop(0, 'rgba(255,180,80,0.95)');
	grad.addColorStop(0.4, 'rgba(255,120,40,0.6)');
	grad.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(m.x, m.y, 48, 0, Math.PI * 2);
	ctx.fill();
}

function drawGrid() {
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'rgba(180,220,255,0.6)';

	// horizontal lines
	for (let y = 0; y <= HEIGHT + GRID_SPACING; y += GRID_SPACING) {
		ctx.beginPath();
		let first = true;
		for (let x = 0; x <= WIDTH; x += SAMPLE_STEP) {
			const p = warpPoint(x, y);
			if (first) {
				ctx.moveTo(p.x, p.y);
				first = false;
			} else {
				ctx.lineTo(p.x, p.y);
			}
		}
		ctx.stroke();
	}

	// vertical lines
	for (let x = 0; x <= WIDTH + GRID_SPACING; x += GRID_SPACING) {
		ctx.beginPath();
		let first = true;
		for (let y = 0; y <= HEIGHT; y += SAMPLE_STEP) {
			const p = warpPoint(x, y);
			if (first) {
				ctx.moveTo(p.x, p.y);
				first = false;
			} else {
				ctx.lineTo(p.x, p.y);
			}
		}
		ctx.stroke();
	}
}

function render() {
	clear();
	drawGrid();
	// draw masses on top
	for (const m of masses) drawMass(m);
	requestAnimationFrame(render);
}

render();