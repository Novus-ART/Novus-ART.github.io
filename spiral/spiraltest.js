// --- DOM Elements ---
// ... (no changes)
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const freehandModeBtn = document.getElementById('freehandModeBtn');
const followModeBtn = document.getElementById('followModeBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const generatePlotsBtn = document.getElementById('generatePlotsBtn');
const plotsContainer = document.getElementById('plotsContainer');
const xPlotCanvas = document.getElementById('xPlotCanvas').getContext('2d');
const yPlotCanvas = document.getElementById('yPlotCanvas').getContext('2d');


// --- State Variables ---
// ... (no changes)
let isDrawing = false;
let drawingMode = 'freehand';
let lastX = 0;
let lastY = 0;
let startTime = 0;
let recordedData = []; // Stores ONLY [userX, userY, time]
let templatePoints = []; // Stores [templateX, templateY, angle]
let xChartInstance = null;
let yChartInstance = null;

// --- Drawing Configuration ---
// ... (no changes)
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const USER_LINE_COLOR = '#0031ED';
const USER_LINE_WIDTH = 2;
const TEMPLATE_LINE_COLOR = '#AAAAAA';
const TEMPLATE_LINE_WIDTH = 1;
const TEMPLATE_LOOPS = 3;
const TEMPLATE_POINTS_PER_LOOP = 100;

// --- Initialization ---
// ... (no changes)
function initialize() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    plotsContainer.classList.add('hidden');
    setMode('freehand');
    addEventListeners();
    console.log("Spiral Test Initialized. Current time:", new Date().toLocaleString());
}

// --- Event Listeners ---
// ... (no changes)
function addEventListeners() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    freehandModeBtn.addEventListener('click', () => setMode('freehand'));
    followModeBtn.addEventListener('click', () => setMode('follow'));
    clearBtn.addEventListener('click', clearCanvas);
    exportBtn.addEventListener('click', exportData);
    generatePlotsBtn.addEventListener('click', generatePlots);
}

// --- Mode Handling ---
// ... (no changes)
function setMode(newMode) {
    if (drawingMode === newMode) return;
    drawingMode = newMode;
    freehandModeBtn.classList.toggle('active', newMode === 'freehand');
    followModeBtn.classList.toggle('active', newMode === 'follow');
    clearCanvas();
    console.log(`Mode changed to: ${drawingMode}`);
}

// --- Drawing Functions ---
// getCoordinates, startDrawing, draw remain the same
function getCoordinates(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (event.touches && event.touches.length > 0) {
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
    } else {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    }
    x = Math.max(0, Math.min(CANVAS_WIDTH, x));
    y = Math.max(0, Math.min(CANVAS_HEIGHT, y));
    return { x, y };
}

function startDrawing(event) {
    isDrawing = true;
    const coords = getCoordinates(event);
    [lastX, lastY] = [coords.x, coords.y];
    startTime = performance.now();
    recordedData = []; // Clear previous data
    recordDataPoint(lastX, lastY, 0); // Record the first point
    ctx.strokeStyle = USER_LINE_COLOR;
    ctx.lineWidth = USER_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    console.log("Drawing started.");
}

function draw(event) {
    if (!isDrawing) return;
    const coords = getCoordinates(event);
    const currentTime = performance.now();
    const elapsedTime = currentTime - startTime;
    recordDataPoint(coords.x, coords.y, elapsedTime); // Record subsequent points
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    [lastX, lastY] = [coords.x, coords.y];
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    console.log(`Drawing stopped. Recorded ${recordedData.length} points.`);
    // ---> REMOVED call to processDataWithTemplate()
}

// --- Data Recording ---
// Stays the same - only records 3 columns
function recordDataPoint(x, y, time) {
    recordedData.push([x.toFixed(2), y.toFixed(2), time.toFixed(2)]);
}

// --- Post-Processing for Follow Mode ---
// ---> REMOVE the entire processDataWithTemplate function <---
/*
function processDataWithTemplate() {
    // ... function removed ...
}
*/

// --- Canvas Operations ---
// clearCanvas remains the same (still calls clearPlots and drawTemplateSpiral)
function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    recordedData = [];
    isDrawing = false;
    clearPlots(); // Clear plots when clearing canvas
    if (drawingMode === 'follow') {
        drawTemplateSpiral(); // Redraw template if in follow mode
    } else {
         templatePoints = []; // Clear template points if in freehand mode
    }
    console.log("Canvas cleared.");
}

