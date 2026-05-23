function splitSections(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections: Record<string, string[]> = {};
  let current = "misc";
  for (const line of lines) {
    const header = line.toLowerCase();
    if (/^experience|work experience|professional experience/.test(header)) {
      current = "experience";
      sections[current] = sections[current] || [];
      continue;
    }
    if (/^projects?/.test(header)) {
      current = "projects";
      sections[current] = sections[current] || [];
      continue;
    }
    if (/^skills?|technical skills/.test(header)) {
      current = "skills";
      sections[current] = sections[current] || [];
      continue;
    }
    sections[current] = sections[current] || [];
    sections[current].push(line);
  }
  return sections;
}

function extractSkillsFromSection(lines: string[]) {
  const skills: string[] = [];
  for (const line of lines) {
    // comma separated skills
    if (line.includes(",")) {
      skills.push(...line.split(",").map((s) => s.trim()));
      continue;
    }
    // short lists separated by • or -
    const parts = line.split(/[•\-•·]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts.join(" ").length < 200) {
      skills.push(...parts);
      continue;
    }
    // single word lines that look like skills
    if (line.split(" ").length <= 3 && /[A-Za-z0-9\+\#]/.test(line)) {
      skills.push(line);
    }
  }
  return Array.from(new Set(skills)).filter(Boolean);
}

export async function parseResume(buffer: Buffer, mimeType?: string) {
  const text = await (async () => {
    try {
      if (mimeType === "application/pdf" || mimeType === "application/x-pdf") {
        const pdf = (await import('pdf-parse')).default ?? (await import('pdf-parse'));
        const data = await pdf(buffer as Buffer);
        return data.text || "";
      }
      // assume docx if not pdf
      const mammoth = (await import('mammoth'));
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch {
      // fallback to UTF-8 text
      return buffer.toString("utf8");
    }
  })();

  const sections = splitSections(text);

  const skills = extractSkillsFromSection(sections.skills || sections.misc || []);

  const projects: { title?: string; description?: string; url?: string }[] = [];
  if (sections.projects) {
    // naive group: each blank-line separated block is a project
    const blocks: string[] = [];
    let cur: string[] = [];
    for (const l of sections.projects) {
      if (!l.trim()) {
        if (cur.length) blocks.push(cur.join(" "));
        cur = [];
        continue;
      }
      cur.push(l);
    }
    if (cur.length) blocks.push(cur.join(" "));
    for (const b of blocks) {
      const urlMatch = b.match(/https?:\/\/[^\s]+/);
      projects.push({ title: b.split("-")[0].slice(0, 80).trim(), description: b.slice(0, 500).trim(), url: urlMatch ? urlMatch[0] : undefined });
    }
  }

  const experience: { company?: string; role?: string; start?: string; end?: string; bullets: string[] }[] = [];
  if (sections.experience) {
    // naive parse: lines that contain years or \u2013 dash separate entries
    let cur: string[] = [];
    for (const l of sections.experience) {
      if (/\d{4}/.test(l) && cur.length) {
        experience.push({ bullets: cur.slice() });
        cur = [l];
        continue;
      }
      cur.push(l);
    }
    if (cur.length) experience.push({ bullets: cur.slice() });
  }

  return {
    rawText: text,
    experience,
    skills,
    projects,
    parsedAt: new Date().toISOString(),
  };
}

export default parseResume;
