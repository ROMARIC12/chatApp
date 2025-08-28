import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'desole une erreur est survenu lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column', // Important pour centrer verticalement avec justifyContent
        justifyContent: 'center', // Centre verticalement le contenu
        alignItems: 'center',   // Centre horizontalement le contenu
        height: '100vh',        // Prend 100% de la hauteur du viewport
        width: '100vw',         // Prend 100% de la largeur du viewport
        backgroundColor: '#f4f6f8',
        padding: 2,             // Padding pour éviter que le contenu ne touche les bords sur mobile
        boxSizing: 'border-box', // S'assurer que le padding est inclus dans la largeur/hauteur
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          borderRadius: 2,
          maxWidth: 400,
          width: '100%',
          // margin: 'auto', // Retiré, car le parent flexbox devrait gérer le centrage
          boxSizing: 'border-box',
          flexShrink: 0, // Empêche le Paper de rétrécir si l'espace est limité
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Login
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
          />
          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Pas de compte? <Link to="/register" style={{ textDecoration: 'none', color: '#1976d2' }}>Creer un compte</Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginPage;
