#!/bin/bash

# Script to push Campus Placement System to GitHub
# Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME"
    echo "Example: ./push-to-github.sh johndoe campus-placement-system"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME=$2

echo "🚀 Preparing to push to GitHub..."
echo "Repository: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo ""

# Add all files
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Initial commit: Campus Placement Management System with VanillaTilt and animated UI

- Full-stack application with React + Node.js + MySQL
- Three portals: Admin, Company, Student
- JWT authentication and role-based routing
- Eligibility engine for matching students to drives
- CSV import functionality
- Fancy UI with VanillaTilt.js and animated backgrounds
- Glass morphism design with dynamic gradients
- Complete CRUD operations for all entities"

# Add remote (remove if exists)
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

# Set branch to main
git branch -M main

# Push to GitHub
echo "☁️  Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View your repo at: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
else
    echo ""
    echo "❌ Failed to push. Make sure:"
    echo "   1. The repository exists on GitHub"
    echo "   2. You have write access to the repository"
    echo "   3. You're authenticated with GitHub (git credential or SSH)"
fi

