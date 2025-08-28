    require('dotenv').config();
    const express = require('express');
    const cors = require('cors');
    const path = require('path');
    const app = express();

    // Set BASE_URL for media files
    // Lire directement la variable d'environnement BASE_URL
    // Si elle n'est pas définie (ex: en local), utiliser localhost
    process.env.BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`; // Utilise 5000 comme port par défaut si non défini

    // Middleware
    app.use(express.json());
    app.use(cors({
        origin: process.env.CLIENT_URL, // Assurez-vous que CLIENT_URL est correctement défini sur Render
        credentials: true,
    }));

    // Serve static files from the 'uploads' directory
    // ATTENTION: Ceci ne résout PAS le problème de persistance sur Render.
    // C'est uniquement pour que le serveur sache servir les fichiers s'ils existent.
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Définition des routes
    const authRoutes = require('./routes/authRoutes');
    const userRoutes = require('./routes/userRoutes');
    const chatRoutes = require('./routes/chatRoutes');
    const messageRoutes = require('./routes/messageRoutes');
    const groupRoutes = require('./routes/groupRoutes');

    // Cette fonction sera appelée par server.js pour configurer les routes avec l'instance io
    app.setupRoutes = (ioInstance) => {
        app.use('/api/auth', authRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/chats', chatRoutes);
        app.use('/api/messages', messageRoutes(ioInstance));
        app.use('/api/groups', groupRoutes);
    };

    // Basic route for testing
    app.get('/', (req, res) => {
        res.send('API is running...');
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

    module.exports = app;
    
