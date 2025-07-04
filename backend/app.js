require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Set BASE_URL for media files
const BASE_URL = process.env.BASE_URL;

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL ,
    credentials: true,
}));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Définition des routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes'); // Importez la fonction du routeur
const groupRoutes = require('./routes/groupRoutes');

// Cette fonction sera appelée par server.js pour configurer les routes avec l'instance io
app.setupRoutes = (ioInstance) => { // Renommé 'io' en 'ioInstance' pour éviter la confusion
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/chats', chatRoutes);
    app.use('/api/messages', messageRoutes(ioInstance)); // PASSE IO ICI
    app.use('/api/groups', groupRoutes);
};

// Basic route for testing (reste ici car c'est une route de l'app Express)
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware (optional but recommended)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app; // Exporte l'instance app
