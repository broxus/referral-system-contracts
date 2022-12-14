# Referall Token System
Demo Implenetation of a Referall System within a Hooked MultiToken Bridge between EVM-compatible networks, based directly on the erc20 token bridge.

# Protocols

Currently Supports [TIP4.1](https://docs.everscale.network/standard/TIP-4.1/)

# Docs
See basic overview on [Referall System](docs/Referall.md)

## Development

[DevContainer](https://code.visualstudio.com/docs/remote/containers) in [VsCode](https://code.visualstudio.com/):
- Install [Docker](https://www.docker.com/get-started/)
- [Remote Containers Extention](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

Local:
- Install [Docker](https://www.docker.com/get-started/)
- Install [npm](https://www.npmjs.com/)

## Tests
```bash
# Install Dependencies
npm install
# Run Local Node
docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 tonlabs/local-node
# Run Tests
npx locklift test --network local
```

## Deployment
```bash
npm run script
```