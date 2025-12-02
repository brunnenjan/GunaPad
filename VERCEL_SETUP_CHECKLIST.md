# 🚀 Vercel Deployment Checklist für Gunapad

## ✅ SCHRITT-FÜR-SCHRITT ANLEITUNG

### 📤 STEP 1: Code zu GitHub pushen (Falls noch nicht geschehen)

**Option A: GitHub Desktop (Einfachste Methode)**
1. Öffne GitHub Desktop
2. File → Add Local Repository → Wähle den Gunapad Ordner
3. Klick "Publish repository"
4. Fertig!

**Option B: Terminal mit Token**
1. Gehe zu: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`
4. Copy token
5. Im Terminal:
   ```bash
   git push https://DEIN-TOKEN@github.com/brunnenjan/GunaPad.git main
   ```

**Option C: GitHub CLI**
```bash
gh auth login
git push origin main
```

---

### 🔑 STEP 2: Environment Variables in Vercel setzen

1. **Gehe zu deinem Vercel Projekt:**
   - https://vercel.com/brunnenjan-6631s-projects/gunapad

2. **Klick auf: Settings → Environment Variables**

3. **Füge diese 3 Variables hinzu:**

#### Variable 1: VITE_GEMINI_API_KEY
- **Key:** `VITE_GEMINI_API_KEY`
- **Value:** `AIzaSyDwfRyrnd-K95f5S6PgaYyIdexa1BsacL4`
- **Environment:** Production, Preview, Development (alle 3 auswählen!)
- **Klick:** Add

#### Variable 2: VITE_SUPABASE_URL
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://fulshptohzpuakqlzshb.supabase.co`
- **Environment:** Production, Preview, Development (alle 3 auswählen!)
- **Klick:** Add

#### Variable 3: VITE_SUPABASE_ANON_KEY
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `sb_secret_OFr0O-bbKWUAAqK4p1LLfQ_5hbjJQ14`
- **Environment:** Production, Preview, Development (alle 3 auswählen!)
- **Klick:** Add

---

### 🚀 STEP 3: Deployment triggern

**Nachdem du die Environment Variables hinzugefügt hast:**

1. **Option A: Automatisch (wenn Code gepusht wurde)**
   - Vercel deployed automatisch bei jedem Push zu GitHub
   - Gehe zu: Deployments Tab
   - Du solltest einen laufenden oder abgeschlossenen Deployment sehen

2. **Option B: Manuell triggern**
   - Gehe zu: Deployments Tab
   - Klick: "Redeploy" beim letzten Deployment
   - Oder: Klick "Deploy" oben rechts

3. **Warte 2-3 Minuten**
   - Build läuft
   - Du siehst die Logs live

4. **Erfolg! ✅**
   - Status wird "Ready"
   - Klick auf "Visit" um die App zu sehen

---

### 🌐 STEP 4: Custom Domain gunapad.com verbinden

1. **In deinem Vercel Projekt:**
   - Gehe zu: Settings → Domains

2. **Domain hinzufügen:**
   - Gib ein: `gunapad.com`
   - Klick: Add

3. **Auch www. Subdomain hinzufügen:**
   - Gib ein: `www.gunapad.com`
   - Klick: Add

4. **Vercel zeigt dir jetzt die DNS Settings:**

---

### 📋 DNS SETTINGS FÜR GUNAPAD.COM

**Gehe zu deinem Domain Provider** (wo du gunapad.com gekauft hast, z.B. Namecheap, GoDaddy, etc.)

**Füge diese DNS Records hinzu:**

#### Record 1: Apex Domain (gunapad.com)
```
Type: A
Name: @ (oder leer lassen)
Value: 76.76.21.21
TTL: Automatic
```

