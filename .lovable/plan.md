

## Notes/Guides Feature

Based on the reference screenshot, the Notes/Guides tab displays note cards in a horizontal grid layout, each showing a title (underlined) and a preview of the content with overflow truncated. There's also an "Add notes" card with a dashed border and plus icon.

### Plan

**1. Create `NoteEditorPage.tsx`** — A new page at `/class/:className/note/:noteId`
- Full-page editor with a title input and a large textarea for free-form content
- Back button to return to the class page
- Auto-saves to localStorage on changes (key: `keen_notes_[slug]`)
- Delete button with confirmation dialog and fade-out animation
- Page fades in on mount using `animate-fade-in`

**2. Update `ClassPage.tsx`** — Add Notes/Guides content rendering
- Load/save notes from localStorage (`keen_notes_[slug]`)
- Render notes as a responsive grid (3 columns on desktop) of card-style boxes
- Each card shows: title (bold, underlined, at top) and content preview (overflowed text with `line-clamp` and ellipsis)
- Clicking a card navigates to the note editor page
- "Add notes" card: dashed border, plus icon, centered text — clicking navigates to a new note page with fade-in transition

**3. Update `App.tsx`** — Add route `/class/:className/note/:noteId`

### Data Structure
```typescript
interface Note {
  id: string;
  title: string;
  content: string;
}
```

### Layout (matching screenshot)
- Grid: `grid grid-cols-1 md:grid-cols-3 gap-4`
- Each card: bordered box, fixed height (~280px), overflow hidden
- Title at top with underline, content below in small text with `line-clamp`
- Add card: dashed border, centered plus icon + "Add notes" text

