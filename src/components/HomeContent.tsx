"use client";

import { useRef, useState, useEffect } from "react";
import { generateRoadmap, saveRoadmap, updateRoadmap } from "@/services/api";
import type { RoadmapContent } from "@/types/roadmap";
import RoadmapVisualization from "@/components/RoadmapVisualization";
import { useAppContext } from "@/context/app-context";

const EXAMPLE_ROLES = ["MERN Stack Developer", "Data Scientist", "DevOps Engineer", "UI/UX Designer"];

export default function HomeContent() {
  const { user } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [roadmap, setRoadmap] = useState<RoadmapContent | null>(null);
  const [roadmapId, setRoadmapId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const last = localStorage.getItem("lastRole");
      if (last && inputRef.current) {
        inputRef.current.value = last;
      }
    }
  }, []);

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const role = inputRef.current?.value.trim() || "";
    if (!role) {
      setInputError("Please enter a role");
      return;
    }

    setInputError("");
    setLoading(true);
    setError(null);
    setRoadmap(null);
    setRoadmapId(null);

    try {
      const generatedRoadmap = await generateRoadmap(role);
      setRoadmap(generatedRoadmap);

      if (user) {
        const saved = await saveRoadmap(role, generatedRoadmap);
        setRoadmapId(saved.id);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem("lastRole", role);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate roadmap";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoadmapChange = async (nextRoadmap: RoadmapContent) => {
    setRoadmap(nextRoadmap);

    if (!user || !roadmapId) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateRoadmap(roadmapId, nextRoadmap.title, nextRoadmap);
      setRoadmapId(updated.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save roadmap updates";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (roadmap) {
    return (
      <div className="roadmap-section">
        <button
          className="back-button"
          type="button"
          onClick={() => {
            setRoadmap(null);
            setError(null);
            setRoadmapId(null);
          }}
        >
          Generate Another Roadmap
        </button>
        {saving && <p className="hero-subtitle">Saving roadmap updates...</p>}
        <RoadmapVisualization
          roadmap={roadmap}
          canPersist={Boolean(user && roadmapId)}
          onRoadmapChange={handleRoadmapChange}
        />
      </div>
    );
  }

  return (
    <div className="landing-section">
      <div className="hero-content">
        <h1 className="hero-title">
          Career Roadmap
          <span className="gradient-text">Generator</span>
        </h1>
        <p className="hero-subtitle">
          Transform your career aspirations into a structured, actionable roadmap powered by AI
        </p>

        <form onSubmit={handleGenerate} className="search-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              defaultValue=""
              placeholder="Enter your desired role (e.g., MERN Stack Developer)"
              className="search-input"
              disabled={loading}
              spellCheck="false"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="text"
              aria-label="Desired role"
            />
            <button type="submit" className="generate-button" disabled={loading} aria-label="Generate roadmap">
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                "Generate Roadmap"
              )}
            </button>
          </div>
          {inputError && (
            <p className="error-message" role="alert" aria-live="assertive">
              {inputError}
            </p>
          )}
          {error && (
            <p className="error-message" role="alert" aria-live="polite">
              {error}
            </p>
          )}
        </form>

        <div className="example-roles">
          <p>Try these:</p>
          <div className="role-tags">
            {EXAMPLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  if (!inputRef.current) return;
                  inputRef.current.value = role;
                  inputRef.current.focus();
                }}
                className="role-tag"
                aria-label={`Use example role ${role}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
