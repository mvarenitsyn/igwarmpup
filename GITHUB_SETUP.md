# GitHub Setup Instructions

Follow these steps to push the igwarmpup project to your GitHub account:

## 1. Create a new repository on GitHub

1. Go to [GitHub](https://github.com) and sign in to your account
2. Click the "+" icon in the top right corner and select "New repository"
3. Enter "igwarmpup" as the repository name
4. Add a description (optional): "Instagram automation REST API for story interactions"
5. Choose whether to make the repository public or private
6. Do NOT initialize the repository with a README, .gitignore, or license (since we've already created these locally)
7. Click "Create repository"

## 2. Initialize Git in your local project

If you haven't already initialized Git in your local project, do so with:

```bash
# Make sure you're in the igwarmpup directory
cd igwarmpup

# Initialize Git repository
git init

# Add all files to staging
git add .

# Make initial commit
git commit -m "Initial commit"
```

## 3. Push your local repository to GitHub

After creating the repository on GitHub, push your local code. GitHub will show instructions for pushing an existing repository. Use the following commands, replacing `yourusername` with your GitHub username:

```bash
# Add the remote repository URL
git remote add origin https://github.com/yourusername/igwarmpup.git

# Push the main branch to GitHub
git push -u origin main
```

Note: If your default branch is named "master" instead of "main", use `git push -u origin master` instead.

## 4. Verify the repository

1. Go to `https://github.com/yourusername/igwarmpup` in your browser
2. You should see all your files and the repository structure
3. Your igwarmpup project is now hosted on GitHub!

## Additional information

- You can clone this repository to other machines using:
  ```bash
  git clone https://github.com/yourusername/igwarmpup.git
  ```

- To update the repository after making changes:
  ```bash
  git add .
  git commit -m "Description of changes"
  git push
  ```

- Now that your code is on GitHub, you can proceed with deploying to Railway by following the instructions in `RAILWAY_DEPLOYMENT.md`
