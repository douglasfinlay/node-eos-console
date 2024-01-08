# Contributing to `eos-console`

👋 Welcome, and thank you for taking the time to contribute!

Please read the following guidelines to ensure a smooth and enjoyable
contribution process. 🚀

> [!IMPORTANT]
> By contributing to this project, you agree to license your work under the
> terms of the [MIT License](https://github.com/douglasfinlay/node-eos-console/blob/main/LICENSE).

## Getting Started

A strong understanding of the Eos OSC implementation is required to contribute
to this project. Most information can be found in the *Show Control* section of
the [Eos Family Online Help](https://www.etcconnect.com/webdocs/Controls/EosFamilyOnlineHelp/en-us/Default.htm),
or in your Eos Operations Manual (console Tab 100).

The [Issue Tracker](https://github.com/douglasfinlay/node-eos-console/issues) is
the preferred channel to [Report a Bug](#report-a-bug),
[Request a Feature](#request-a-feature), and
[Open a Pull Request](#open-a-pull-request) (PR). Please search for existing
issues and PRs before creating your own.

## How Can I Contribute?

### 🐞 Report a Bug

1. Open a bug report using the [Issue Tracker](https://github.com/douglasfinlay/node-eos-console/issues).
2. Clearly describe the problem and include code to reproduce the erroneous behaviour.
   - Please keep the code concise and remove irrelevant details.
   - Attach a minimal Eos show file if necessary. This will be publicly
accessible, so take this into consideration before sharing.
3. State the current and expected behaviour.
4. Include the `eos-console` library version and the Eos software version.

### 💡 Request a Feature

Before you request a feature, please take a moment to consider whether your idea
fits in with the scope and aims of this project.

1. Open a feature request using the [Issue Tracker](https://github.com/douglasfinlay/node-eos-console/issues).
2. Clearly describe your idea.
   - Explain the wider problem you intend to solve.
   - Include as much relevant context as possible.

### 🚀 Open a Pull Request

Pull Requests are a great help and are always welcome. A Pull Request should
relate to an open issue (see [Report a Bug](#report-a-bug) or
[Request a Feature](#request-a-feature)). In general, each PR should be focussed
in scope and only fix/add specific functionality **OR** address wide-spread code
style issues, not both.

**Please ask first** before you embark on significant changes, as you may risk
spending a lot of time working on something that does not align with the
project's goals.

#### Pull Request Workflow

1. [Fork](https://github.com/douglasfinlay/node-eos-console/fork) this
repository to your own GitHub account.

2. Clone the fork to your machine and configure your local copy to track changes
from the original repository.

   ```bash
   git clone https://github.com/<your-username>/node-eos-console.git
   cd node-eos-console
   git remote add upstream https://github.com/douglasfinlay/node-eos-console.git
   ```

3. Install the necessary dependencies.

   ```bash
   npm install
   ```

4. Create a branch (off the `main` branch) to contain your changes.

   ```bash
   git checkout -b <topic-branch-name>
   ```

5. Commit your changes in logical chunks, being sure to write clear and
descriptive commit messages.

   ```bash
   git add <changed-files>
   git commit
   ```

6. Periodically fetch the latest changes from upstream.

   ```bash
   git pull upstream main
   ```

7. Ensure tests and code style checks pass.

   ```bash
   npm test
   npm run lint
   ```

8. Push local changes to your fork.

   ```bash
   git push origin <topic-branch-name>
   ```

9. [Open a Pull Request](https://help.github.com/articles/using-pull-requests/)
with a clear title and description of your proposed changes.

## TypeScript Style Guide

- [Prettier](https://prettier.io) is used to enforce a consistent code style
throughout the project. This is invoked by executing:

   ```bash
   npm run format
   ```

- Avoid using native modules.
- Do not write platform-dependent code.