// drawTemplateSpiral remains the same
function drawTemplateSpiral() {
    templatePoints = [];
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const maxRadius = Math.min(centerX, centerY) - 15;
    const a = 0;
    const b = maxRadius / (TEMPLATE_LOOPS * 2 * Math.PI);
    ctx.strokeStyle = TEMPLATE_LINE_COLOR;
    ctx.lineWidth = TEMPLATE_LINE_WIDTH;
    ctx.beginPath();
    const totalPoints = TEMPLATE_LOOPS * TEMPLATE_POINTS_PER_LOOP;
    for (let i = 0; i <= totalPoints; i++) {
        const angle = (i / TEMPLATE_POINTS_PER_LOOP) * 2 * Math.PI;
        const radius = a + b * angle;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        templatePoints.push([x, y, angle]); // Store [x, y, angle]
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    console.log(`Template spiral drawn with ${TEMPLATE_LOOPS} loops. Stored ${templatePoints.length} points.`);
}


// --- Plotting Functions ---
// clearPlots remains the same
function clearPlots() {
    if (xChartInstance) {
        xChartInstance.destroy();
        xChartInstance = null;
    }
    if (yChartInstance) {
        yChartInstance.destroy();
        yChartInstance = null;
    }
    plotsContainer.classList.add('hidden');
    console.log("Plots cleared.");
}

// ---> Modify generatePlots to do on-the-fly mapping <---
function generatePlots() {
    if (recordedData.length === 0) {
        alert("No data recorded yet. Please draw a spiral first.");
        return;
    }

    clearPlots(); // Clear previous plots

    // Extract user data (always 3 columns)
    const timeData = recordedData.map(point => parseFloat(point[2]));
    const userXData = recordedData.map(point => parseFloat(point[0]));
    const userYData = recordedData.map(point => parseFloat(point[1]));

    let plotTemplateXData = []; // Temporary array for plot template X
    let plotTemplateYData = []; // Temporary array for plot template Y
    let plotTemplateDataAvailable = false;

    // --- On-the-fly mapping calculation (ONLY if in follow mode) ---
    if (drawingMode === 'follow' && templatePoints.length > 0 && recordedData.length > 0) {
        console.log("Calculating temporary template points for plotting using time-proportional mapping...");
        const totalUserTime = timeData[timeData.length - 1]; // Get last timestamp
        const totalTemplateAngle = TEMPLATE_LOOPS * 2 * Math.PI;

        if (totalUserTime > 0) {
            for (const userTime of timeData) {
                const expectedAngle = (userTime / totalUserTime) * totalTemplateAngle;

                // Find closest template point by angle (same logic as before)
                let closestPoint = templatePoints[0];
                let minAngleDiff = Math.abs(expectedAngle - closestPoint[2]);
                for (let i = 1; i < templatePoints.length; i++) {
                    const currentDiff = Math.abs(expectedAngle - templatePoints[i][2]);
                    if (currentDiff < minAngleDiff) {
                        minAngleDiff = currentDiff;
                        closestPoint = templatePoints[i];
                    }
                }
                plotTemplateXData.push(closestPoint[0]); // Store calculated X
                plotTemplateYData.push(closestPoint[1]); // Store calculated Y
            }
            plotTemplateDataAvailable = true; // Mark data as available for plotting
            console.log("Temporary template points calculated.");
        } else {
             console.warn("Total user time is zero, cannot map template for plotting.");
             // Optionally fill with first point or NaNs
             for (let i = 0; i < recordedData.length; i++) {
                 plotTemplateXData.push(templatePoints[0][0]);
                 plotTemplateYData.push(templatePoints[0][1]);
             }
              plotTemplateDataAvailable = true; // Mark data as available for plotting (using first point)
        }
    }
    // --- End of on-the-fly mapping ---

    // Basic Chart.js options common to both plots (same as before)
     const commonOptions = { /* ... */ }; // Keep your existing commonOptions

    // --- Configure X Plot ---
    const xPlotDatasets = [
        {
            label: 'User X',
            data: userXData, // Use original user data
            borderColor: 'rgba(0, 0, 255, 0.9)',
            backgroundColor: 'rgba(0, 0, 255, 0.1)',
            borderWidth: 1.5, fill: false,
            // pointRadius: 0, tension: 0.1 // Add these back if desired
        }
    ];
    // Conditionally add template dataset for X plot if calculated
    if (plotTemplateDataAvailable) {
        xPlotDatasets.push({
            label: 'Template X (Mapped)', // Indicate mapping in label
            data: plotTemplateXData,      // Use the *temporarily calculated* data
            borderColor: 'rgba(128, 128, 128, 0.9)',
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
            borderWidth: 1, borderDash: [5, 5], fill: false,
             // pointRadius: 0, tension: 0.1 // Add these back if desired
        });
    }
     const xPlotConfig = {
        type: 'line',
        data: { labels: timeData, datasets: xPlotDatasets }, // Plot against user's timeData
        options: { /* ... keep your existing merged X plot options ... */ }
    };

    // --- Configure Y Plot ---
    const yPlotDatasets = [
        {
            label: 'User Y',
            data: userYData, // Use original user data
            borderColor: 'rgba(255, 0, 0, 0.9)',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderWidth: 1.5, fill: false,
             // pointRadius: 0, tension: 0.1 // Add these back if desired
        }
    ];
     // Conditionally add template dataset for Y plot if calculated
    if (plotTemplateDataAvailable) {
        yPlotDatasets.push({
            label: 'Template Y (Mapped)', // Indicate mapping in label
            data: plotTemplateYData,      // Use the *temporarily calculated* data
            borderColor: 'rgba(128, 128, 128, 0.9)',
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
            borderWidth: 1, borderDash: [5, 5], fill: false,
             // pointRadius: 0, tension: 0.1 // Add these back if desired
        });
    }
     const yPlotConfig = {
        type: 'line',
        data: { labels: timeData, datasets: yPlotDatasets }, // Plot against user's timeData
        options: { /* ... keep your existing merged Y plot options ... */ }
    };

    // --- Render Plots ---
    plotsContainer.classList.remove('hidden');
    xChartInstance = new Chart(xPlotCanvas, xPlotConfig);
    yChartInstance = new Chart(yPlotCanvas, yPlotConfig);
    console.log("Plots generated using on-the-fly mapping for template visualization.");
}


// --- Data Export ---
// ---> Modify export to ONLY handle 3 columns <---
function exportData() {
    if (recordedData.length === 0) {
        alert("No data recorded yet. Please draw a spiral first.");
        return;
    }

    // Data is always [userX, userY, time]
    const header = "X,Y,Time(ms)\n"; // Simple 3-column header

    // Ensure only first 3 columns are joined, even if something unexpected happened
    const csvRows = recordedData.map(row => row.slice(0, 3).join(',')).join('\n');
    const csvContent = header + csvRows;

    // Blob and download link creation (same as before)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // File name no longer needs mode distinction based on columns
    const filename = `spiral_data_${timestamp}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`Data exported as ${filename} (User X, Y, Time only).`);
}

// --- Start the application ---
initialize();