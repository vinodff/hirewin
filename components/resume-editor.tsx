'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Pencil, Undo2, Redo2, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, Sparkles, Save, RotateCcw, Type,
  Check, X, Award, Languages, BookOpen, Heart, Users, Globe,
  Wrench, Code, FileBadge, Lightbulb, MapPin, Phone,
} from 'lucide-react';

/* ── Types ─────────────────────────────────── */
export type ResumeSection = {
  id: string;
  type: 'header' | 'section-title' | 'content';
  text: string;
};

/* ── Section Presets ───────────────────────── */
type SectionPreset = {
  title: string;
  icon: React.ReactNode;
  starter: string;
  hint: string;
};

const SECTION_PRESETS: SectionPreset[] = [
  {
    title: 'PROJECTS',
    icon: <Code className="w-3.5 h-3.5" />,
    hint: 'Personal & side projects',
    starter:
      'Project Name | Tech Stack | Month Year\n' +
      '• What you built and the impact it had\n' +
      '• Key technical decision and result\n' +
      '• Link: github.com/your-repo',
  },
  {
    title: 'CERTIFICATIONS',
    icon: <FileBadge className="w-3.5 h-3.5" />,
    hint: 'AWS, Google, etc.',
    starter:
      '• AWS Certified Solutions Architect — Amazon Web Services, 2024\n' +
      '• Google Data Analytics Professional Certificate — Coursera, 2023',
  },
  {
    title: 'AWARDS & ACHIEVEMENTS',
    icon: <Award className="w-3.5 h-3.5" />,
    hint: 'Honors, recognitions',
    starter:
      '• Award Name — Issuing Organization, Year\n' +
      '• Brief context (1 line)',
  },
  {
    title: 'LANGUAGES',
    icon: <Languages className="w-3.5 h-3.5" />,
    hint: 'Spoken languages',
    starter: 'English (Native) · Hindi (Fluent) · Spanish (Conversational)',
  },
  {
    title: 'PUBLICATIONS',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    hint: 'Papers, articles',
    starter:
      '• Title of Paper — Co-authors, Journal/Conference, Year\n' +
      '• Brief one-line summary',
  },
  {
    title: 'VOLUNTEER EXPERIENCE',
    icon: <Heart className="w-3.5 h-3.5" />,
    hint: 'Community work',
    starter:
      'Role | Organization | Month Year – Present\n' +
      '• What you contributed and the impact',
  },
  {
    title: 'LEADERSHIP & ACTIVITIES',
    icon: <Users className="w-3.5 h-3.5" />,
    hint: 'Clubs, roles, events',
    starter:
      'Role | Group | Year\n' +
      '• Initiative led and outcome',
  },
  {
    title: 'TECHNICAL SKILLS',
    icon: <Wrench className="w-3.5 h-3.5" />,
    hint: 'Tools, languages',
    starter:
      'Languages: Python, JavaScript, SQL\n' +
      'Frameworks: React, Node.js, FastAPI\n' +
      'Tools: Git, Docker, AWS',
  },
  {
    title: 'INTERESTS',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    hint: 'Hobbies, passions',
    starter: 'Photography · Long-distance running · Open-source contributions',
  },
  {
    title: 'REFERENCES',
    icon: <Users className="w-3.5 h-3.5" />,
    hint: 'On request',
    starter: 'Available upon request.',
  },
];

/* ── Inline Field Presets (for header/contact) ─ */
type FieldPreset = {
  label: string;
  icon: React.ReactNode;
  template: string;
};

const FIELD_PRESETS: FieldPreset[] = [
  { label: 'LinkedIn', icon: <Globe className="w-3.5 h-3.5" />, template: 'linkedin.com/in/your-handle' },
  { label: 'GitHub', icon: <Code className="w-3.5 h-3.5" />, template: 'github.com/your-handle' },
  { label: 'Portfolio', icon: <Globe className="w-3.5 h-3.5" />, template: 'yourdomain.com' },
  { label: 'Phone', icon: <Phone className="w-3.5 h-3.5" />, template: '+1 (555) 123-4567' },
  { label: 'Location', icon: <MapPin className="w-3.5 h-3.5" />, template: 'City, State' },
];

