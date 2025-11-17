# Push to GitHub - Step by Step Guide

## Option 1: If you already created a GitHub repository

1. **Add all files:**
   ```bash
   git add .
   ```

2. **Make your first commit:**
   ```bash
   git commit -m "Initial commit: Campus Placement Management System with fancy UI"
   ```

3. **Add your GitHub repository as remote:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

4. **Push to GitHub:**
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Option 2: If you need to create a new GitHub repository

1. **First, add and commit locally:**
   ```bash
   git add .
   git commit -m "Initial commit: Campus Placement Management System with fancy UI"
   ```

2. **Go to GitHub.com and:**
   - Click the "+" icon in the top right
   - Select "New repository"
   - Name it (e.g., "campus-placement-system")
   - Choose public or private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

3. **Then add remote and push:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

## Quick One-Line Commands (after creating repo on GitHub)

```bash
git add . && git commit -m "Initial commit: Campus Placement Management System" && git branch -M main && git push -u origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

