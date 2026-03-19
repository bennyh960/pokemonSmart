Read CLAUDE.md for project context, then docs/sprint-2.md section 1, and your agent spec at .claude/agents/frontend-developer.md.

```bash
git checkout main
git pull 2>/dev/null
git checkout -b feature/pixel-font
```

Implement ALL tasks 1.1-1.5: Find/create a pixel font that supports both English AND Hebrew, update the renderer, ensure RTL works, fix font sizes for readability.

CRITICAL: Hebrew text must be readable! The current font is nearly illegible. This is a kids game — readability is #1 priority.

When done: self-verify (tsc, dev), update sprint file, request QA per your agent instructions.