/* ── Helpers ───────────────────────────────── */
function parseResumeToSections(text: string): ResumeSection[] {
  const lines = text.split('\n');
  const sections: ResumeSection[] = [];
  let currentContent: string[] = [];
  let id = 0;

  const flush = () => {
    if (currentContent.length > 0) {
      sections.push({
        id: `sec-${id++}`,
        type: 'content',
        text: currentContent.join('\n'),
      });
      currentContent = [];
    }
  };

  let isFirst = true;
  for (const line of lines) {
    const trimmed = line.trimEnd();

    // First non-empty line = name header
    if (isFirst && trimmed) {
      flush();
      sections.push({ id: `sec-${id++}`, type: 'header', text: trimmed });
      isFirst = false;
      continue;
    }

    // ALL CAPS section headers
    if (
      trimmed &&
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 2 &&
      !/^\d/.test(trimmed) &&
      !isFirst
    ) {
      flush();
      sections.push({ id: `sec-${id++}`, type: 'section-title', text: trimmed });
      continue;
    }

    currentContent.push(line);
    if (isFirst && trimmed) isFirst = false;
  }
  flush();
  return sections;
}

function sectionsToText(sections: ResumeSection[]): string {
  return sections.map((s) => s.text).join('\n');
}

/* ── Main Component ────────────────────────── */
type Props = {
  initialText: string;
  onSave: (text: string) => void;
  onReoptimize?: (sectionText: string, sectionTitle: string) => void;
};

