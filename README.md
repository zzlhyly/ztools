# ztools

A desktop application built with [Tauri](https://tauri.app/), [Vue 3](https://vuejs.org/), and [TypeScript](https://www.typescriptlang.org/).

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Rust (Tauri)
- **Build Tool**: Vite
- **Package Manager**: npm

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) (v7 or later)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites) (optional, but recommended)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ztools.git
   cd ztools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To start the development server:

```bash
npm run tauri dev
```

This will:
- Start the Vite dev server for the frontend
- Compile and run the Tauri backend
- Open the application window

## Building

To build the application for production:

```bash
npm run tauri build
```

The built application will be located in `src-tauri/target/release/bundle/`.

## Project Structure

```
ztools/
├── src/                  # Frontend source code
│   ├── App.vue           # Main Vue component
│   ├── main.ts           # Entry point
│   └── assets/           # Static assets
├── src-tauri/            # Rust backend code
│   ├── src/              # Rust source files
│   │   ├── lib.rs        # Library code
│   │   └── main.rs       # Main entry point
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── public/               # Public static assets
├── package.json          # Node.js dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── LICENSE               # MIT License
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
