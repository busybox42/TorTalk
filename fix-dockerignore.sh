#!/bin/bash

# Fix the client .dockerignore file
cat > tortalk/.dockerignore << EOF
node_modules
npm-debug.log
build
.git
.gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
README.md
*.md
.DS_Store
EOF

# Fix the server .dockerignore file
cat > tortalk/server/.dockerignore << EOF
node_modules
npm-debug.log
.git
.gitignore
.env
__tests__
*.test.js
*.spec.js
README.md
*.md
.DS_Store
EOF

echo "Fixed .dockerignore files!" 