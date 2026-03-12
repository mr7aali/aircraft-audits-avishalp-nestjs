# Running Redis with Docker for NestJS

The easiest way to get Redis ≥ 6.2 running locally for your NestJS project.

---

## 1️⃣ Pull the Redis Image

```bash
docker pull redis:7
```

---

## 2️⃣ Run Redis Container

```bash
docker run -d \
  --name redis-server \
  -p 6379:6379 \
  redis:7
```

| Flag                  | Description                  |
| --------------------- | ---------------------------- |
| `-d`                  | Run in background (detached) |
| `--name redis-server` | Assign a container name      |
| `-p 6379:6379`        | Expose Redis port to host    |
| `redis:7`             | Use Redis version 7 image    |

---

## 3️⃣ Verify Redis is Running

```bash
docker ps
```

You should see a container named `redis-server` in the list.

---

## 4️⃣ Test Redis

Run Redis CLI inside the container:

```bash
docker exec -it redis-server redis-cli
```

Then type:

```
ping
```

Expected output:

```
PONG
```

---

## 5️⃣ Connect NestJS to Redis

Use `localhost:6379` in your Bull or Redis config:

```ts
redis: {
  host: "localhost",
  port: 6379,
}
```

Since Docker exposes port `6379`, your app connects normally.

---

## 6️⃣ Stop / Start the Redis Container

```bash
# Stop
docker stop redis-server

# Start again
docker start redis-server
```

---

## 7️⃣ (Recommended) Use Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3'
services:
  redis:
    image: redis:7
    container_name: redis-server
    ports:
      - '6379:6379'
```

Then run:

```bash
docker compose up -d
```

---

✅ Your NestJS + Redis + Bull queue setup will now work without the Redis 5.0.7 version warning.
