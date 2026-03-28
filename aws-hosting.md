## Part 1: Click in AWS Lightsail first

### Step 1: Open your instance

- Log in to AWS.
- Open Lightsail.
- Click Instances.
- Click your instance: ubuntu-1.

### Step 2: Attach a Static IP

Do this so the IP does not change later. AWS documents that the default public IPv4 can change after stop/start, while a static IPv4 stays the same.

- Inside the instance page, click the Networking tab.
- Find Static IPs.
- Click Create static IP.
- Select your instance: ubuntu-1.
- Click Create.
- After it attaches, copy the new static IP.

Use this static IP everywhere from now on.

### Step 3: Open firewall ports

Lightsail firewalls control inbound traffic to the instance. For a simple web app, open 22, 80, and 443. AWS also notes IPv4 and IPv6 firewall rules are configured separately.

- Stay on the Networking tab.
- In IPv4 Firewall, add:
- SSH / TCP / port 22
- HTTP / TCP / port 80
- HTTPS / TCP / port 443
- For now, you can ignore IPv6 if you are only going to test with the IPv4 address.

Do not open:

- 3000
- 5432
- 6379

### Step 4: Connect to the server

AWS says the easiest way to connect to a Linux Lightsail instance is the browser-based SSH client.

- Go back to the Instances tab.
- On ubuntu-1, click the terminal / SSH icon or Connect using SSH.
- A browser terminal will open.

Everything below is done inside that terminal.

---

## Part 2: Prepare the server

### Step 5: Update Ubuntu

Copy and paste this:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl unzip build-essential ca-certificates gnupg lsb-release rsync
```

### Step 6: Install Node.js with nvm

nvm is the common official way to install and manage Node versions, and using the current LTS version is the safe path for production.

Paste this:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

nvm install --lts
nvm use --lts

node -v
npm -v
```

If your project uses pnpm, run this too:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

### Step 7: Install PM2

PM2 is a Node process manager. Its docs say to use pm2 startup, then run the command it prints, and then pm2 save so apps restart after reboot.

```bash
npm install -g pm2
pm2 -v
```

### Step 8: Install PostgreSQL

PostgreSQL’s Ubuntu page says Ubuntu includes PostgreSQL by default and you can install it with apt install postgresql.

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Step 9: Create a PostgreSQL database and user

Now create the DB user and DB name for your project.

Open PostgreSQL:

```bash
sudo -u postgres psql
```

Inside PostgreSQL, paste this:

```sql
CREATE USER myappuser WITH PASSWORD 'StrongDbPassword123!';
CREATE DATABASE myappdb OWNER myappuser;
GRANT ALL PRIVILEGES ON DATABASE myappdb TO myappuser;
\q
```

You can change:

- myappuser
- myappdb
- StrongDbPassword123!

### Step 10: Install Redis

Redis provides Ubuntu/Debian APT instructions: add the Redis repo, update, and install Redis. Their docs also note Redis starts automatically and restarts at boot.

Paste this:

```bash
sudo apt-get install -y lsb-release curl gpg
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install -y redis
```

Start it:

```bash
sudo systemctl enable redis-server || sudo systemctl enable redis
sudo systemctl start redis-server || sudo systemctl start redis
redis-cli ping
```

You should see:

```text
PONG
```

---

## Part 3: Put your project files on the server

Create folders first:

```bash
sudo mkdir -p /opt/apps
sudo chown -R $USER:$USER /opt/apps
cd /opt/apps
mkdir backend frontend
```

Now choose one of these two ways:

### Way A: Your code is on GitHub

Use this if your repos already exist online.

```bash
cd /opt/apps
git clone YOUR_BACKEND_REPO_URL backend
git clone YOUR_FRONTEND_REPO_URL frontend
```

### Way B: Your code is only on your computer

Use SFTP, FileZilla, or upload zip files another way. AWS documents SFTP access with your instance’s SSH key and public IP.

Upload:

- backend zip → /opt/apps/backend
- frontend zip → /opt/apps/frontend

Then unzip:

```bash
cd /opt/apps/backend
unzip backend.zip

cd /opt/apps/frontend
unzip frontend.zip
```

---

## Part 4: Deploy the backend

### Step 11: Install backend dependencies

```bash
cd /opt/apps/backend
npm ci
```

If your backend uses pnpm, use:

```bash
pnpm install --frozen-lockfile
```

### Step 12: Create backend .env

Open env file:

```bash
nano /opt/apps/backend/.env
```

