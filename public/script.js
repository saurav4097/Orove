let isPaused = false; // Track pause state
let currentIndex = 0; // Track writing progress
let rawText = ""; // Store text for resuming
let currentText = ""; // Store full text to be written

let utterance; // Global speech instance
const baseURL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://orove-node1.onrender.com";

async function performSearch() {
    const searchInput = document.getElementById("searchInput").value.trim();
    if (!searchInput) {
        alert("Please enter a search query.");
        return;
    }

    try {
        const response = await fetch(`${baseURL}/api/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: searchInput }),
        });
        const blackboard = document.getElementById("blackboard");
        blackboard.innerHTML = '<div id="loadingSpinner" class="spinner"></div>'; // Show loading spinner
        const data = await response.json();
        if (data.response) {
           
            blackboard.innerHTML = ""; // Clear old text but keep the board

            currentIndex = 0; // Reset index for new text
            rawText = ""; // Reset stored text
            currentText = data.response; // Store full text
            writeTextSlowly(blackboard, currentText); // Call function to write slowly
            setTimeout(() => updateNotes(searchInput), 2000);
        } else {
            document.getElementById("blackboard").innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("blackboard").innerHTML = `<p>Server error: ${error.message}</p>`;
    }
    document.getElementById("searchInput").value = "";
}




// Function to animate text on the blackboard

function writeAndSpeakText(text) {
    // Stop any previous speech before starting new one
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    const canvas = document.getElementById("blackboard");
    const ctx = canvas.getContext("2d");

    // Clear and set up the board
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Chalkduster, cursive";

    let words = text.split(" ");
    let index = 0;
    let x = 20, y = 40;
    let lineHeight = 30;
    let maxWidth = canvas.width - 40;

    // Initialize speech
    utterance = new SpeechSynthesisUtterance();
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Make speech say word-by-word (this ensures sync)
    utterance.text = "";
    speechSynthesis.speak(utterance);

    function drawNextWord() {
        if (index < words.length) {
            let word = words[index] + " ";
            let measure = ctx.measureText(word);

            if (x + measure.width > maxWidth) {
                x = 20;  // Reset x to start of line
                y += lineHeight; // Move to next line
            }

            ctx.fillText(word, x, y);
            x += measure.width;

            // Add word to speech dynamically
            utterance.text += word;
            speechSynthesis.cancel(); // Cancel ongoing speech
            speechSynthesis.speak(utterance); // Restart with new word

            index++;
            setTimeout(drawNextWord, 500); // Adjust for sync
        }
    }

    drawNextWord();
}



// Pause function
function pauseText() {
    isPaused = true;
    speechSynthesis.pause(); // Pause speech
}

// Resume function
function resumeText() {
    if (isPaused) {
        isPaused = false;
        speechSynthesis.resume(); // Resume speech
        writeTextSlowly(document.getElementById("blackboard"), currentText, currentIndex, rawText); // Resume text writing
    }
}
// Stop speech on page refresh
window.addEventListener("beforeunload", () => {
    speechSynthesis.cancel();
});


/////////////////speak////////(voice)/////////////////////////////////////////////////////////////////
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1; // Adjust speed (1 is normal)
    utterance.pitch = 1; // Adjust pitch (1 is normal)
    utterance.volume = 1; // Adjust volume (0 to 1)

    speechSynthesis.speak(utterance);
}
////////////////write slow  text//////////////////////////////////////////////////////
function writeTextSlowly(element, text, index = 0, storedText = "") {
    if (index === 0) {
        element.innerHTML = ""; // Clear previous content
        speechSynthesis.cancel(); // Stop any ongoing speech
        speakText(text);  // Start speaking at the beginning
    }

    if (index < text.length && !isPaused) {
        storedText += text[index]; // Store raw text
        element.innerHTML = formatMarkdown(storedText); // Convert to formatted HTML
        
        currentIndex = index + 1; // Save current progress
        rawText = storedText; // Save written text
 

        setTimeout(() => writeTextSlowly(element, text, currentIndex, rawText), 50);
    }
}


////////////format markdown//////////////////////////////////////////////////////////////
function formatMarkdown(text) {
    return text
        .replace(/^# (.*)$/gm, "<h1>$1</h1>")  // Convert "# Heading" to <h1>
        .replace(/^## (.*)$/gm, "<h2>$1</h2>") // Convert "## Heading" to <h2>
        .replace(/^### (.*)$/gm, "<h3>$1</h3>") // Convert "### Heading" to <h3>
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Convert "**Bold**" to <b>
        .replace(/^\* (.*)$/gm, "<li>$1</li>")  // Convert "* Bullet" to <li>
        .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>"); // Wrap <li> items inside <ul>
}




async function sendMessage() {
    const chatInput = document.getElementById("chatInput").value.trim();
    if (!chatInput) return;

    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML += `<div class="chat-message user">${chatInput}</div>`;

    try {
        const response = await fetch(`${baseURL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: chatInput }),
        });

        const data = await response.json();
        if (data.response) {
            chatBox.innerHTML += `<div class="chat-message bot">${data.response}</div>`;
        } else {
            chatBox.innerHTML += `<div class="chat-message bot">Error: ${data.error}</div>`;
        }
    } catch (error) {
        console.error("Error:", error);
        chatBox.innerHTML += `<div class="chat-message bot">Server error</div>`;
    }

    document.getElementById("chatInput").value = "";
    
}



