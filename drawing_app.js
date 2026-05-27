        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        const sendButton = document.getElementById('sendButton');
        const undoButton = document.getElementById('undoButton');
        const saveButton = document.getElementById('saveButton');
        const saveOptions = document.getElementById('saveOptions');
        const saveStaticButton = document.getElementById('saveStatic');
        const saveReplayButton = document.getElementById('saveReplay');
        const statusMessage = document.getElementById('statusMessage');
        const receivedDrawingContainer = document.getElementById('receivedDrawingContainer');
        const recipientIdInput = document.getElementById('recipientId');
        const currentUserIdDisplay = document.getElementById('currentUserId');
        const authContainer = document.getElementById('authContainer');
        const loginForm = document.getElementById('loginForm');
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        const loginButton = document.getElementById('loginButton');
        const registerButton = document.getElementById('registerButton');
        const googleButton = document.getElementById('googleButton');
        const signOutButton = document.getElementById('signOutButton');
        const appContainer = document.getElementById('appContainer');
        const authStatusMessage = document.getElementById('authStatusMessage');
        
        // Drawing state
        let isDrawing = false;
        let hasSentDrawing = false;
        const brushWidth = 4;
        let hue = 0;
        let recordedStrokes = [];
        let lastTimestamp = 0;
        let currentStrokeId = 0;
        
        let lastX = 0;
        let lastY = 0;
        
        // Replay state
        let isReplaying = false;
        let replayTimeout;
        
        // Placeholder for user data
        const userData = {
            name: 'Creative Canvas User',
            profilePicUrl: 'https://placehold.co/40x40/5a1f6a/FFFFFF?text=P'
        };
        
        // --- Firebase Setup ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // Global variables provided by the Canvas environment
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        
        // Enable debug logging for Firestore
        setLogLevel('Debug');
        
        let userId = null;
        
        // Authenticate user and listen for new messages
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                currentUserIdDisplay.textContent = `Your User ID: ${userId}`;
                console.log(`User authenticated with ID: ${userId}`);
        
                // Show the main app and hide the auth form
                authContainer.style.display = 'none';
                appContainer.style.display = 'flex';
        
                // Set up real-time listener for incoming messages
                const messagesRef = collection(db, `artifacts/${appId}/public/data/messages`);
                const q = query(messagesRef, where("recipientId", "==", userId));
                onSnapshot(q, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            console.log("New message received:", change.doc.data());
                            displayReceivedDrawing(change.doc.data());
                        }
                    });
                });
            } else {
                // Show the auth form and hide the main app
                authContainer.style.display = 'flex';
                appContainer.style.display = 'none';
                userId = null;
                currentUserIdDisplay.textContent = '';
            }
        });
        
        
        // --- Authentication Handlers ---
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                authStatusMessage.textContent = "Logged in successfully!";
            } catch (error) {
                authStatusMessage.textContent = `Login failed: ${error.message}`;
            }
        });
        
        registerButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                authStatusMessage.textContent = "Registered and logged in successfully!";
            } catch (error) {
                authStatusMessage.textContent = `Registration failed: ${error.message}`;
            }
        });
        
        googleButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                authStatusMessage.textContent = "Signed in with Google!";
            } catch (error) {
                authStatusMessage.textContent = `Google sign-in failed: ${error.message}`;
            }
        });
        
        signOutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                clearCanvas();
                authStatusMessage.textContent = "Signed out successfully.";
            } catch (error) {
                authStatusMessage.textContent = `Sign out failed: ${error.message}`;
            }
        });
        
        
        // --- Canvas Setup ---
        function resizeCanvas() {
            const rect = canvas.parentNode.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.lineWidth = brushWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (recordedStrokes.length > 0) {
                redrawCanvas();
            }
        }
        window.addEventListener('load', resizeCanvas);
        window.addEventListener('resize', resizeCanvas);
        
        ctx.lineWidth = brushWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // --- Rainbow Color Function ---
        function getRainbowColor() {
            hue = (hue + 1) % 360;
            return `hsl(${hue}, 100%, 50%)`;
        }
        
        // --- Drawing Functions ---
        function startDrawing(e) {
            e.preventDefault();
        
            if (e.button !== 0 && !e.touches) {
                return;
            }
        
            if (isReplaying) {
                // Stop replay and clear canvas with a single click
                stopReplay();
                clearCanvas();
                return;
            }
        
            if (hasSentDrawing) {
                // This case is now handled by the isReplaying block
                return;
            }
        
            isDrawing = true;
            currentStrokeId++;
            const { offsetX, offsetY } = getEventCoords(e);
        
            lastX = offsetX;
            lastY = offsetY;
        
            lastTimestamp = performance.now();
            recordedStrokes.push({
                type: 'start',
                x: offsetX,
                y: offsetY,
                timestampOffset: 0,
                strokeId: currentStrokeId
            });
        }
        
        function draw(e) {
            if (!isDrawing) return;
            const { offsetX, offsetY } = getEventCoords(e);
        
            ctx.strokeStyle = getRainbowColor();
        
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
        
            lastX = offsetX;
            lastY = offsetY;
        
            const currentTimestamp = performance.now();
            recordedStrokes.push({
                type: 'draw',
                x: offsetX,
                y: offsetY,
                color: ctx.strokeStyle,
                timestampOffset: currentTimestamp - lastTimestamp,
                strokeId: currentStrokeId
            });
            lastTimestamp = currentTimestamp;
        }
        
        function stopDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            recordedStrokes.push({ type: 'end', timestampOffset: 0, strokeId: currentStrokeId });
        }
        
        // --- New and more reliable coordinate function ---
        function getEventCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                offsetX: clientX - rect.left,
                offsetY: clientY - rect.top
            };
        }
        
        // --- Replay and Control Functions ---
        
        function stopReplay() {
            isReplaying = false;
            clearTimeout(replayTimeout);
            statusMessage.textContent = 'Replay stopped. Draw a new masterpiece!';
            sendButton.disabled = false;
        }
        
        async function replayDrawing(drawingData) {
            isReplaying = true;
        
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        
            let lastReplayX = 0;
            let lastReplayY = 0;
        
            for (let i = 0; i < drawingData.strokes.length && isReplaying; i++) {
                const stroke = drawingData.strokes[i];
        
                if (stroke.timestampOffset > 0) {
                    await new Promise(resolve => setTimeout(resolve, stroke.timestampOffset));
                }
        
                if (!isReplaying) {
                    return;
                }
        
                switch (stroke.type) {
                    case 'start':
                        lastReplayX = stroke.x;
                        lastReplayY = stroke.y;
                        break;
                    case 'draw':
                        ctx.strokeStyle = stroke.color;
                        ctx.beginPath();
                        ctx.moveTo(lastReplayX, lastReplayY);
                        ctx.lineTo(stroke.x, stroke.y);
                        ctx.stroke();
                        lastReplayX = stroke.x;
                        lastReplayY = stroke.y;
                        break;
                    case 'end':
                        break;
                }
            }
        
            if (isReplaying) {
                replayTimeout = setTimeout(() => {
                    replayDrawing(drawingData);
                }, 500);
            }
        }
        
        // Undo function
        function undoStroke() {
            if (isReplaying || recordedStrokes.length === 0) return;
        
            const lastStrokeId = recordedStrokes[recordedStrokes.length - 1].strokeId;
            recordedStrokes = recordedStrokes.filter(stroke => stroke.strokeId !== lastStrokeId);
        
            redrawCanvas();
            statusMessage.textContent = 'Last stroke undone.';
        }
        
        // Save function (updated to show options)
        function saveDrawing() {
            if (recordedStrokes.length === 0) {
                statusMessage.textContent = 'Draw something to save!';
                return;
            }
            statusMessage.textContent = 'Choose a download option:';
            saveOptions.style.display = 'flex';
        }
        
        // New save functions for static and replay versions
        async function saveStaticDrawing() {
            // Clear the canvas and redraw everything with a white background for a clean download
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            redrawCanvas();
        
            const originalImage = canvas.toDataURL('image/png');
            const finalImage = await addCreatorInfo(originalImage, '#000000', '#FFFFFF'); // Black text on white background
            downloadImage(finalImage, 'rainbow_drawing_static.png');
            statusMessage.textContent = 'Static drawing saved!';
            hideSaveOptions();
            // Redraw the canvas with the original dark background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            redrawCanvas();
        }
        
        async function saveReplayDrawing() {
            statusMessage.textContent = 'Generating video... this may take a moment.';
            hideSaveOptions();
            
            // Create a temporary, off-screen canvas for a clean recording
            const recordingCanvas = document.createElement('canvas');
            recordingCanvas.width = canvas.width;
            recordingCanvas.height = canvas.height;
            const recordingCtx = recordingCanvas.getContext('2d');
            
            const stream = recordingCanvas.captureStream(60); // 60 FPS
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const videoChunks = [];
        
            recorder.ondataavailable = (e) => videoChunks.push(e.data);
            recorder.onstop = () => {
                const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(videoBlob);
                downloadImage(videoUrl, 'rainbow_drawing_replay.webm');
                statusMessage.textContent = 'Replay video saved!';
                URL.revokeObjectURL(videoUrl);
            };
        
            recorder.start();
            await recordDrawing(recordingCtx);
            recorder.stop();
        }
        
        async function recordDrawing(context) {
            // Clear the recording canvas and set up initial state for a clean video
            context.clearRect(0, 0, canvas.width, canvas.height);
            let lastX_record = 0;
            let lastY_record = 0;
            
            // Draw signature
            drawSignatureOnCanvas(context, '#e0e0e0', '#1a1a1a');
        
            for (let i = 0; i < recordedStrokes.length; i++) {
                const stroke = recordedStrokes[i];
                
                if (stroke.timestampOffset > 0) {
                    await new Promise(resolve => setTimeout(resolve, stroke.timestampOffset));
                }
        
                switch (stroke.type) {
                    case 'start':
                        lastX_record = stroke.x;
                        lastY_record = stroke.y;
                        break;
                    case 'draw':
                        context.strokeStyle = stroke.color;
                        context.beginPath();
                        context.moveTo(lastX_record, lastY_record);
                        context.lineTo(stroke.x, stroke.y);
                        context.stroke();
                        lastX_record = stroke.x;
                        lastY_record = stroke.y;
                        break;
                }
            }
        }
        
        function hideSaveOptions() {
            saveOptions.style.display = 'none';
        }
        
        function downloadImage(dataUrl, filename) {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        
        // Function to draw the creator's info on a given context
        function drawSignatureOnCanvas(context, textColor, bgColor) {
            const text = `Created by ${userData.name}`;
            const profilePicSize = 24;
            const padding = 10;
            
            // Measure text to determine background box size
            context.font = '20px Arial';
            const textWidth = context.measureText(text).width;
            const totalWidth = textWidth + profilePicSize + 15;
            const totalHeight = 35; // A fixed height for the signature box
        
            // Calculate position
            const boxX = canvas.width - totalWidth - padding;
            const boxY = canvas.height - totalHeight - padding;
        
            // Draw a semi-transparent box behind the text
            context.fillStyle = 'rgba(26, 26, 26, 0.5)'; // A universal color that works on both white and black backgrounds
            context.fillRect(boxX, boxY, totalWidth, totalHeight);
        
            // Draw the profile picture placeholder
            context.fillStyle = userData.profilePicUrl.includes('placeholder') ? '#6a1b9a' : bgColor;
            context.beginPath();
            context.arc(boxX + profilePicSize / 2 + 5, boxY + profilePicSize / 2 + 5, profilePicSize / 2, 0, Math.PI * 2);
            context.fill();
        
            // Draw the text
            context.fillStyle = textColor;
            context.fillText(text, boxX + profilePicSize + 10, boxY + 25);
        }
        
        
        // Function to add creator's info to the image
        async function addCreatorInfo(imageDataUrl, textColor, bgColor) {
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            const image = new Image();
        
            return new Promise(resolve => {
                image.onload = () => {
                    finalCanvas.width = image.width;
                    finalCanvas.height = image.height;
                    finalCtx.fillStyle = bgColor;
                    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                    finalCtx.drawImage(image, 0, 0);
        
                    drawSignatureOnCanvas(finalCtx, textColor, bgColor);
        
                    resolve(finalCanvas.toDataURL('image/png'));
                };
                image.src = imageDataUrl;
            });
        }
        
        // Redraw all recorded strokes
        function redrawCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        
            let lastRedrawX = 0;
            let lastRedrawY = 0;
        
            ctx.lineWidth = brushWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        
            recordedStrokes.forEach(stroke => {
                switch (stroke.type) {
                    case 'start':
                        lastRedrawX = stroke.x;
                        lastRedrawY = stroke.y;
                        break;
                    case 'draw':
                        ctx.strokeStyle = stroke.color;
                        ctx.beginPath();
                        ctx.moveTo(lastRedrawX, lastRedrawY);
                        ctx.lineTo(stroke.x, stroke.y);
                        ctx.stroke();
                        lastRedrawX = stroke.x;
                        lastRedrawY = stroke.y;
                        break;
                    case 'end':
                        break;
                }
            });
        }
        
        // Clear canvas function
        function clearCanvas() {
            stopReplay();
            recordedStrokes = [];
            hasSentDrawing = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            statusMessage.textContent = 'Canvas cleared! Start drawing a new masterpiece!';
        }
        
        // --- Event Listeners and Button Handlers ---
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        undoButton.addEventListener('click', undoStroke);
        saveButton.addEventListener('click', saveDrawing);
        saveStaticButton.addEventListener('click', saveStaticDrawing);
        saveReplayButton.addEventListener('click', saveReplayDrawing);
        
        sendButton.addEventListener('click', async () => {
            if (recordedStrokes.length === 0) {
                statusMessage.textContent = 'Draw something before sending!';
                return;
            }
            const recipientId = recipientIdInput.value.trim();
            if (!recipientId) {
                statusMessage.textContent = 'Please enter a recipient User ID!';
                return;
            }
        
            statusMessage.textContent = 'Sending drawing...';
            sendButton.disabled = true;
            
            const drawingData = {
                senderId: userId,
                recipientId: recipientId,
                strokes: JSON.stringify(recordedStrokes), // Store as a JSON string
                timestamp: Timestamp.now()
            };
        
            try {
                const messagesRef = collection(db, `artifacts/${appId}/public/data/messages`);
                await addDoc(messagesRef, drawingData);
                statusMessage.textContent = 'Drawing sent successfully!';
                sendButton.disabled = false;
            } catch (e) {
                console.error("Error sending drawing:", e);
                statusMessage.textContent = 'Failed to send drawing. Please try again.';
                sendButton.disabled = false;
            }
        });
        
        
        // --- Display and Manage Received Drawings (No changes here) ---
        function displayReceivedDrawing(drawingData) {
            stopReplay();
        
            receivedDrawingContainer.innerHTML = '';
        
            const receivedCanvas = document.createElement('canvas');
            receivedCanvas.id = 'receivedDrawingCanvas';
            receivedCanvas.width = canvas.width;
            receivedCanvas.height = canvas.height;
            receivedDrawingContainer.appendChild(receivedCanvas);
        
            const receivedMessage = document.createElement('p');
            receivedMessage.textContent = `New drawing received from ${drawingData.senderId}!`;
            receivedDrawingContainer.appendChild(receivedMessage);
        
            let lastReplayX = 0;
            let lastReplayY = 0;
        
            const strokes = JSON.parse(drawingData.strokes);
        
            async function replayForRecipient() {
              for (let i = 0; i < strokes.length; i++) {
                const stroke = strokes[i];
        
                if (stroke.timestampOffset > 0) {
                    await new Promise(resolve => setTimeout(resolve, stroke.timestampOffset));
                }
        
                switch (stroke.type) {
                    case 'start':
                        lastReplayX = stroke.x;
                        lastReplayY = stroke.y;
                        break;
                    case 'draw':
                        receivedCanvas.getContext('2d').strokeStyle = stroke.color;
                        receivedCanvas.getContext('2d').beginPath();
                        receivedCanvas.getContext('2d').moveTo(lastReplayX, lastReplayY);
                        receivedCanvas.getContext('2d').lineTo(stroke.x, stroke.y);
                        receivedCanvas.getContext('2d').stroke();
                        lastReplayX = stroke.x;
                        lastReplayY = stroke.y;
                        break;
                    case 'end':
                        break;
                }
              }
            }
        
            replayForRecipient();
        }
        
        // Initial status message
        statusMessage.textContent = 'Start drawing your rainbow masterpiece!';