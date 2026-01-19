# Rename Instructions: wireless-modulation-sim → digital-modulation-sim

All code changes are complete. Follow these manual steps:

## 1. Rename Local Folder
Close this terminal/session first, then:
```
cd C:\Users\bhask\claude\ee597-demos\modulation
ren wireless-modulation-sim digital-modulation-sim
```

## 2. Rename GitHub Repository
1. Go to https://github.com/ANRGUSC/wireless-modulation-sim
2. Click **Settings** (gear icon)
3. Under "Repository name", change to `digital-modulation-sim`
4. Click **Rename**

## 3. Update Git Remote URL
After renaming on GitHub, update your local remote:
```
cd C:\Users\bhask\claude\ee597-demos\modulation\digital-modulation-sim
git remote set-url origin https://github.com/ANRGUSC/digital-modulation-sim.git
```

## 4. Rename Vercel Project
1. Go to https://vercel.com/dashboard
2. Find the `wireless-modulation-sim` project
3. Click **Settings** → **General**
4. Change project name to `digital-modulation-sim`
5. Under **Domains**, add `digital-modulation-sim.vercel.app` and remove the old one

## 5. Push Changes
```
git add -A
git commit -m "Rename project from wireless-modulation-sim to digital-modulation-sim"
git push
```

The live demo will then be at: **https://digital-modulation-sim.vercel.app**

---
Delete this file after completing the rename.
