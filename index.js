const { join } = require('path');
const fs = require('fs');
const cookieParser = require("cookie-parser");

const authenticateUser = require('./middleware/authMiddleware');
const { getGeminiResponse } = require("./geminiHandler");
const PDFDocument = require('pdfkit');
const express = require("express");
const app = express(); // Initialize Express app
const path = require("path");
const mongoose = require("mongoose");
const router = express.Router();
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const User = require("./models/User");
const Notes = require("./models/Notes");
const PORT = process.env.PORT || 3000;
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const your_secret_key = process.env.JWT_SECRET || "supersecurekey";
const jwt = require("jsonwebtoken");
app.use(express.json());
app.use(cors());
app.use(cookieParser()); // Enables reading cookies
// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));


// Database connection
// Database connection
const dbURI = process.env.dbURI;





mongoose.connect(dbURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));


// Serve static files
app.use(express.static(path.join(__dirname, "public")));




app.get('/class', async (req, res) => {
    try {
        const notes = await Notes.find(); // Fetch all notes from MongoDB
        res.render('class', { notes }); // Pass notes to EJS template
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});



app.post("/api/search",authenticateUser,  async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }


        
const prompt1 ="write the content for class  blackboard about this topic " + message;
const prompt2="write class notes for " + message;
        const response =await getGeminiResponse(prompt1);
        const response2 = await getGeminiResponse(prompt2);

        try {
            
            const newNotes = new Notes({
                email: req.user.email,
                topic: message,
                shortnotes: response2,
            });
        
            await newNotes.save();
            console.log("Note saved successfully");
            

        } catch (error) {
            console.error("Error saving note:", error);
        }
        

        return res.json({ response });

    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/api/chat",authenticateUser,  async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

      const prompt="solve the doubt    " + message ;
        const response = await getGeminiResponse(prompt);
        

       return res.json({ response });
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});


// === Download note as PDF ===
app.get('/download/:id', async (req, res) => {
    try {
        const note = await Notes.findById(req.params.id);
        if (!note) return res.status(404).send('Note not found');

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Disposition', `attachment; filename="${note.topic}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // === Pale Yellow Background (full page) ===
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFACD'); // Pale yellow

        doc.fillColor('#000'); // Reset to black text

        // === Title ===
        doc.fontSize(24).fillColor('#2E8B57').font('Helvetica-Bold')
           .text(`📝 Topic: ${note.topic}`, { underline: true, align: 'center' })
           .moveDown(1.5);

        // === Function to format and beautify content ===
        function formatText(text) {
            const lines = text.split("\n");

            lines.forEach(line => {
                doc.moveDown(0.5);

                if (line.startsWith("### ")) {
                    doc.fontSize(16).fillColor('#4682B4').font('Helvetica-Bold')
                       .text("🔹 " + line.replace("### ", ""));
                } else if (line.startsWith("## ")) {
                    doc.fontSize(18).fillColor('#6A5ACD').font('Helvetica-Bold')
                       .text("🔷 " + line.replace("## ", ""));
                } else if (line.startsWith("# ")) {
                    doc.fontSize(20).fillColor('#B22222').font('Helvetica-Bold')
                       .text("⭐ " + line.replace("# ", ""));
                } else if (line.match(/\*\*(.*?)\*\*/)) {
                    const boldText = line.replace(/\*\*(.*?)\*\*/g, (_, match) => match);
                    doc.fontSize(13).fillColor('#000').font('Helvetica-Bold')
                       .text(boldText, { indent: 10 });
                } else if (line.startsWith("* ")) {
                    doc.fontSize(12).fillColor('#000080').font('Helvetica')
                       .text(`• ${line.substring(2)}`, { indent: 20 });
                } else if (line.trim() === "") {
                    doc.moveDown(0.5); // Extra spacing for empty lines
                } else {
                    doc.fontSize(12).fillColor('#333').font('Helvetica')
                       .text(line, { indent: 10 });
                }
            });
        }

        formatText(note.shortnotes);
        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
app.get("/api/notes", async (req, res) => {
    try {
        const { topic } = req.query;
        if (!topic) {
            return res.status(400).json({ error: "No topic provided" });
        }

        console.log("Fetching notes for topic:", topic);

        const notes = await Notes.find({ topic: topic }); // Ensure this fetches correct data
        console.log("Notes found:", notes);

        res.json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/home",authenticateUser, (req, res) => {
    res.render("home", { errorMessage: null });
});
/////profile///////////////////////////////////////////////////////////////////////////////////


app.get('/profile',authenticateUser, async(req, res) => {
    if (req.user.email==null) {
        // If no user session exists, redirect to the signup page
        return res.redirect('/');
    }
     const user = await User.findOne({ email: req.user.email });

    const profile =  user;
    res.render('profile', { profile });
});
/////notes/////////////////////////////////////////////////////////////////////////////////
app.get('/notes',authenticateUser, async (req, res) => {
    try {
       const notes = await Notes.find({ email: req.user.email });
        res.render('notes', { notes });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Signup page route///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

app.get("/signup", (req, res) => {
    res.render("signup", { errorMessage: null });
});

// Signup form handling
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    console.log(req.body); // Log incoming data for debugging

    try {
        // Ensure no trailing spaces in email
        const trimmedEmail = email.trim();

        // Check if user already exists (case-insensitive)
        const user = await User.findOne({ email: { $regex: `^${trimmedEmail}$`, $options: "i" } });

        if (user) {
            return res.render("signup", { errorMessage: "This user already exists, please go to the login page." });
        }

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            username: username,
            email: trimmedEmail,
            password: hashedPassword,
        });

        // Save the new user
        await newUser.save();
        console.log("User registered successfully");

        
        // Generate JWT token
        const token = jwt.sign({ email: trimmedEmail }, your_secret_key, { expiresIn: "7d" });
        console.log("Generated Token:", token);
        // Store token in HTTP-only cookie
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.redirect("/home"); // Redirect to home page

    } catch (err) {
        console.error("Error inserting document:", err);
        res.status(500).send(`Error inserting document: ${err.message}`);
    }
});
// Route for login page/////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

app.get('/', (req, res) => {
    res.render('index', { errorMessage: null });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // Ensure this variable is declared properly
    try {
        console.log('Email entered:', email);
        console.log('pass entered:', req.body.password);
        const trimmedEmail = email.trim();
        const user = await User.findOne({ email: { $regex: `^${trimmedEmail}$`, $options: 'i' } });

        if (!user) {
            return res.render('index', { errorMessage: 'This user does not exist, please sign up first.' });
        }
console.log('pass of user:', user.password);
       const isMatch = await bcrypt.compare(req.body.password, user.password);
       console.log("Match:", await bcrypt.compare(req.body.password,user.password));

if (!isMatch) {
    return res.render('index', { errorMessage: 'Password is wrong, please try again.' });
}


        console.log('User authenticated successfully');

        // Generate JWT token
        const token = jwt.sign({ email: user.email }, your_secret_key, { expiresIn: "7d" });
        console.log("Generated Token:", token);
        // Store token in HTTP-only cookie
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Redirect after setting cookie
        res.redirect('/home');

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal server error');
    }
});

// Use this middleware for protected routes
app.get("/protected-route", authenticateUser, (req, res) => {
    res.json({ message: "Access granted", user: req.user });
});


//////logout////////////////////logout////////////////////////////////////////////////////
app.post("/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out" });
     res.clearCookie('token');
    res.redirect('/');
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
