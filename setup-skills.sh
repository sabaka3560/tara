#!/bin/bash
# Run once to install all Claude Code skills for Tara
# Usage: bash setup-skills.sh

echo "Setting up Tara Claude Code skills..."

mkdir -p .claude/skills

# 1. React Native skills (callstack — official RN team)
echo "Installing React Native skills..."
git clone --depth=1 https://github.com/callstackincubator/agent-skills .claude/skills/react-native
echo "✓ React Native skills installed"

# 2. Awesome agent skills (1000+ community skills)
echo "Installing community skills..."
git clone --depth=1 https://github.com/VoltAgent/awesome-agent-skills .claude/skills/community
echo "✓ Community skills installed"

# 3. Claude skills hub (UI design + software engineer skills)
echo "Installing Claude skills hub..."
git clone --depth=1 https://github.com/alirezarezvani/claude-skills .claude/skills/hub
echo "✓ Skills hub installed"

echo ""
echo "All skills installed. Run /skills in Claude Code to see available commands."
echo ""
echo "Key skills for Tara:"
echo "  /rn-component   — React Native component scaffold"
echo "  /rn-screen      — Full screen with navigation"
echo "  /review         — PR review"
echo "  /security-review — Security audit"
echo "  /simplify       — Remove over-engineering"
