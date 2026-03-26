# Getting Started

```
npm install
npm run dev
```

# Testing
## Create a job
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d '{"name": "crow"}' | jq

  # Create another
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d '{"name": "pelican"}' | jq

  # Idempotency check — same name again
  curl -s -X POST http://localhost:3200/bird \
    -H "Content-Type: application/json" \
    -d '{"name": "crow"}' | jq

  # Get result (will 404 until worker processes it)
  curl -s "http://localhost:3200/bird?name=crow" | jq
