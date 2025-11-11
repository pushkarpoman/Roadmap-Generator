import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WorkIcon from '@mui/icons-material/Work';
import { useNavigate } from 'react-router-dom';
import { getRoadmapHistory } from '../services/roadmapService';
import './History.css';

const History = () => {
  const [roadmaps, setRoadmaps] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoadmaps = async () => {
      try {
        const data = await getRoadmapHistory();
        setRoadmaps(data);
      } catch (err) {
        setError('Failed to fetch roadmap history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmaps();
  }, []);

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="history-container">
      <Paper className="history-paper">
        <Box className="history-header">
          <Typography variant="h4" component="h1" className="history-title">
            Your Learning Journey
          </Typography>
          <div>
            <Button 
              variant="contained" 
              onClick={() => navigate('/')}
              startIcon={<WorkIcon />}
            >
              Generate New Roadmap
            </Button>
          </div>
        </Box>
        
        {roadmaps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">No roadmaps generated yet.</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Start by creating your first career roadmap!
            </Typography>
          </Box>
        ) : (
          <Box className="history-list">
            {roadmaps.map((roadmap) => (
              <Card key={roadmap._id} className="roadmap-card">
                <CardContent>
                  <Box className="roadmap-header">
                    <Box className="roadmap-title">
                      <WorkIcon className="icon-accent" />
                      <Typography variant="h6" className="title-text">{roadmap.title}</Typography>
                    </Box>
                    <Typography variant="body2" className="created-text">
                      <CalendarTodayIcon className="calendar-icon" />
                      {new Date(roadmap.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Box>

                  <Divider className="history-divider" />

                  <Box className="sections">
                    {Object.entries(roadmap.content).map(([section, content], index) => (
                      <Accordion key={index} className="history-accordion">
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} className="accordion-summary">
                          <Typography className="accordion-title">{section}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {Array.isArray(content) ? (
                            <List dense>
                              {content.map((item, i) => (
                                <ListItem key={i} alignItems="flex-start">
                                  <ListItemText
                                    primary={typeof item === 'object' ? item.name || JSON.stringify(item) : item}
                                    secondary={
                                      item.description ? (
                                        <Box className="item-secondary">
                                          {item.duration && <div className="item-duration">Duration: {item.duration}</div>}
                                          <div className="item-desc">{item.description}</div>
                                          {item.skills && (
                                            <div className="item-meta"><strong>Skills:</strong> {Array.isArray(item.skills) ? item.skills.join(', ') : item.skills}</div>
                                          )}
                                          {item.resources && (
                                            <div className="item-meta"><strong>Resources:</strong> {Array.isArray(item.resources) ? item.resources.join(', ') : item.resources}</div>
                                          )}
                                        </Box>
                                      ) : null
                                    }
                                    classes={{ primary: 'list-primary' }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Typography className="raw-content">{typeof content === 'object' ? JSON.stringify(content, null, 2) : content}</Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default History;