export default function ResumeEditor({ initialText, onSave, onReoptimize }: Props) {
  const [sections, setSections] = useState<ResumeSection[]>(() =>
    parseResumeToSections(initialText)
  );
  const [history, setHistory] = useState<ResumeSection[][]>([]);
  const [future, setFuture] = useState<ResumeSection[][]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [activeAddTab, setActiveAddTab] = useState<'preset' | 'custom'>('preset');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editText]);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-30), sections]);
    setFuture([]);
  }, [sections]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [...f, sections]);
    setSections(prev);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setHistory((h) => [...h, sections]);
    setSections(next);
    setFuture((f) => f.slice(0, -1));
  };

  const startEdit = (section: ResumeSection) => {
    setEditingId(section.id);
    setEditText(section.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    pushHistory();
    setSections((s) =>
      s.map((sec) => (sec.id === editingId ? { ...sec, text: editText } : sec))
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteSection = (id: string) => {
    pushHistory();
    setSections((s) => s.filter((sec) => sec.id !== id));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    pushHistory();
    const next = [...sections];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSections(next);
  };

  const addSection = (titleOverride?: string, starterOverride?: string) => {
    const rawTitle = (titleOverride ?? newSectionTitle).trim();
    if (!rawTitle) return;
    pushHistory();
    const id = `sec-${Date.now()}`;
    const newItems: ResumeSection[] = [
      { id: `${id}-t`, type: 'section-title', text: rawTitle.toUpperCase() },
      { id: `${id}-c`, type: 'content', text: starterOverride ?? 'Add your content here...' },
    ];
    setSections((s) => {
      if (insertAfterId) {
        const idx = s.findIndex((sec) => sec.id === insertAfterId);
        if (idx >= 0) {
          const next = [...s];
          next.splice(idx + 1, 0, ...newItems);
          return next;
        }
      }
      return [...s, ...newItems];
    });
    setNewSectionTitle('');
    setAddSectionOpen(false);
    setInsertAfterId(null);
  };

  const insertFieldIntoHeader = (fieldText: string) => {
    const headerIdx = sections.findIndex((s) => s.type === 'header');
    if (headerIdx < 0) return;
    pushHistory();
    setSections((s) =>
      s.map((sec, i) =>
        i === headerIdx
          ? { ...sec, text: sec.text + (sec.text.endsWith('\n') ? '' : '\n') + fieldText }
          : sec
      )
    );
  };

  const openAddAfter = (id: string) => {
    setInsertAfterId(id);
    setAddSectionOpen(true);
    setActiveAddTab('preset');
  };

  const closeAddSection = () => {
    setAddSectionOpen(false);
    setInsertAfterId(null);
    setNewSectionTitle('');
  };

  const handleSave = () => {
    const text = sectionsToText(sections);
    onSave(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetToOriginal = () => {
    pushHistory();
    setSections(parseResumeToSections(initialText));
  };

  /* ── Drag & Drop ─────────────────────────── */
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    pushHistory();
    const fromIdx = sections.findIndex((s) => s.id === dragId);
    const toIdx = sections.findIndex((s) => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setSections(next);
    setDragId(null);
  };

  const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
  };

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-white">Resume Editor</h3>
          <span className="text-xs text-slate-500 ml-2">Click any section to edit</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <button
            onClick={resetToOriginal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-1">
        {sections.map((section, idx) => {
          const isEditing = editingId === section.id;

          return (
            <div
              key={section.id}
              draggable={!isEditing}
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(section.id)}
              className={`group relative rounded-xl transition-all ${
                dragId === section.id ? 'opacity-40' : ''
              } ${isEditing ? '' : 'hover:bg-white/[0.03] cursor-pointer'}`}
              style={{
                border: isEditing
                  ? '1px solid rgba(124,58,237,0.4)'
                  : '1px solid transparent',
                background: isEditing ? 'rgba(124,58,237,0.06)' : undefined,
              }}
            >
              {/* Section controls (visible on hover) */}
              {!isEditing && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                    disabled={idx === 0}
                    className="p-1 text-slate-600 hover:text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <GripVertical className="w-3 h-3 text-slate-700 mx-auto cursor-grab" />
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                    disabled={idx === sections.length - 1}
                    className="p-1 text-slate-600 hover:text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Hover actions */}
              {!isEditing && (
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {section.type !== 'header' && onReoptimize && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find the section title above this content block
                        const titleIdx = sections.slice(0, idx).reverse().findIndex((s) => s.type === 'section-title');
                        const title = titleIdx >= 0 ? sections[idx - 1 - titleIdx]?.text || 'Section' : 'Section';
                        onReoptimize(section.text, title);
                      }}
                      className="p-1.5 rounded-md text-purple-400 hover:bg-purple-500/10 transition-all"
                      title="Re-optimize with AI"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); openAddAfter(section.id); }}
                    className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    title="Insert section below"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(section); }}
                    className="p-1.5 rounded-md text-slate-400 hover:bg-white/5 transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {section.type !== 'header' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Content display */}
              {isEditing ? (
                <div className="p-3">
                  <textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={{
                      ...inputStyle,
                      minHeight: '80px',
                      fontFamily: section.type === 'header' ? 'inherit' : 'monospace',
                      fontSize: section.type === 'header' ? '16px' : '13px',
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEdit();
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-600">
                      Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400">Ctrl+Enter</kbd> to save · <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400">Esc</kbd> to cancel
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 text-xs rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 text-xs rounded-md text-white font-medium transition-all"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="p-3"
                  onClick={() => startEdit(section)}
                >
                  {section.type === 'header' && (
                    <div>
                      <div className="text-lg font-bold text-white text-center whitespace-pre-wrap">{section.text}</div>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 text-center">
                          Quick-add contact field
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {FIELD_PRESETS.map((field) => (
                            <button
                              key={field.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                insertFieldIntoHeader(field.template);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 hover:text-white transition-all"
                              style={{
                                background: 'rgba(124,58,237,0.06)',
                                border: '1px solid rgba(124,58,237,0.18)',
                              }}
                              title={`Add ${field.label}`}
                            >
                              {field.icon}
                              {field.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {section.type === 'section-title' && (
                    <div className="flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <div className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                        {section.text}
                      </div>
                      <div className="flex-1 h-px bg-white/10 ml-2" />
                    </div>
                  )}
                  {section.type === 'content' && (
                    <pre
                      className="text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed"
                      style={{ fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif' }}
                    >
                      {section.text}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Section */}
      <div className="mt-4">
        {addSectionOpen ? (
          <div
            className="rounded-xl p-4 animate-in"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">
                  {insertAfterId ? 'Insert section here' : 'Add a new section'}
                </span>
              </div>
              <button
                onClick={closeAddSection}
                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex rounded-lg overflow-hidden mb-3 w-fit"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {([
                { key: 'preset', label: 'From preset' },
                { key: 'custom', label: 'Custom' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveAddTab(tab.key)}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={
                    activeAddTab === tab.key
                      ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                      : { color: '#94a3b8' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeAddTab === 'preset' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SECTION_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    onClick={() => addSection(preset.title, preset.starter)}
                    className="flex items-start gap-2 p-3 rounded-lg text-left transition-all hover:bg-white/5"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd' }}
                    >
                      {preset.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {preset.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {preset.hint}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Section name (e.g., COURSEWORK, PATENTS)"
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={inputStyle}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSection();
                    if (e.key === 'Escape') closeAddSection();
                  }}
                />
                <button
                  onClick={() => addSection()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setInsertAfterId(null); setAddSectionOpen(true); setActiveAddTab('preset'); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-purple-400 transition-all border border-dashed border-white/10 hover:border-purple-500/30"
          >
            <Plus className="w-4 h-4" />
            Add new section
          </button>
        )}
      </div>
    </div>
  );
}
