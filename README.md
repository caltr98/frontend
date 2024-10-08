# Integration with CAVS

This integration was developed to research fake news mitigation on a real Online Social Network. The CAVS (Credibility Assessment and Verification System) and this integration were developed as part of a master’s thesis project.

## Prerequisites

- **Node.js**: v14.15.5
- **NPM**: v7
- **CAVS** installed from (CAVS on Github)[https://github.com/caltr98/CAVS.git] following its instruction

### Installation

1. **Install Node.js and NPM**

   Use `nvm` to install Node.js v14.15.5:

   ```bash
   nvm install v14.15.5
   npm install npm@7 -g
   ```
2. Setup project
    ```bash
    nvm use v14.15.5
    npm install
    ```

### Run
1. Start CAVS
2. Start frontend app
   ```bash
   nvm use v14.15.5
   npm start
   ```
![DeSo Logo](src/assets/deso/camelcase_logo.svg)

# About DeSo

DeSo is a blockchain built from the ground up to support a fully-featured
social network. Its architecture is similar to Bitcoin, only it supports complex
social network data like profiles, posts, follows, creator coin transactions, and
more.

[Read about the vision](https://docs.deso.org/#the-ultimate-vision)

# About This Repo

Documentation for this repo lives on docs.deso.org. Specifically, the following
docs should give you everything you need to get started:

- [DeSo Code Walkthrough](https://docs.deso.org/code/walkthrough)
- [Setting Up Your Dev Environment](https://docs.deso.org/code/dev-setup)
- [Making Your First Changes](https://docs.deso.org/code/making-your-first-changes)

# Node / NPM versions

This frontend works best with Node v14.15.5 and Npm v7. If you can't use these versions, then try `npm install --force`.

# Start Coding

The quickest way to contribute changes to the DeSo Frontend is the following these steps:

1. Open frontend repo in Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/deso-protocol/frontend)

You can use any repo / branch URL and just prepend `https://gitpod.io/#` to it.

2. If needed, login to your github account

3. Set the correct `lastLocalNodeV2` to `"https://api.tijn.club"` in your browser Local Storage for the gitpod preview URL

4. Create a new branch to start working

To commit / submit a pull request from gitpod, you will need to give gitpod additional permissions to your github account: `public_repo, read:org, read:user, repo, user:email, workflow` which you can do on the [GitPod Integrations page](https://gitpod.io/integrations).
