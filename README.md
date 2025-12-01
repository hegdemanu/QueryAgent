# AI Agent for ClickHouse

This project is a TypeScript-based AI agent that can:

1.  Seed data from a source database to ClickHouse.
2.  Generate and execute queries on ClickHouse using AI.
3.  Clean up after processing if needed.

## Getting Started

### Prerequisites

*   Node.js (v20 or later)
*   Docker

### Building and Running the Docker Image

1.  **Build the image:**

    ```bash
    docker build -t ai-agent .
    ```

2.  **Run the container:**

    ```bash
    docker run ai-agent
    ```
