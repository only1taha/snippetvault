# snippetvault

[![CI](https://github.com/YOUR_USERNAME/snippetvault/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/snippetvault/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/snippetvault.svg)](https://npmjs.com/package/snippetvault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

> Your personal code snippet manager — save, tag, search, and recall code snippets instantly from the CLI.

## Features

- 💾 **Save snippets** — Store code with title, language, and tags
- 🔍 **Fuzzy search** — Find snippets by title, content, tags, or language
- 🏷️ **Tagging system** — Organize with unlimited tags
- 📋 **Copy to clipboard** — One-command copy (macOS/Linux)
- 🗂️ **Export/Import** — Backup and share your vault as JSON
- 📊 **Stats** — See your most-used languages and tags

## Installation

```bash
npm install
```

## Usage

```bash
# Add a snippet (opens $EDITOR or prompts inline)
node src/snippetvault.js add --title "Reverse a string" --lang js --tags "js,strings,utils"

# Add from a file
node src/snippetvault.js add --title "Docker compose" --file docker-compose.yml --tags "docker,devops"

# List all snippets
node src/snippetvault.js list

# Search snippets
node src/snippetvault.js search "reverse string"

# Show a snippet by ID
node src/snippetvault.js show 3

# Delete a snippet
node src/snippetvault.js delete 3

# Filter by tag
node src/snippetvault.js list --tag docker

# Export vault
node src/snippetvault.js export --output my-snippets.json

# Import from backup
node src/snippetvault.js import --input my-snippets.json

# View stats
node src/snippetvault.js stats
```

## Storage

Snippets are stored locally in `~/.snippetvault/vault.json`.

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the CLI |
| `npm test` | Run tests |
| `npm run tracker` | Show achievement progress |
| `npm run roadmap` | Show Day 1 → Month 1 roadmap |

## License

MIT © Your Name
