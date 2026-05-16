<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Task completion workflow

When a task is complete, run:

```bash
git add .
git commit
git push
ssh gotdev@myserver "cd apps/todo-list && deploy"
```
