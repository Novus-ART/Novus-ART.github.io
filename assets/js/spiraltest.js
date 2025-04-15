// --- DOM Elements ---
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const freehandModeBtn = document.getElementById('freehandModeBtn');
const followModeBtn = document.getElementById('followModeBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

// --- State Variables ---
let isDrawing = false;
let drawingMode = 'freehand'; // 'freehand' or 'follow'
let lastX = 0;
let lastY = 0;
let startTime = 0;
let recordedData = []; // Array to store [x, y, timestamp_ms]

// --- Drawing Configuration ---
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const USER_LINE_COLOR = '#0000FF'; // Blue for user drawing
const USER_LINE_WIDTH = 2;
const TEMPLATE_LINE_COLOR = '#AAAAAA'; // Light gray for template
const TEMPLATE_LINE_WIDTH = 1;

// --- Initialization ---
function initialize() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setMode('freehand'); // Start in freehand mode
    addEventListeners();
}

// --- Event Listeners ---
function addEventListeners() {
    // Drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing); // Stop if cursor leaves canvas

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing); // Stop if touch is interrupted

    // Button events
    freehandModeBtn.addEventListener('click', () => setMode('freehand'));
    followModeBtn.addEventListener('click', () => setMode('follow'));
    clearBtn.addEventListener('click', clearCanvas);
    exportBtn.addEventListener('click', exportData);
}

// --- Mode Handling ---
function setMode(newMode) {
    drawingMode = newMode;
    // Update button styles
    freehandModeBtn.classList.toggle('active', newMode === 'freehand');
    followModeBtn.classList.toggle('active', newMode === 'follow');
    clearCanvas(); // Clear canvas when switching modes
}

// --- Drawing Functions ---
function getCoordinates(event) {
    event.preventDefault(); // Prevent scrolling/default actions
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (event.touches && event.touches.length > 0) {
        // Touch event
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
    } else {
        // Mouse event
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    }
    return { x, y };
}

function startDrawing(event) {
    isDrawing = true;
    const coords = getCoordinates(event);
    [lastX, lastY] = [coords.x, coords.y];
    startTime = performance.now(); // High-resolution timestamp
    recordedData = []; // Clear previous data

    // Record the very first point
    recordDataPoint(lastX, lastY, 0);

    // Setup drawing style for user input
    ctx.strokeStyle = USER_LINE_COLOR;
    ctx.lineWidth = USER_LINE_WIDTH;
    ctx.beginPath(); // Start a new path for the user's drawing
    ctx.moveTo(lastX, lastY);
}

function draw(event) {
    if (!isDrawing) return;

    const coords = getCoordinates(event);
    const currentTime = performance.now();
    const elapsedTime = currentTime - startTime;

    // Record data point
    recordDataPoint(coords.x, coords.y, elapsedTime);

    // Draw line segment
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Update last coordinates for the *next* segment
    [lastX, lastY] = [coords.x, coords.y];
     // Keep the path open (don't call ctx.beginPath() here) to draw a continuous line
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath(); // Close the user's drawing path
    console.log(`Drawing stopped. Recorded ${recordedData.length} points.`);
}

// --- Data Recording ---
function recordDataPoint(x, y, time) {
    // Ensure coordinates are within canvas bounds (optional, but good practice)
    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, x));
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, y));
    recordedData.push([clampedX.toFixed(2), clampedY.toFixed(2), time.toFixed(2)]);
}

// --- Canvas Operations ---
function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    recordedData = []; // Clear data when clearing canvas
    isDrawing = false; // Ensure drawing stops if cleared mid-draw

    if (drawingMode === 'follow') {
        drawTemplateSpiral();
    }
    console.log("Canvas cleared.");
}

function drawTemplateSpiral() {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const maxRadius = Math.min(centerX, centerY) - 10; // Leave some margin
    const loops = 5; // Number of spiral loops
    const a = 0; // Starting radius (center)
    const b = maxRadius / (loops * 2 * Math.PI); // Controls tightness

    ctx.strokeStyle = TEMPLATE_LINE_COLOR;
    ctx.lineWidth = TEMPLATE_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY); // Start at the center

    const pointsPerLoop = 100; // Adjust for smoothness
    const totalPoints = loops * pointsPerLoop;

    for (let i = 0; i <= totalPoints; i++) {
        const angle = (i / pointsPerLoop) * 2 * Math.PI;
        const radius = a + b * angle;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.closePath(); // Close the template path
    console.log("Template spiral drawn.");
}

// --- Data Export ---
function exportData() {
    if (recordedData.length === 0) {
        alert("No data recorded yet. Please draw a spiral first.");
        return;
    }

    // Create CSV header and rows
    const header = "X,Y,Time(ms)\n";
    const csvRows = recordedData.map(row => row.join(',')).join('\n');
    const csvContent = header + csvRows;

    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    // Create a somewhat unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `spiral_data_${drawingMode}_${timestamp}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Append, click, and remove the link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the blob URL
    console.log(`Data exported as ${filename}`);
}

// --- Start the application ---
initialize();