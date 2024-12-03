const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'dilip',
    password: '3615',
    database: 'demo',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// File storage configuration
const storage = multer.diskStorage({
    destination: './public/uploads', // Directory where files will be stored
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`); // Name the file with current timestamp to avoid conflicts
    },
});

const upload = multer({ storage });

// Route to handle file upload
app.post('/upload', upload.single('note'), (req, res) => {
    const subjectName = req.body.subject_name;
    const filePath = `/uploads/${req.file.filename}`; // Save the relative file path to the database

    if (!subjectName || !req.file) {
        return res.status(400).send('Subject name and file are required');
    }

    // Insert data into the database
    const sql = 'INSERT INTO notes (subject_name, notes_url) VALUES (?, ?)';
    db.query(sql, [subjectName, filePath], (err) => {
        if (err) {
            console.error('Error inserting note:', err);
            return res.status(500).send('Failed to upload note');
        }
        res.send('Note uploaded successfully');
    });
});

// Route to fetch notes from database (for download interface)
app.get('/notes1', (req, res) => {
    const sql = 'SELECT notes_id, subject_name FROM notes';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error retrieving notes:', err);
            return res.status(500).send('Error retrieving notes');
        }
        res.json(results);
    });
});

// Route to download the file
app.get('/download/:id', (req, res) => {
    const fileId = req.params.id;
    const sql = 'SELECT subject_name, notes_url FROM notes WHERE notes_id = ?';

    db.query(sql, [fileId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error retrieving file');
        }

        if (result.length === 0) {
            console.log('File not found for ID:', fileId);
            return res.status(404).send('File not found');
        }

        const filePath = path.join(__dirname, 'public', result[0].notes_url);

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error('File does not exist:', filePath);
                return res.status(404).send('File not found');
            }

            res.download(filePath, result[0].subject_name, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
            });
        });
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