#### Record 2: WWW Subdomain (www.gunapad.com)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Automatic
```

---

### ⏱️ DNS PROPAGATION WARTEN

**Nach dem Hinzufügen der DNS Records:**

1. **Warte 5-30 Minuten** (manchmal bis zu 48 Stunden)
2. **Prüfe Status in Vercel:**
   - Settings → Domains
   - Status sollte von "Invalid Configuration" zu "Valid Configuration" wechseln
3. **Teste deine Domain:**
   - Öffne: https://gunapad.com
   - Öffne: https://www.gunapad.com
   - Beide sollten deine App zeigen!

**DNS Propagation prüfen:**
- Gehe zu: https://dnschecker.org
- Gib ein: `gunapad.com`
- Prüfe ob die DNS Änderungen weltweit sichtbar sind

---

### 🧪 STEP 5: Testen

**Nach erfolgreichem Deployment:**

1. **Öffne deine Vercel URL:**
   - https://gunapad-xxx.vercel.app (steht in Vercel Dashboard)
   - ODER https://gunapad.com (wenn DNS bereits propagated)

2. **Teste Story-Generierung:**
   - Füge 2 Kinder hinzu (z.B. "Max" und "Lena")
   - Fülle alle Felder aus
   - Klick: "Geschichte zaubern"

3. **Öffne Browser Console (F12):**
   - ✅ Sollte anzeigen: "Story logged successfully to Supabase"
   - ❌ Falls Fehler: Prüfe Environment Variables in Vercel

4. **Prüfe Supabase:**
   - Gehe zu: Supabase Dashboard
   - Table Editor → `gunapad_logs`
   - ✅ Neue Row sollte erscheinen mit anonymisierten Daten

---

### ✅ ERFOLGS-CHECKLISTE

Gehe diese Punkte durch:

- [ ] Code ist zu GitHub gepusht
- [ ] Vercel Projekt ist mit GitHub verbunden
- [ ] 3 Environment Variables in Vercel gesetzt:
  - [ ] VITE_GEMINI_API_KEY
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
- [ ] Deployment ist erfolgreich (Status: Ready)
- [ ] App ist erreichbar unter Vercel URL
- [ ] DNS Records für gunapad.com hinzugefügt
- [ ] Domain zeigt auf deine App
- [ ] Story-Generierung funktioniert
- [ ] Daten werden in Supabase geloggt

---

### 🚨 TROUBLESHOOTING

#### Problem: Build Failed
**Fehler:** "Module not found" oder ähnlich

**Lösung:**
1. Gehe zu: Vercel → Deployments → Klick auf failed deployment
2. Schau dir die Logs an
3. Meist: `npm install` hat ein Problem
4. Prüfe: package.json ist korrekt committed
5. Redeploy

#### Problem: Environment Variables nicht gefunden
**Fehler:** "API Key not found" oder "undefined"

**Lösung:**
1. Vercel → Settings → Environment Variables
2. Prüfe: Alle 3 Variables vorhanden?
3. Prüfe: Für Production, Preview, Development gesetzt?
4. Nach Änderung: **MUSS neu deployen!**
5. Gehe zu: Deployments → Redeploy

#### Problem: Domain funktioniert nicht
**Fehler:** "DNS_PROBE_FINISHED_NXDOMAIN" oder ähnlich

**Lösung:**
1. Prüfe DNS Settings bei deinem Domain Provider
2. Warte länger (DNS kann bis 48h dauern)
3. Nutze https://dnschecker.org zur Prüfung
4. Stelle sicher beide Records (A und CNAME) hinzugefügt sind

#### Problem: App lädt, aber Story-Generierung funktioniert nicht
**Fehler:** Console zeigt API Errors

**Lösung:**
1. F12 → Console → Schau dir den genauen Fehler an
2. Prüfe Environment Variables in Vercel
3. Prüfe: API Keys sind korrekt und gültig
4. Teste lokal mit `npm run dev` - funktioniert es dort?

---

### 📊 WELCHER DOMAIN PROVIDER?

**Wo hast du gunapad.com gekauft?**

- **Namecheap:** Advanced DNS → Add New Record
- **GoDaddy:** DNS Management → Add Record
- **Cloudflare:** DNS → Add Record
- **Google Domains:** DNS → Custom Records
- **Other:** Suche nach "DNS Management" oder "DNS Settings"

---

### 🎯 NÄCHSTE SCHRITTE

1. **[ ] Pushe Code zu GitHub** (falls noch nicht geschehen)
2. **[ ] Setze Environment Variables in Vercel**
3. **[ ] Warte auf Deployment (2-3 min)**
4. **[ ] Teste die Vercel URL**
5. **[ ] Füge DNS Records hinzu**
6. **[ ] Warte auf DNS Propagation (5-30 min)**
7. **[ ] Teste gunapad.com**
8. **[ ] Fertig! 🎉**

---

## 📞 HILFE BENÖTIGT?

**Sag mir Bescheid bei:**
- Build Fehlern (schick mir die Logs)
- Domain Provider Problemen (welcher Provider?)
- API Errors (schick mir Console Fehler)

**Ich helfe dir durch jeden Schritt! 🚀**
