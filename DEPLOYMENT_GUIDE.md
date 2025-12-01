# 🚀 Gunapad Deployment Guide - Vercel

## ✅ Vorbereitung abgeschlossen!

Das Projekt ist jetzt bereit für das Deployment auf Vercel.

---

## 📋 DEPLOYMENT OPTIONEN

Du hast **2 Möglichkeiten** um auf Vercel zu deployen:

### Option A: **Vercel CLI** (Terminal - schneller)
### Option B: **Vercel Dashboard** (Web Interface - einfacher)

Ich empfehle **Option B** für dich, da es visueller und einfacher ist.

---

## 🌐 OPTION A: VERCEL CLI (Terminal)

### 1. Installiere Vercel CLI:
```bash
npm install -g vercel
```

### 2. Login bei Vercel:
```bash
vercel login
```

### 3. Deploy:
```bash
vercel
```

### 4. Folge den Prompts:
- Set up and deploy? → **Yes**
- Which scope? → Wähle deinen Account
- Link to existing project? → **No**
- What's your project's name? → `gunapad` (oder dein Wunschname)
- In which directory is your code located? → `.` (Enter drücken)
- Want to modify these settings? → **No**

### 5. Environment Variable setzen:
```bash
vercel env add VITE_GEMINI_API_KEY
```
- Wähle: **Production**
- Paste hier **deinen eigenen Google Gemini API Key** (hole ihn dir in Google AI Studio). **Teile den Key niemals öffentlich.**
- Wiederhole den Schritt für `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (findest du im Supabase Dashboard unter Project Settings → API).

### 6. Production Deployment:
```bash
vercel --prod
```

---

## 🖱️ OPTION B: VERCEL DASHBOARD (Empfohlen!)

### SCHRITT 1: GitHub Repository erstellen

1. **Gehe zu GitHub:** https://github.com/new

2. **Erstelle ein neues Repository:**
   - Repository name: `gunapad` (oder dein Wunschname)
   - Description: "Therapeutic bedtime story generator with AI"
   - **WICHTIG:** Wähle **Private** (wegen API Key!)
   - Klick: **Create repository**

3. **Verbinde dein lokales Projekt mit GitHub:**

   Öffne dein Terminal im Projekt-Ordner und führe aus:

   ```bash
   git remote add origin https://github.com/DEIN-USERNAME/gunapad.git
   git branch -M main
   git push -u origin main
   ```

   (Ersetze `DEIN-USERNAME` mit deinem GitHub Username!)

---

### SCHRITT 2: Vercel mit GitHub verbinden

1. **Gehe zu Vercel:** https://vercel.com

2. **Login/Signup:**
   - Klick: **Sign Up** (oder **Login** falls du schon einen Account hast)
   - Wähle: **Continue with GitHub**
   - Autorisiere Vercel

3. **Import Projekt:**
   - Klick: **Add New...** → **Project**
   - Du siehst deine GitHub Repositories
   - Finde: `gunapad` (oder dein Repository Name)
   - Klick: **Import**

---

### SCHRITT 3: Projekt konfigurieren

**1. Build & Output Settings:**
   - Framework Preset: **Vite** (sollte automatisch erkannt werden)
   - Build Command: `npm run build` (automatisch)
   - Output Directory: `dist` (automatisch)
   - Install Command: `npm install` (automatisch)
   - ✅ Alles sollte korrekt sein!

**2. Environment Variables:**

   **WICHTIG!** Klick auf **Environment Variables** und füge hinzu:

   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** *dein Google Gemini API Key* (aus Google AI Studio)
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** *deine Supabase Projekt-URL* (z.B. `https://xyzcompany.supabase.co`)
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** *dein Supabase anon/public API Key*

   Setze jeden Key für **Production**, **Preview** und **Development** und klicke danach auf **Add**.

**3. Deploy:**
   - Klick: **Deploy**
   - ⏳ Warte ~2-3 Minuten während Vercel baut und deployed

**4. Erfolg!**
   - Du siehst: 🎉 **Congratulations!**
   - Deine App ist live unter: `https://gunapad-xxx.vercel.app`

---

### SCHRITT 4: Custom Domain hinzufügen

1. **In deinem Vercel Projekt:**
   - Gehe zu: **Settings** → **Domains**

2. **Domain hinzufügen:**
   - Gib deine Domain ein (z.B. `gunapad.com` oder `www.gunapad.com`)
   - Klick: **Add**

