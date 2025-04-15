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
let recordedData = []; // Array to store data points
let templatePoints = []; // Array to store [x, y, angle] for the template spiral

// --- Drawing Configuration ---
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const USER_LINE_COLOR = '#0000FF'; // Blue for user drawing
const USER_LINE_WIDTH = 2;
const TEMPLATE_LINE_COLOR = '#AAAAAA'; // Light gray for template
const TEMPLATE_LINE_WIDTH = 1;
const TEMPLATE_LOOPS = 3; // Number of spiral loops for the template
const TEMPLATE_POINTS_PER_LOOP = 100; // Adjust for smoothness

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
    clearCanvas(); // Clear canvas and data when switching modes
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

    // Clear previous user data ONLY. Template data persists if mode is 'follow'
    recordedData = [];

    // Record the very first point (time = 0)
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

    // Record data point (template coords will be added later if needed)
    recordDataPoint(coords.x, coords.y, elapsedTime);

    // Draw line segment
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Update last coordinates for the *next* segment
    [lastX, lastY] = [coords.x, coords.y];
    // Keep the path open
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    // Don't close the user path here if we want to potentially add more later?
    // It's probably fine to leave it open or close it. Let's close it.
    // If you uncomment stroke/close below, it might draw a final line segment back
    // to the start if the path wasn't properly managed - be careful.
    // ctx.stroke(); // Ensure last segment is drawn (draw() already does this)
    // ctx.closePath();

    console.log(`Drawing stopped. Recorded ${recordedData.length} points.`);

    // If in follow mode, process the data to add template coordinates
    if (drawingMode === 'follow' && recordedData.length > 0) {
        processDataWithTemplate();
    }
}

// --- Data Recording ---
function recordDataPoint(x, y, time) {
    // Initially record only user data
    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, x)).toFixed(2);
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, y)).toFixed(2);
    recordedData.push([clampedX, clampedY, time.toFixed(2)]);
}

// --- Post-Processing for Follow Mode ---
function processDataWithTemplate() {
    if (!templatePoints || templatePoints.length === 0 || recordedData.length === 0) {
        console.warn("Cannot process data with template: Missing template or user data.");
        return;
    }

    const totalUserTime = parseFloat(recordedData[recordedData.length - 1][2]); // Get time of last point
    const totalTemplateAngle = TEMPLATE_LOOPS * 2 * Math.PI;

    if (totalUserTime <= 0) {
        console.warn("Total drawing time is zero, cannot map to template.");
        // Assign the first template point to all user points? Or leave empty? Let's leave empty.
        // Alternative: assign templatePoints[0] coordinates to all.
         recordedData.forEach(point => {
             point.push(templatePoints[0][0].toFixed(2)); // template X
             point.push(templatePoints[0][1].toFixed(2)); // template Y
         });
        return;
    }

    // Find the template point corresponding to the user's time progression
    recordedData.forEach(point => {
        const userTime = parseFloat(point[2]);
        // Calculate the expected angle progress based on time fraction
        const expectedAngle = (userTime / totalUserTime) * totalTemplateAngle;

        // Find the closest template point by angle
        let closestPoint = templatePoints[0];
        let minAngleDiff = Math.abs(expectedAngle - closestPoint[2]); // templatePoints stores [x, y, angle]

        for (let i = 1; i < templatePoints.length; i++) {
            const currentDiff = Math.abs(expectedAngle - templatePoints[i][2]);
            if (currentDiff < minAngleDiff) {
                minAngleDiff = currentDiff;
                closestPoint = templatePoints[i];
            }
        }

        // Add the template coordinates to the user data point
        point.push(closestPoint[0].toFixed(2)); // template X
        point.push(closestPoint[1].toFixed(2)); // template Y
        // point now looks like [userX, userY, time, templateX, templateY]
    });

    console.log("Processed user data with corresponding template points.");
}


// --- Canvas Operations ---
function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    recordedData = []; // Clear user data
    // We don't clear templatePoints here, drawTemplateSpiral handles regenerating it
    isDrawing = false; // Ensure drawing stops

    if (drawingMode === 'follow') {
        drawTemplateSpiral(); // Redraws and refills templatePoints
    } else {
         templatePoints = []; // Explicitly clear if not in follow mode
    }
    console.log("Canvas cleared.");
}

function drawTemplateSpiral() {
    templatePoints = []; // Clear previous template points before redrawing
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const maxRadius = Math.min(centerX, centerY) - 10; // Leave some margin
    const a = 0; // Starting radius (center)
    const b = maxRadius / (TEMPLATE_LOOPS * 2 * Math.PI); // Controls tightness

    ctx.strokeStyle = TEMPLATE_LINE_COLOR;
    ctx.lineWidth = TEMPLATE_LINE_WIDTH;
    ctx.beginPath();
    // Don't moveTo center if a=0, start calculation from first point
    // ctx.moveTo(centerX, centerY);

    const totalPoints = TEMPLATE_LOOPS * TEMPLATE_POINTS_PER_LOOP;

    for (let i = 0; i <= totalPoints; i++) {
        const angle = (i / TEMPLATE_POINTS_PER_LOOP) * 2 * Math.PI;
        const radius = a + b * angle;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Store the point
        templatePoints.push([x, y, angle]);

        // Draw the line segment
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    // ctx.closePath(); // Don't close path for an open spiral
    console.log(`Template spiral drawn. Stored ${templatePoints.length} points.`);
}

// --- Data Export ---
function exportData() {
    if (recordedData.length === 0) {
        alert("No data recorded yet. Please draw a spiral first.");
        return;
    }

    let header = "";
    let csvContent = "";

    // Check if data includes template coordinates (5 columns)
    // This relies on processDataWithTemplate having run successfully in 'follow' mode
    const hasTemplateData = recordedData[0].length === 5;

    if (drawingMode === 'follow' && hasTemplateData) {
        header = "User_X,User_Y,Time(ms),Template_X,Template_Y\n";
    } else if (drawingMode === 'follow' && !hasTemplateData) {
         console.warn("Exporting in Follow mode, but template data wasn't added. Exporting User data only.");
         header = "User_X,User_Y,Time(ms),Template_X(Error),Template_Y(Error)\n"; // Indicate error
    }
     else { // freehand mode
        header = "X,Y,Time(ms)\n";
    }

    // Create CSV rows
    const csvRows = recordedData.map(row => row.join(',')).join('\n');
    csvContent = header + csvRows;

    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `spiral_data_${drawingMode}_${timestamp}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
    console.log(`Data exported as ${filename}`);
}

// --- Start the application ---
initialize();