const PDFDocument = require('pdfkit');

app.get('/download/:id', async (req, res) => {
    try {
        const note = await Notes.findById(req.params.id);
        if (!note) return res.status(404).send('Note not found');

        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', `attachment; filename="${note.topic}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        // Function to format text properly
        function formatText(text) {
            const lines = text.split("\n");

            lines.forEach(line => {
                if (line.startsWith("### ")) {
                    doc.fontSize(16).font('Helvetica-Bold').text(line.replace("### ", ""), { underline: true });
                } else if (line.startsWith("## ")) {
                    doc.fontSize(18).font('Helvetica-Bold').text(line.replace("## ", ""), { underline: true });
                } else if (line.startsWith("# ")) {
                    doc.fontSize(20).font('Helvetica-Bold').text(line.replace("# ", ""), { underline: true });
                } else if (line.match(/\*\*(.*?)\*\*/)) {
                    const boldText = line.replace(/\*\*(.*?)\*\*/g, (_, match) => match);
                    doc.fontSize(12).font('Helvetica-Bold').text(boldText);
                } else if (line.startsWith("* ")) {
                    doc.fontSize(12).font('Helvetica').text(`• ${line.substring(2)}`);
                } else {
                    doc.fontSize(12).font('Helvetica').text(line);
                }
            });
        }

        // Title
        doc.fontSize(16).font('Helvetica-Bold').text(`Topic: ${note.topic}\n`, { underline: true });

        // Convert formatted markdown into PDF
        formatText(note.shortnotes);

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

async function updateNotes(topic) {
    try {
        const response = await fetch(`${baseURL}/api/notes?topic=${encodeURIComponent(topic)}`);
        const notes = await response.json();

        console.log("Received notes:", notes); // Debugging output

        const notesTable = document.querySelector("footer table tbody");
        notesTable.innerHTML = ""; // Clear existing notes

        if (notes.length > 0) {
            notes.forEach(note => {
                const row = document.createElement("tr");

                // Topic column
                const topicCell = document.createElement("td");
                topicCell.textContent = note.topic;
                row.appendChild(topicCell);

                // Download button column
                const downloadCell = document.createElement("td");
                const downloadButton = document.createElement("button");
                downloadButton.textContent = "Download PDF";
                downloadButton.onclick = () => window.location.href = `/download/${note._id}`;

                downloadCell.appendChild(downloadButton);
                row.appendChild(downloadCell);

                notesTable.appendChild(row);
            });
        } else {
            notesTable.innerHTML = "<tr><td colspan='2'>No notes found</td></tr>";
        }
    } catch (error) {
        console.error("Error fetching notes:", error);
    }
}


