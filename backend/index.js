require('dotenv').config();
const app = require('./app'); // Importe l'application Express
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User'); // Import User model to update status

const PORT = process.env.PORT || 5000; // Utilise le port du .env ou 5000 par défaut

// Connect to MongoDB
connectDB();

const server = http.createServer(app); // Crée le serveur HTTP avec l'app Express

// Crée l'instance Socket.IO
const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CLIENT_URL, // Assurez-vous que CLIENT_URL est correct dans .env
        credentials: true,
    },
});

console.log("SERVER DEBUG: Socket.IO instance created.");

// Passe l'instance 'io' à l'application Express pour qu'elle puisse configurer ses routes
// et les rendre disponibles aux contrôleurs.
// Assurez-vous que app.js exporte une fonction setupRoutes qui prend 'io'.
app.setupRoutes(io); // APPEL CLÉ : Configure les routes de l'app avec l'instance io

// =====================================================================
// NOUVEAU: Logique Socket.IO pour la gestion des statuts en temps réel
// =====================================================================

// Map pour stocker les utilisateurs connectés et leur statut
// { userId: { socketId: '...', status: 'online', lastSeen: null } }
const connectedUsers = {}; // Garde une trace des utilisateurs connectés et leur dernier statut

io.on('connection', (socket) => {
    console.log('Connected to socket.io. Socket ID:', socket.id);

    socket.on('setup', async (userData) => {
        if (userData && userData._id) {
            const userId = userData._id;
            socket.join(userId); // Joindre l'utilisateur à sa propre "salle"

            // Mettre à jour le statut de l'utilisateur comme "online"
            connectedUsers[userId] = {
                socketId: socket.id,
                status: 'online',
                lastSeen: null, // Réinitialiser lastSeen car il est en ligne
            };

            // Mettre à jour le statut de l'utilisateur dans la base de données
            try {
                await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: null });
            } catch (dbError) {
                console.error("Error updating user status in DB on connect:", dbError);
            }

            console.log(`User ${userData.name} (ID: ${userId}) connected and joined room: ${userId}`);

            // 1. Émettre à l'utilisateur qui vient de se connecter la liste COMPLÈTE des statuts
            const allCurrentStatuses = {};
            for (const id in connectedUsers) {
                allCurrentStatuses[id] = {
                    status: connectedUsers[id].status,
                    lastSeen: connectedUsers[id].lastSeen,
                };
            }
            socket.emit('online users', allCurrentStatuses); // NOUVEL ÉVÉNEMENT pour l'état initial

            // 2. Émettre à TOUS les autres utilisateurs que cet utilisateur est maintenant en ligne
            socket.broadcast.emit('user status update', {
                userId: userId,
                status: 'online',
                lastSeen: null,
            });

        } else {
            console.log('Invalid user data for setup');
            socket.disconnect();
        }
    });

    socket.on('join chat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat: ${chatId}`);
    });

    socket.on('new message', (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if (!chat.users) return console.log('Chat.users not defined');

        chat.users.forEach((user) => {
            // Ne pas envoyer à l'expéditeur lui-même
            if (user._id === newMessageReceived.sender._id) return;
            // Émettre le message à la "salle" de l'utilisateur destinataire
            socket.to(user._id).emit('message received', newMessageReceived);
        });
    });

    socket.on('typing', (chatId) => socket.in(chatId).emit('typing', chatId));
    socket.on('stop typing', (chatId) => socket.in(chatId).emit('stop typing', chatId));

    socket.on('message read', ({ messageId, userId, chatId }) => {
        // Émettre à tous les membres du chat (sauf l'utilisateur qui a lu) que le message a été lu
        socket.to(chatId).emit('message read', { messageId, userId });
    });

    // Événements de mise à jour/suppression de chat (pour les groupes, etc.)
    socket.on('chat updated', (updatedChat) => {
        // Émettre à tous les membres du chat que le chat a été mis à jour
        updatedChat.users.forEach(user => {
            socket.in(user._id).emit('chat updated', updatedChat);
        });
    });

    socket.on('chat deleted', (deletedChatId) => {
        // Émettre à tous les utilisateurs concernés que le chat a été supprimé
        io.emit('chat deleted', deletedChatId); // Émettre globalement ou à des salles spécifiques
    });


    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', async () => {
        console.log('Client disconnected from Socket.IO. Socket ID:', socket.id);

        let disconnectedUserId = null;
        for (const userId in connectedUsers) {
            if (connectedUsers[userId].socketId === socket.id) {
                disconnectedUserId = userId;
                break;
            }
        }

        if (disconnectedUserId) {
            const now = new Date();
            // Mettre à jour le statut de l'utilisateur à "offline" et enregistrer lastSeen
            connectedUsers[disconnectedUserId] = {
                ...connectedUsers[disconnectedUserId],
                status: 'offline',
                lastSeen: now.toISOString(), // Enregistrer l'heure de déconnexion
            };

            // Mettre à jour le statut de l'utilisateur dans la base de données
            try {
                await User.findByIdAndUpdate(disconnectedUserId, { status: 'offline', lastSeen: now });
            } catch (dbError) {
                console.error("Error updating user status in DB on disconnect:", dbError);
            }

            console.log(`User ${disconnectedUserId} disconnected. Status: offline, Last Seen: ${now}.`);

            // Émettre à TOUS les autres utilisateurs que cet utilisateur est maintenant hors ligne
            socket.broadcast.emit('user status update', {
                userId: disconnectedUserId,
                status: 'offline',
                lastSeen: now.toISOString(),
            });

            // Optionnel: Supprimer l'utilisateur de la liste `connectedUsers` après un certain délai
            // pour permettre un bref intervalle de reconnexion sans apparaître "offline"
            // Ou le laisser pour que `lastSeen` soit toujours disponible.
            // Pour l'instant, nous le laissons pour que `lastSeen` soit accessible.
        }
    });

    // Le socket.off('setup') dans votre code précédent n'est pas nécessaire ici.
    // L'événement 'disconnect' gère déjà la déconnexion.
});


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
