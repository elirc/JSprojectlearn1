export interface LessonSection {
  id: string;
  heading: string;
  body: string;
}

export interface LessonOutline {
  /** Everything before the first `##` heading (usually the h1 and a lead-in). */
  intro: string;
  sections: LessonSection[];
}

const slug = (value: string, index: number) =>
  `s${index}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)}`;

/**
 * Split a markdown document on its top-level `##` headings. Fenced code blocks
 * are respected so a `## comment` inside a fence never starts a section.
 */
export function splitMarkdownSections(markdown: string): LessonOutline {
  const lines = markdown.split("\n");
  const intro: string[] = [];
  const sections: LessonSection[] = [];
  let fence: string | null = null;
  let current: { heading: string; body: string[] } | null = null;
  for (const line of lines) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
    }
    const heading = fence === null ? /^##\s+(.*\S)\s*$/.exec(line) : null;
    if (heading) {
      if (current)
        sections.push({
          id: slug(current.heading, sections.length),
          heading: current.heading,
          body: current.body.join("\n").trim(),
        });
      current = { heading: heading[1].replace(/\s*#+\s*$/, ""), body: [] };
      continue;
    }
    if (current) current.body.push(line);
    else intro.push(line);
  }
  if (current)
    sections.push({
      id: slug(current.heading, sections.length),
      heading: current.heading,
      body: current.body.join("\n").trim(),
    });
  return { intro: intro.join("\n").trim(), sections };
}
