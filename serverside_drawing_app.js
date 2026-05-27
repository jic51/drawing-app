// This is illustrative Node.js (Express) like pseudo-code
// A real implementation would involve a database (MongoDB, PostgreSQL, etc.) and user authentication.

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// In a real app, this would be a database. For demo, a simple object.
const storedDrawings = {}; // { drawingId: { drawingData, expiryTimestamp, recipientId } }
let drawingIdCounter = 0;

// --- API Endpoint to receive drawings ---
app.post('/api/drawings', (req, res) => {
    const { width, height, strokes, senderId, recipientId } = req.body;

    if (!strokes || !recipientId || !senderId) {
        return res.status(400).send('Missing drawing data or recipient/sender info.');
    }

    drawingIdCounter++;
    const drawingId = `drawing-${drawingIdCounter}`;
    const expiryTimestamp = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now

    storedDrawings[drawingId] = {
        drawingData: { width, height, strokes, senderId, recipientId },
        expiryTimestamp: expiryTimestamp,
        recipientId: recipientId,
        sentAt: Date.now() // For logging/debugging
    };

    console.log(`Drawing ${drawingId} received from ${senderId} for ${recipientId}. Expires at ${new Date(expiryTimestamp).toLocaleTimeString()}.`);
    
    // In a real app, you'd trigger a push notification or WebSocket message to recipient
    // For now, we'll just acknowledge the save.
    res.status(200).json({ message: 'Drawing saved successfully!', drawingId: drawingId });
});

// --- API Endpoint to retrieve drawings for a user ---
app.get('/api/drawings/:userId', (req, res) => {
    const userId = req.params.userId;
    const now = Date.now();
    const drawingsForUser = [];

    for (const id in storedDrawings) {
        const drawingEntry = storedDrawings[id];
        if (drawingEntry.recipientId === userId && drawingEntry.expiryTimestamp > now) {
            drawingsForUser.push({
                drawingId: id,
                drawingData: drawingEntry.drawingData,
                expiresInMs: drawingEntry.expiryTimestamp - now
            });
        }
    }

    if (drawingsForUser.length > 0) {
        res.status(200).json(drawingsForUser);
    } else {
        res.status(200).json([]); // No drawings or all expired
    }
});

// --- Background job to delete expired drawings (CRON job or similar) ---
function cleanupExpiredDrawings() {
    const now = Date.now();
    for (const id in storedDrawings) {
        if (storedDrawings[id].expiryTimestamp <= now) {
            console.log(`Deleting expired drawing: ${id}`);
            delete storedDrawings[id];
        }
    }
    // Run this cleanup periodically, e.g., every minute
    setTimeout(cleanupExpiredDrawings, 60 * 1000); 
}

// Start the server and the cleanup process
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    cleanupExpiredDrawings(); // Start the cleanup process
});