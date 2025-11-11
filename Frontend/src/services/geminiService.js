import axios from 'axios';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function generateRoadmap(role) {
  try {
    const prompt = `Generate a comprehensive career roadmap for a ${role}.

    Return the response in the following JSON format:
    {
      "title": "${role} Roadmap",
      "stages": [
        {
          "id": 1,
          "name": "Stage Name",
          "duration": "Timeframe",
          "description": "Detailed description",
          "skills": ["skill1", "skill2", "skill3"],
          "resources": ["resource1", "resource2"]
        }
      ]
    }

    Include 6-8 progressive stages covering beginner to advanced levels. Each stage should have a clear name, realistic duration, detailed description, key skills to learn, and recommended resources. Make it specific to ${role}.`;

    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const roadmapData = JSON.parse(jsonMatch[0]);
      return roadmapData;
    }

    throw new Error('Failed to parse roadmap data');
  } catch (error) {
    console.error('Error generating roadmap:', error);
    throw error;
  }
}