Paste this example:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://myappuser:StrongDbPassword123!@127.0.0.1:5432/myappdb?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="PUT_A_LONG_RANDOM_SECRET_HERE"
```

Save in nano:

- press Ctrl + O
- press Enter
- press Ctrl + X

### Step 13: Run Prisma for production

Prisma’s production docs say to use prisma migrate deploy to apply pending migrations in production.

Run:

```bash
cd /opt/apps/backend
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Step 14: Start NestJS with PM2

```bash
cd /opt/apps/backend
pm2 start dist/main.js --name nest-api
pm2 status
pm2 logs nest-api --lines 50
```

Now make PM2 survive reboot. PM2’s docs say:

- run pm2 startup
- run the command it prints
- run pm2 save

So do:

```bash
pm2 startup
```

It will print another command. Copy that printed command and run it.

Then run:

```bash
pm2 save
```

### Step 15: Make sure your Nest app uses /api

Your Nginx setup will send /api traffic to NestJS. In src/main.ts, add this if it is not already there:

```ts
app.setGlobalPrefix('api');
```

Then rebuild and restart:

```bash
cd /opt/apps/backend
npm run build
pm2 restart nest-api
```

---

## Part 5: Deploy the Vite frontend

### Step 16: Install frontend dependencies

```bash
cd /opt/apps/frontend
npm ci
```

Or if using pnpm:

```bash
pnpm install --frozen-lockfile
```

### Step 17: Create frontend production env

Open file:

```bash
nano /opt/apps/frontend/.env.production
```

Paste:

```env
VITE_API_BASE_URL=/api
```

Save and exit.

### Step 18: Build the frontend

```bash
cd /opt/apps/frontend
npm run build
```

This should create a dist folder.

### Step 19: Copy frontend build to Nginx folder

```bash
sudo mkdir -p /var/www/app
sudo rsync -av --delete /opt/apps/frontend/dist/ /var/www/app/
```

---

## Part 6: Configure Nginx

### Step 20: Create the Nginx config

Because you have no domain yet, use the server IP through a catch-all Nginx config. Lightsail instances are reachable by public IP, so this works fine for now.

Open the config file:

```bash
sudo nano /etc/nginx/sites-available/app
```

Paste this:

```nginx
server {
listen 80;
listen [::]:80;
server*name *;

    root /var/www/app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

}
```

Save and exit.

### Step 21: Enable the config

```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

If nginx -t says successful, you are good.

---

## Part 7: Test it

### Step 22: Open your app in the browser

In your browser, open:

```text
http://YOUR_STATIC_IP
```

Example:

```text
http://3.221.190.4
```

Your Vite admin dashboard should open.

### Step 23: Test the API

Open:

```text
http://YOUR_STATIC_IP/api
```

If /api is not a valid route in your app, test one of your real API routes, like:

```text
http://YOUR_STATIC_IP/api/auth/login
```

### Step 24: Check services on the server

Run:

```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server || sudo systemctl status redis
```

If something is broken, the first place to check is:

```bash
pm2 logs nest-api --lines 100
```

---

## Part 8: Updating the project later

### Backend update

```bash
cd /opt/apps/backend
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart nest-api
```

### Frontend update

```bash
cd /opt/apps/frontend
git pull
npm ci
npm run build
sudo rsync -av --delete dist/ /var/www/app/
```

---

## Part 9: Important beginner notes

- Use the Static IP, not the old temporary IP. AWS says the default public IPv4 can change after stop/start.
- Keep only ports 22, 80, 443 open in Lightsail firewall. Lightsail firewalls are where inbound access is allowed.
- Do not open PostgreSQL 5432 or Redis 6379 to the public internet.
- Without a domain, use plain HTTP for now. Let’s Encrypt’s standard certificates are for servers using a domain name, so the normal beginner HTTPS flow is easier after the client gives you a domain.

### Your exact order of work

- Lightsail → instance → Networking → create Static IP
- Open ports 22, 80, 443
- Open browser SSH

#### Install:

- Nginx
- Node
- PM2
- PostgreSQL
- Redis

- Upload or clone backend + frontend
- Create backend .env

#### Run Prisma:

```bash
npx prisma generate
npx prisma migrate deploy
```

- Build backend
- Start backend with PM2
- Build frontend
- Copy dist to /var/www/app
- Create Nginx config
- Restart Nginx
- Open http://YOUR_STATIC_IP

Send me your backend repo structure and frontend repo structure next, and I’ll rewrite this into the exact commands for your project files.
