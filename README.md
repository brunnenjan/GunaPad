# GUNAPAD - Local Setup

Dies ist das vollständige Gunapad-Projekt, bereit für die lokale Entwicklung mit React und Vite.

## Voraussetzungen
- Node.js installiert (v16 oder höher empfohlen)

## Installation & Start

1. **Abhängigkeiten installieren:**
   Öffne ein Terminal in diesem Ordner und führe aus:
   ```bash
   npm install
   ```

2. **Environment Variablen setzen:**
   Erstelle eine `.env.local` (siehe `.env.example`) und trage dort `VITE_GEMINI_API_KEY`, `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_ANON_KEY` ein. Diese Werte werden von Vite beim Build eingebunden und dürfen nicht ins Repo committed werden.
