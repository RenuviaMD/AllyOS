# `.claude/` — Claude Code setup for this repo

Everything here is checked in, so it loads automatically in every Claude session on this
repo and applies to **every app in it** — `app-pimaster/`, `allyos/`, `ally/`, `protocols/`,
and the root HTML pages — plus any app added later.

## Skills (`.claude/skills/`)

| Skill | What it does |
|---|---|
| `ship` | Verify + commit + push app-pimaster (pre-existing). |
| `frontend-design` | UI/UX design direction — invoked before building or reshaping any interface. |

### frontend-design

Vendored verbatim from Anthropic's `frontend-design` plugin
(<https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design>), plugin v1.1.0,
upstream commit `5cf69b18c86d0224dc53815332bbd85574b97097`, vendored 2026-08-06.

It is installed as a **project skill** rather than a plugin so it travels with the repo — no
per-machine or per-session install step, and it survives ephemeral cloud sessions.

`SKILL.md` is a byte-for-byte copy of upstream. Do not hand-edit it. To update:

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/anthropics/claude-code.git cc
cd cc && git sparse-checkout set plugins/frontend-design
cp plugins/frontend-design/skills/frontend-design/SKILL.md \
   /path/to/repo/.claude/skills/frontend-design/SKILL.md
```

Then refresh the commit hash and date in `LICENSE.txt`.

## MCP servers (`.mcp.json`)

### 21st (21st.dev)

Remote HTTP MCP at `https://21st.dev/api/mcp`. Tools: `generate`, `get_inspiration`,
`search`, `search_logo`.

**Requires an API key — not yet supplied.** Until it is set, the server loads but every
call returns 401.

1. Get a key at <https://21st.dev/mcp> (sign in required).
2. Export it in the environment Claude runs in — the config reads `${TWENTY_FIRST_API_KEY}`:

   ```bash
   export TWENTY_FIRST_API_KEY="..."
   ```

   For cloud sessions, set it as an environment variable on the Claude Code environment.

The key is referenced by variable only. **Never commit the literal key to this repo.**

## Verify the setup

```bash
# skill present and frontmatter intact
head -5 .claude/skills/frontend-design/SKILL.md

# MCP config is valid JSON
python3 -m json.tool .mcp.json
```

In a session, `/skills` should list `frontend-design`, and `/mcp` should list `21st`.
