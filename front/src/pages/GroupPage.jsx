import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Divider,
  Avatar
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import { Add as AddIcon, Close as CloseIcon, GroupAdd as GroupAddIcon } from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const GroupPage = () => {
  const { user } = useAuth();
  const { createGroup, chats, selectedChat, selectChat, fetchMessages, publicGroups, addGroupMember } = useChat();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [participants, setParticipants] = useState([]);
  const [currentParticipantEmail, setCurrentParticipantEmail] = useState('');
  const [searchError, setSearchError] = useState('');
  const [creationError, setCreationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCreateGroupDialog, setOpenCreateGroupDialog] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleAddParticipant = async () => {
    setSearchError('');
    if (!currentParticipantEmail) {
      setSearchError('Email cannot be empty.');
      return;
    }

    if (participants.some(p => p.email === currentParticipantEmail)) {
      setSearchError('Participant already added.');
      return;
    }

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: foundUser } = await axios.get(`${API_BASE_URL}/users/search?email=${currentParticipantEmail}`, config);

      if (foundUser && foundUser._id && foundUser._id !== user._id) {
        setParticipants([...participants, { _id: foundUser._id, name: foundUser.name, email: foundUser.email }]);
        setCurrentParticipantEmail('');
      } else {
        setSearchError('utilisateur non trouve ajoute un.');
      }
    } catch (error) {
      console.error('impossible de trouver celui que vous cherchez:', error);
      setSearchError(error.response?.data?.message || 'impossible de trouver.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = (id) => {
    setParticipants(participants.filter(p => p._id !== id));
  };

  const handleCreateGroup = async () => {
    setCreationError('');
    if (!groupName.trim()) {
      setCreationError('Group name is required.');
      return;
    }
    setLoading(true);
    try {
      const allParticipantsIds = [...participants.map(p => p._id), user._id];

      const newGroup = await createGroup(groupName, groupDescription, allParticipantsIds);
      setGroupName('');
      setGroupDescription('');
      setParticipants([]);
      setOpenCreateGroupDialog(false);
      // selectChat est appelé automatiquement par createGroup
    } catch (error) {
      console.error('Error creating group:', error);
      setCreationError(error.response?.data?.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    console.log(`DEBUG GroupPage: Attempting to join group: ${groupId}`);
    try {
      setLoading(true); // Activer le chargement pour le bouton "Join"
      await addGroupMember(groupId, user._id); // Ajouter l'utilisateur actuel au groupe
      await selectChat(groupId); // Après avoir rejoint, naviguer vers ce chat
      alert('You have successfully joined the group!'); // Utiliser une alerte temporaire
    } catch (error) {
      console.error('Error joining group:', error);
      alert(error.response?.data?.message || 'Failed to join group.'); // Utiliser une alerte temporaire
    } finally {
      setLoading(false); // Désactiver le chargement
    }
  };


  // Filter chats to only show groups
  const allUserGroups = chats.filter(chat => chat.isGroupChat && !chat.isArchived && !chat.isPinned);
  const pinnedUserGroups = chats.filter(chat => chat.isGroupChat && chat.isPinned && !chat.isArchived);

  // MAINTENANT, publicGroups contient TOUS les groupes publics,
  // et nous ferons la vérification si l'utilisateur est membre directement dans le rendu.
  // const discoverableGroups = publicGroups.filter(group =>
  //   !group.users.some(member => member._id === user._id)
  // );


  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Groups</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setOpenCreateGroupDialog(true)}
          >
            Creer un nouveau groupe
          </Button>
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', padding: 2 }}>
            {pinnedUserGroups.length > 0 && (
                <>
                    <Typography variant="subtitle2" sx={{ paddingBottom: 1, color: 'text.secondary' }}>Archiver un groupe</Typography>
                    {pinnedUserGroups.map((group) => (
                        <ListItem
                            key={group._id}
                            component="button"
                            onClick={() => selectChat(group._id)}
                            sx={{
                                backgroundColor: selectedChat?._id === group._id ? '#e0e0e0' : 'transparent',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                mb: 1,
                                borderRadius: 1
                            }}
                        >
                            <ListItemText
                                primary={<Typography variant="subtitle1" fontWeight="bold">{group.chatName}</Typography>}
                                secondary={`${group.users.length} members`}
                            />
                        </ListItem>
                    ))}
                    <Divider sx={{ my: 2 }} />
                </>
            )}

            <Typography variant="subtitle2" sx={{ paddingBottom: 1, color: 'text.secondary' }}>Your Groups</Typography>
            {allUserGroups.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Vous ne faites pas parti e ce groupe. creer en un ou rejoigner !
                </Typography>
            )}
            {allUserGroups.map((group) => (
                <ListItem
                    key={group._id}
                    component="button"
                    onClick={() => selectChat(group._id)}
                    sx={{
                        backgroundColor: selectedChat?._id === group._id ? '#e0e0e0' : 'transparent',
                        '&:hover': { backgroundColor: '#f0f0f0' },
                        mb: 1,
                        borderRadius: 1
                    }}
                >
                    <ListItemText
                        primary={<Typography variant="subtitle1" fontWeight="bold">{group.chatName}</Typography>}
                        secondary={`${group.users.length} members`}
                    />
                </ListItem>
            ))}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ paddingBottom: 1, color: 'text.secondary' }}>Decouvrez les groupes</Typography>
            {publicGroups.length === 0 && ( // Utilise publicGroups directement ici
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Aucun groupe pour le moment.
                </Typography>
            )}
            {publicGroups.map((group) => { // Itère sur TOUS les groupes publics
                const isMember = group.users.some(member => member._id === user._id);

                return (
                    <ListItem
                        key={group._id}
                        sx={{
                            mb: 1,
                            borderRadius: 1,
                            border: '1px solid #e0e0e0',
                        }}
                        secondaryAction={
                            isMember ? (
                                <Chip label="deja membre" color="success" variant="outlined" size="small" />
                            ) : (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<GroupAddIcon />}
                                    onClick={() => handleJoinGroup(group._id)}
                                    disabled={loading}
                                >
                                    {loading ? <CircularProgress size={16} /> : 'Join'}
                                </Button>
                            )
                        }
                    >
                        <Avatar src="/group-avatar.png" sx={{ mr: 2 }} />
                        <ListItemText
                            primary={<Typography variant="subtitle1" fontWeight="bold">{group.chatName}</Typography>}
                            secondary={
                                <>
                                    <Typography component="span" variant="body2" color="text.secondary">
                                        {group.users.length} membre
                                    </Typography>
                                    {group.chatDescription && (
                                        <Typography component="span" variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                            {group.chatDescription}
                                        </Typography>
                                    )}
                                </>
                            }
                        />
                    </ListItem>
                );
            })}

        </List>
      </Box>

      {/* Create New Group Dialog */}
      <Dialog open={openCreateGroupDialog} onClose={() => setOpenCreateGroupDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent dividers>
          {creationError && <Alert severity="error" sx={{ mb: 2 }}>{creationError}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            label="Nom du groupe"
            type="text"
            fullWidth
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description du groupe (Optionel)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Add Participants</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              label="Email"
              type="email"
              variant="outlined"
              size="small"
              value={currentParticipantEmail}
              onChange={(e) => setCurrentParticipantEmail(e.target.value)}
              sx={{ flexGrow: 1, mr: 1 }}
              error={!!searchError}
              helperText={searchError}
            />
            <Button
              variant="contained"
              onClick={handleAddParticipant}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            >
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {participants.map((p) => (
              <Chip
                key={p._id}
                label={`${p.name} (${p.email})`}
                onDelete={() => handleRemoveParticipant(p._id)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateGroupDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={loading}>
            Creer un groupe
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupPage;