3. **DNS konfigurieren:**

   Vercel zeigt dir jetzt die DNS Settings. Du musst bei deinem Domain Provider (z.B. Namecheap, GoDaddy, etc.) folgende DNS Records hinzufügen:

   **Für Apex Domain (gunapad.com):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

   **Für WWW Subdomain (www.gunapad.com):**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. **Warte auf DNS Propagation:**
   - Kann 5 Minuten bis 48 Stunden dauern
   - Meistens: 15-30 Minuten
   - Vercel zeigt dir wenn es funktioniert!

---

## 🔐 SICHERHEITS-CHECKLISTE

✅ **API Key ist als Environment Variable gesetzt** (nicht im Code!)
✅ **GitHub Repository ist Private**
✅ **.env.local ist in .gitignore** (wird nicht committed)
✅ **Supabase Anon Key ist sicher** (nur öffentliche Operationen, niemals direkt im Code speichern)

> ⚠️ Falls du Keys zuvor versehentlich committed hast: Erzeuge in Google AI Studio und im Supabase Dashboard neue Keys, lösche die alten und aktualisiere die Werte in `.env.local` sowie bei Vercel, bevor du erneut deployst.

---

## 🧪 NACH DEM DEPLOYMENT TESTEN

1. **Öffne deine Vercel URL** (z.B. `https://gunapad-xxx.vercel.app`)

2. **Teste Story-Generierung:**
   - Füge 2 Kinder hinzu
   - Generiere eine Story
   - Öffne Browser Console (F12)
   - ✅ Prüfe: "Story logged successfully to Supabase"

3. **Prüfe Supabase:**
   - Gehe zu Supabase Dashboard
   - Table Editor → `gunapad_logs`
   - ✅ Neue Row sollte erscheinen
   - ✅ Prüfe Anonymisierung

---

## 🔧 TROUBLESHOOTING

### Problem: "API Key not found"
**Lösung:**
- Gehe zu Vercel Dashboard → Dein Projekt → Settings → Environment Variables
- Prüfe ob `VITE_GEMINI_API_KEY` vorhanden ist
- Falls nicht: Füge hinzu und **Redeploy**

### Problem: Build Failed
**Lösung:**
- Gehe zu Vercel Dashboard → Dein Projekt → Deployments
- Klick auf das failed deployment
- Schau dir die Build Logs an
- Meist: Dependencies fehlen → Prüfe package.json

### Problem: Domain funktioniert nicht
**Lösung:**
- DNS braucht Zeit (bis zu 48h, meist 15-30min)
- Prüfe DNS Settings bei deinem Domain Provider
- Nutze https://dnschecker.org um DNS Propagation zu prüfen

---

## 📊 DEPLOYMENT STATUS

✅ **Git Repository:** Initialisiert
✅ **Environment Variables:** Konfiguriert (.env.local, .env.example)
✅ **.gitignore:** Erstellt (schützt API Key)
✅ **vercel.json:** Erstellt (SPA Routing)
✅ **Code:** Bereit für Production

⏳ **Nächste Schritte:**
1. GitHub Repository erstellen (Option B)
2. Code pushen
3. Vercel Import
4. Environment Variables setzen
5. Deploy!
6. Custom Domain hinzufügen

---

## 🎯 WELCHE DOMAIN HAST DU?

Sag mir deine Domain, dann kann ich dir die exakten DNS Settings geben!

**Beispiele:**
- `gunapad.com` → Apex Domain
- `www.gunapad.com` → WWW Subdomain
- `app.gunapad.com` → Custom Subdomain

---

## 💡 TIPPS

**1. Preview Deployments:**
- Jeder Git Push zu einem Branch (außer main) erstellt eine Preview URL
- Perfekt zum Testen vor Production!

**2. Automatic Deployments:**
- Jeder Push zu `main` deployed automatisch zu Production
- Keine manuellen Schritte mehr nötig!

**3. Rollbacks:**
- In Vercel Dashboard → Deployments
- Klick auf ein altes Deployment → **Promote to Production**
- Instant rollback falls was schief geht!

---

## 📞 NÄCHSTE SCHRITTE

1. **Entscheide dich:** CLI (Option A) oder Dashboard (Option B)?
2. **Sag mir deine Domain:** Ich gebe dir die exakten DNS Settings
3. **Fragen?** Ich helfe dir bei jedem Schritt!

**Bereit? Sag mir welche Option du wählst! 🚀**
