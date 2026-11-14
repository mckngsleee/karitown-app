# Karitown frontend

The phone app: an offline-first **PWA** (a web app you can install on the home screen). Built with Vite, React and TypeScript.

## Folder map

```
frontend/
├── public/icons/          app icons for the home screen
├── src/
│   ├── main.tsx           starts the app; fonts; offline support
│   ├── App.tsx            header + current screen + pinned action + bottom tabs
│   ├── styles.css         brand colours (60-20-15-5), Open Sans, shared styles
│   ├── screens/           one file per screen, laid out like the prototype
│   ├── ui/                Icon, Footer (pinned action), Sheet (pop-ups), small parts
│   ├── store/             the app's memory: records on the phone, actions, sync to the API
│   └── lib/               money and kilo formatting, business rules (+ tests)
├── index.html
├── vite.config.ts         build settings + app name, colours and icons for installing
└── package.json           libraries and commands
```

The phone saves every record on itself first, then uploads it (Sync screen → Waiting to upload).
A new phone copies the shop's records from the server the first time it connects.

## Run it on your computer

You need Node.js 22 (`node -v`). The app needs the backend running too, so use **three Git Bash windows**.

**Window 1: the local database (DynamoDB Local in Docker).** Docker Desktop must be running.

```bash
docker run --rm -p 8001:8000 amazon/dynamodb-local
```

**Window 2: the backend API**

```bash
cd ~/projects/karitown-app/backend
source .venv/Scripts/activate
export DYNAMODB_ENDPOINT=http://localhost:8001 AWS_DEFAULT_REGION=ap-southeast-1 AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local
python -m app.database        # create the table (first time after starting window 1)
python -m app.demo_data       # sample materials, suppliers, buyers
uvicorn app.main:app --reload --port 8000
```

**Window 3: the app**

```bash
cd ~/projects/karitown-app/frontend
npm install                   # first time only
npm run dev
```

Open **http://localhost:5173** in Chrome. Press **F12 → device toolbar** (the phone icon) and choose a 360×800 size to see it as on a phone.

**On your own phone:** connect it to the same Wi-Fi. `npm run dev` prints a `Network:` address like `http://192.168.1.5:5173`; open that on the phone. To let the phone reach the API too, create `frontend/.env.local` with `VITE_API_URL=http://192.168.1.5:8000` (your PC's address), start uvicorn with `--host 0.0.0.0`, and restart `npm run dev`.

## Other commands

```bash
npm test          # unit tests (Vitest)
npm run build     # production build into dist/ (also type-checks)
npm run preview   # serve the production build, to test offline mode and installing
```
