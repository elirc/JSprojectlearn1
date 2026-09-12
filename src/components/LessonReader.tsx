import { memo, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { splitMarkdownSections } from "../game/lesson";
import type { ArchivedFile } from "../types";
import { cx } from "./shared";

/**
 * Renders one archived file. Markdown is split on `##` headings so a phone gets
 * a Contents list plus collapsible sections instead of a 44,000 px scroll.
 */
function LessonReaderView({
  file,
  allOpen,
  openHeading,
  onOpenHeading,
}: {
  file: ArchivedFile;
  /** Desktop opens every section; a phone opens the intro and one section. */
  allOpen: boolean;
  openHeading?: string;
  onOpenHeading: (heading: string | undefined) => void;
}) {
  const outline = useMemo(
    () =>
      file.language === "markdown"
        ? splitMarkdownSections(file.content)
        : { intro: "", sections: [] },
    [file],
  );
  const [open, setOpen] = useState<string[]>([]);
  const bodies = useRef(new Map<string, HTMLElement | null>());
  const remembered = outline.sections.find(
    (section) => section.heading === openHeading,
  );
  useEffect(() => {
    if (allOpen) setOpen(outline.sections.map((section) => section.id));
    else setOpen(remembered ? [remembered.id] : []);
    // Reset whenever the file or the layout changes, not on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.path, allOpen, outline.sections.length]);

  if (file.language !== "markdown")
    return (
      <article className="lesson-content">
        <div className="code-label">
          {file.language} · preserved from {file.path}
        </div>
        <pre>
          <code>{file.content}</code>
        </pre>
      </article>
    );

  const toggle = (id: string, heading: string) => {
    setOpen((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
    if (!open.includes(id)) onOpenHeading(heading);
  };
  const jump = (id: string, heading: string) => {
    setOpen((current) =>
      current.includes(id) ? current : allOpen ? [...current, id] : [id],
    );
    onOpenHeading(heading);
    requestAnimationFrame(() => {
      bodies.current
        .get(id)
        ?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  };
  return (
    <article className="lesson-content">
      {outline.intro && <ReactMarkdown>{outline.intro}</ReactMarkdown>}
      {outline.sections.length > 0 && (
        <nav className="lesson-contents" aria-label="Contents">
          <h2>Contents</h2>
          <ol>
            {outline.sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => jump(section.id, section.heading)}
                >
                  {section.heading}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {outline.sections.map((section) => {
        const isOpen = open.includes(section.id);
        return (
          <section
            className={cx("lesson-section", isOpen && "open")}
            key={section.id}
            ref={(node) => {
              bodies.current.set(section.id, node);
            }}
          >
            <h2>
              <button
                type="button"
                className="lesson-section-toggle"
                aria-expanded={isOpen}
                onClick={() => toggle(section.id, section.heading)}
              >
                <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                {section.heading}
              </button>
            </h2>
            {isOpen && <SectionBody body={section.body} />}
          </section>
        );
      })}
    </article>
  );
}

/** Parsing a section is expensive; never redo it while the learner types. */
const SectionBody = memo(function SectionBody({ body }: { body: string }) {
  return (
    <div className="lesson-section-body">
      <ReactMarkdown>{body}</ReactMarkdown>
    </div>
  );
});

export const LessonReader = memo(LessonReaderView);
