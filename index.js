const fs = require('fs');
const cookieParser = require("cookie-parser");
const PDFDocument = require('pdfkit');
const express = require("express");
const app = express(); // Initialize Express app
const path = require("path");
const mongoose = require("mongoose");
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





mongoose.connect(process.env.dbURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));


// Serve static files
app.use(express.static(path.join(__dirname, "public")));



// Global variables
let permanentEmail = null;
app.get('/class', async (req, res) => {
    try {
        const notes = await Notes.find(); // Fetch all notes from MongoDB
        res.render('class', { notes }); // Pass notes to EJS template
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

const FLASK_API_URL = "https://orove-ai.onrender.com/chat"; // Flask API endpoint

app.post("/api/search", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

        // Send request to Flask API
        
        const response = await axios.post(FLASK_API_URL, {message: "write the content for class  blackboard about this topic " + message});
        const response2 = await axios.post(FLASK_API_URL, { message: "write class notes for " + message });
        try {
            
            const newNotes = new Notes({
                email:permanentEmail,
                topic: message,
                shortnotes: response2.data.response,
            });
        
            await newNotes.save();
            console.log("Note saved successfully");
            

        } catch (error) {
            console.error("Error saving note:", error);
        }
        

        return res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

        // Send request to Flask API
        const response = await axios.post(FLASK_API_URL, { message: "solve the doubt    " + message });
        

        return res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});


app.get('/download/:id', async (req, res) => {
    try {
        const note = await Notes.findById(req.params.id);
        if (!note) {
            return res.status(404).send("Note not found");
        }

        // Create a new PDF document
        const doc = new PDFDocument();
        const filePath = path.join(__dirname, 'downloads', `note-${note._id}.pdf`);

        // Ensure the 'downloads' folder exists
        if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
            fs.mkdirSync(path.join(__dirname, 'downloads'));
        }

        // Write PDF to file
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add note content
        doc.fontSize(18).text(`Topic: ${note.topic}`, { underline: true });
        doc.moveDown();
        doc.fontSize(14).text(`Notes:`);
        doc.moveDown();
        doc.fontSize(12).text(note.shortnotes, { align: 'justify' });

        // Finalize PDF
        doc.end();

        // When writing finishes, send file to user
        writeStream.on('finish', () => {
            res.download(filePath, `note-${note._id}.pdf`, (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    res.status(500).send("Error downloading file");
                }
                // Optionally delete file after download
                setTimeout(() => fs.unlinkSync(filePath), 30000); // Deletes after 30s
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
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


app.get("/home", (req, res) => {
    res.render("home", { errorMessage: null });
});
/////profile///////////////////////////////////////////////////////////////////////////////////


app.get('/profile', async(req, res) => {
    if (permanentEmail==null) {
        // If no user session exists, redirect to the signup page
        return res.redirect('/');
    }
    const user = await User.findOne({ email: { $regex: `^${permanentEmail}$`, $options: 'i' } });

    const profile =  user;
    res.render('profile', { profile });
});
/////notes/////////////////////////////////////////////////////////////////////////////////
app.get('/notes', async (req, res) => {
    try {
        const notes = await Notes.find({ email: permanentEmail }); // Mongoose uses `.find()`
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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            username: username,
            email: trimmedEmail,
            password: hashedPassword,
        });

        // Save the new user
        await newUser.save();
        console.log("User registered successfully");

        permanentEmail = newUser.email;
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
    permanentEmail = email; // Ensure this variable is declared properly
    try {
        console.log('Email entered:', email);
        const trimmedEmail = email.trim();
        const user = await User.findOne({ email: { $regex: `^${trimmedEmail}$`, $options: 'i' } });

        if (!user) {
            return res.render('index', { errorMessage: 'This user does not exist, please sign up first.' });
        }

        if (user.password !== password) {
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

///midleware login///////////////////////////////////////////////////////////////////
const authenticateUser = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, your_secret_key);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

// Use this middleware for protected routes
app.get("/protected-route", authenticateUser, (req, res) => {
    res.json({ message: "Access granted", user: req.user });
});


//////logout////////////////////logout////////////////////////////////////////////////////
app.post("/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out" });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
