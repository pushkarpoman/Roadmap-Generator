import { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ theme = 'dark', toggleTheme = () => {} }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')); // Get user from localStorage

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
 
  };


  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleHistory = () => {
    navigate('/history');
    handleClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
    handleClose();
  };

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'transparent', boxShadow: 'none', borderBottom: 'none' }}>
      <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              color: 'var(--nav-text)',
              fontSize: '1.125rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'none',
            }}
          >
            Roadmap
          </button>
        </Typography>
        {/* Theme toggle */}
        <IconButton className="theme-toggle" sx={{ mr: 1 }} color="inherit" onClick={toggleTheme} aria-label="toggle theme" aria-pressed={theme === 'light'}>
          {theme === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        {user ? (
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar>{user.name ? user.name[0].toUpperCase() : 'U'}</Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
 
              <MenuItem onClick={handleHistory}>History</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </div>
        ) : (
          <IconButton
            size="large"
            color="inherit"
            onClick={() => navigate('/login')}
          >
            <Avatar>?</Avatar>
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

// PropTypes
Navbar.propTypes = {
  theme: PropTypes.oneOf(['dark', 'light']),
  toggleTheme: PropTypes.func
};