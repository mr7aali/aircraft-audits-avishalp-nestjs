You can run Redis with Docker in a few simple steps. This is the easiest way to get Redis ≥ 6.2 for your NestJS project.

1️⃣ Pull the Redis image

First download the latest Redis image.

docker pull redis:7
2️⃣ Run Redis container
docker run -d \
 --name redis-server \
 -p 6379:6379 \
 redis:7

Explanation:

-d → run in background

--name redis-server → container name

-p 6379:6379 → expose Redis port

redis:7 → Redis version 7 image

3️⃣ Verify Redis is running
docker ps

You should see a container named redis-server.

4️⃣ Test Redis

Run Redis CLI inside the container:

docker exec -it redis-server redis-cli

Then type:

ping

Expected result:

PONG
5️⃣ Connect NestJS to Redis

Your Bull or Redis config should be:

redis: {
host: "localhost",
port: 6379,
}

Since Docker exposes port 6379, your app can connect normally.

6️⃣ Stop / Start Redis container

Stop:

docker stop redis-server

Start again:

docker start redis-server
7️⃣ (Recommended) Use Docker Compose

Create docker-compose.yml:

version: "3"
services:
redis:
image: redis:7
container_name: redis-server
ports: - "6379:6379"

Run:

docker compose up -d

✅ Now your NestJS + Redis + Bull queue setup will work without the Redis 5.0.7 warning.

💡 If you want, I can also show you:

🔥 Best Docker setup for NestJS + Redis + PostgreSQL + Prisma

⚡ How to add Redis UI (RedisInsight)

🧠 How Bull queues work with Redis in NestJS

These make debugging 10× easier.
