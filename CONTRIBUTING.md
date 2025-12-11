# Contributing to AutoRedact

Thank you for your interest in contributing to AutoRedact! We welcome contributions from the community to help make privacy accessible to everyone.

## 📄 License & Copyleft

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.
By contributing to this project, you agree that your contributions will be licensed under the same GPLv3 license.

**What this means:**
- Your code will remain free and open source forever.
- No one can take your contribution, close the source, and sell it as a proprietary product.

## 🛠️ Development Setup

1.  **Fork & Clone**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/AutoRedact.git
    cd AutoRedact
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start Dev Server**:
    ```bash
    npm run dev
    ```

## 🧪 Quality Standards

We use **Husky** to enforce quality before every commit.
- **Linting**: No ESLint errors allowed.
- **Types**: No TypeScript errors allowed.
- **Security**: No secrets or sensitive data (checked by `gitleaks` in CI).

## 🚀 Releasing (Maintainers Only)

To release a new version:
1.  Create a git tag: `git tag v1.0.0`
2.  Push the tag: `git push origin v1.0.0`
3.  GitHub Actions will automatically build, scan, sign, and push the Docker image.
