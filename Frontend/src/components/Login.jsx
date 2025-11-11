import { useState } from 'react'; 
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateField = (name, value) => {
    switch (name) {
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
    // validate
    const newFieldErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password)
    };
    setFieldErrors(newFieldErrors);
    if (newFieldErrors.email || newFieldErrors.password) {
      setError('Please fix the errors above');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/'); // Redirect to home on success
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Login error:', err);
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
          Sign in
        </Typography>

        {/* ✅ Fixed here */}
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
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            onBlur={(e) => setFieldErrors(prev => ({ ...prev, email: validateField('email', e.target.value) }))}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            inputProps={{ 'aria-invalid': Boolean(fieldErrors.email) }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            onBlur={(e) => setFieldErrors(prev => ({ ...prev, password: validateField('password', e.target.value) }))}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            inputProps={{ 'aria-invalid': Boolean(fieldErrors.password) }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/register')}
          >
            Don&apos;t have an account? Sign Up 
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
