"use client";

import { useEffect, useState } from "react";
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
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import WorkIcon from "@mui/icons-material/Work";
import { useRouter } from "next/navigation";
import { getRoadmapHistory } from "@/services/api";
import type { RoadmapRecord } from "@/types/roadmap";

export default function HistoryContent() {
  const [roadmaps, setRoadmaps] = useState<RoadmapRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRoadmaps = async () => {
      try {
        const data = await getRoadmapHistory();
        setRoadmaps(data);
      } catch {
        setError("Failed to fetch roadmap history");
      } finally {
        setLoading(false);
      }
    };

    void fetchRoadmaps();
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
            <Button variant="contained" onClick={() => router.push("/")} startIcon={<WorkIcon />}>
              Generate New Roadmap
            </Button>
          </div>
        </Box>

        {roadmaps.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No roadmaps generated yet.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Start by creating your first career roadmap!
            </Typography>
          </Box>
        ) : (
          <Box className="history-list">
            {roadmaps.map((roadmap) => (
              <Card key={roadmap.id} className="roadmap-card">
                <CardContent>
                  <Box className="roadmap-header">
                    <Box className="roadmap-title">
                      <WorkIcon className="icon-accent" />
                      <Typography variant="h6" className="title-text">
                        {roadmap.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" className="created-text">
                      <CalendarTodayIcon className="calendar-icon" />
                      {new Date(roadmap.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>

                  <Divider className="history-divider" />

                  <Box className="sections">
                    {Object.entries(roadmap.content).map(([section, content]) => (
                      <Accordion key={section} className="history-accordion">
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} className="accordion-summary">
                          <Typography className="accordion-title">{section}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {Array.isArray(content) ? (
                            <List dense>
                              {content.map((item, index) => {
                                const typedItem = item as {
                                  name?: string;
                                  description?: string;
                                  duration?: string;
                                  skills?: string[] | string;
                                  resources?: string[] | string;
                                };

                                return (
                                  <ListItem key={`${section}-${index}`} alignItems="flex-start">
                                    <ListItemText
                                      primary={
                                        typeof item === "object"
                                          ? typedItem.name || JSON.stringify(item)
                                          : String(item)
                                      }
                                      secondary={
                                        typedItem.description ? (
                                          <Box className="item-secondary">
                                            {typedItem.duration && <div className="item-duration">Duration: {typedItem.duration}</div>}
                                            <div className="item-desc">{typedItem.description}</div>
                                            {typedItem.skills && (
                                              <div className="item-meta">
                                                <strong>Skills:</strong>{" "}
                                                {Array.isArray(typedItem.skills) ? typedItem.skills.join(", ") : typedItem.skills}
                                              </div>
                                            )}
                                            {typedItem.resources && (
                                              <div className="item-meta">
                                                <strong>Resources:</strong>{" "}
                                                {Array.isArray(typedItem.resources)
                                                  ? typedItem.resources.join(", ")
                                                  : typedItem.resources}
                                              </div>
                                            )}
                                          </Box>
                                        ) : null
                                      }
                                      classes={{ primary: "list-primary" }}
                                    />
                                  </ListItem>
                                );
                              })}
                            </List>
                          ) : (
                            <Typography className="raw-content">
                              {typeof content === "object" ? JSON.stringify(content, null, 2) : String(content)}
                            </Typography>
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
}
