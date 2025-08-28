import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Badge, // NOUVEAU: Import de Badge pour l'indicateur de statut
} from '@mui/material';
import { Search as SearchIcon, Chat as ChatIcon } from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useSocket } from '../contexts/SocketContext'; // NOUVEAU: Import de useSocket
import axios from 'axios';
import { formatDistanceToNowStrict } from 'date-fns'; // Pour le temps "last seen"
import { fr } from 'date-fns/locale'; // Pour la locale française

const ContactsPage = () => {
  const { user } = useAuth();
  const { createChat, selectChat } = useChat();
  const { onlineUsers } = useSocket(); // NOUVEAU: Accès à onlineUsers
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchAllUsers = async () => {
      if (!user || !user.token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const config = {
          headers: { Authorization: `Bearer ${user.token}` },
        };
        // Récupère tous les utilisateurs sauf l'utilisateur actuel
        const { data } = await axios.get(`${API_BASE_URL}/users/all`, config);
        setAllUsers(data);
      } catch (err) {
        console.error('Failed to fetch all users:', err);
        setError(err.response?.data?.message || 'echec lors du chargement des contacts.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsers();
  }, [user, API_BASE_URL]);

  const handleCreatePrivateChat = async (targetUserId) => {
    try {
      await createChat(targetUserId);
    } catch (err) {
      console.error('Error creating private chat:', err);
      setError(err.response?.data?.message || 'impossible de demarrer le chat.');
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // NOUVEAU: Fonction pour déterminer le statut en ligne d'un utilisateur
  const getOnlineStatus = (contactId) => {
    const statusInfo = onlineUsers[contactId];
    if (!statusInfo) {
      return { status: 'offline', text: 'offline', color: 'error.main' };
    }

    if (statusInfo.status === 'online') {
      return { status: 'online', text: 'online', color: 'success.main' };
    }

    if (statusInfo.lastSeen) {
      const lastSeenDate = new Date(statusInfo.lastSeen);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

      if (diffMinutes < 15) { // Moins de 15 minutes, considéré comme "récemment en ligne"
        return {
          status: 'recently-online',
          text: `last seen ${formatDistanceToNowStrict(lastSeenDate, { addSuffix: true, locale: fr })}`,
          color: 'warning.main'
        };
      }
    }
    return { status: 'offline', text: 'offline', color: 'error.main' };
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Contacts</Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="trouver le contacts par nom ou mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', padding: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : filteredUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                contacts non trouvé.
            </Typography>
          ) : (
            filteredUsers.map((contact) => {
              const status = getOnlineStatus(contact._id); // Récupère le statut pour chaque contact
              return (
                <ListItem
                  key={contact._id}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                  }}
                  secondaryAction={
                    <IconButton edge="end" aria-label="chat" onClick={() => handleCreatePrivateChat(contact._id)}>
                      <ChatIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar sx={{ position: 'relative' }}> {/* Ajout de position: 'relative' */}
                    <Avatar src={contact.profilePicture || '/default-avatar.png'} />
                    {/* NOUVEAU: Affichage du badge de statut */}
                    <Badge
                      variant="dot"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: status.color,
                          color: status.color,
                          boxShadow: '0 0 0 2px white',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                        },
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle1" fontWeight="bold">{contact.name}</Typography>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.secondary">
                          {contact.email}
                        </Typography>
                        {/* NOUVEAU: Affichage du texte de statut */}
                        <Typography component="span" variant="caption" color={status.color} sx={{ display: 'block' }}>
                          Status: {status.text}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              );
            })
          )}
        </List>
      </Box>
    </Box>
  );
};

export default ContactsPage;
