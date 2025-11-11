import { useState } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return value.trim() ? '' : 'Full name is required';
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? '' : 'Enter a valid email';
      case 'password':
        return value.length >= 6 ? '' : 'Password must be at least 6 characters';
      default:
        return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validate fields before sending
    const newFieldErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password)
    };
    setFieldErrors(newFieldErrors);

    if (newFieldErrors.name || newFieldErrors.email || newFieldErrors.password) {
      setError('Please fix the errors above');
      return;
    }

    try {
      const result = await register(formData.name, formData.email, formData.password);
      if (result.token) {
        // Force a page reload to ensure all components pick up the new auth state
        window.location.href = '/';
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={formData.name}
            onChange={handleChange}
            onBlur={(e) => setFieldErrors(prev => ({ ...prev, name: validateField('name', e.target.value) }))}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name}
            inputProps={{
              spellCheck: 'false',
              'aria-invalid': Boolean(fieldErrors.name)
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={(e) => setFieldErrors(prev => ({ ...prev, email: validateField('email', e.target.value) }))}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            inputProps={{
              spellCheck: 'false',
              'aria-invalid': Boolean(fieldErrors.email)
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            onBlur={(e) => setFieldErrors(prev => ({ ...prev, password: validateField('password', e.target.value) }))}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            inputProps={{
              spellCheck: 'false',
              'aria-invalid': Boolean(fieldErrors.password)
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign Up
          </Button>
          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/login')}
          >
            Already have an account? Sign in
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Register;