# Vercel Deployment Guide

## Prerequisites

1. **GitHub Repository** ✅ Already set up
2. **Vercel Account** - Sign up at https://vercel.com
3. **MongoDB Atlas** ✅ Already configured

---

## Step-by-Step Deployment

### Step 1: Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" or "Log In"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub repositories

### Step 2: Create a New Project

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your repository: `itzenoughabhi/pradeep-portfolio`
4. Select the repository and click "Import"

### Step 3: Configure Environment Variables

1. In the "Configure Project" screen, you'll see "Environment Variables"
2. Add the following variables:

   **Variable Name:** `MONGO_URI`
   **Value:** `mongodb+srv://abhishek1432h_db_user:ACA9bhBYwa94lZne@cluster0.fmnyr6j.mongodb.net/test?appName=Cluster0`
   
   **Variable Name:** `JWT_SECRET`
   **Value:** `your_jwt_secret_key_here` (or use default)
   
   **Variable Name:** `PORT`
   **Value:** `3000`

   **Variable Name:** `BLOB_READ_WRITE_TOKEN`
   **Value:** `vercel_blob_rw_EIRQQruK7B7wvPXl_hTFAD0jtxTzn0Aa6GNS17Nb3IWTJbU`

   **Variable Name:** `BLOB_STORE_ID`
   **Value:** `store_EIRQQruK7B7wvPXl`

3. Click "Add" for each variable
4. Click "Deploy"

### Step 4: Wait for Deployment

- Vercel will automatically build and deploy your project
- Once done, you'll see a success message with your deployment URL
- Example: `https://pradeep-portfolio.vercel.app`

---

## Vercel Configuration

The `vercel.json` file has been configured with:

```json
{
  "version": 2,
  "buildCommand": "cd admin && npm install",
  "devCommand": "cd admin && node server.js",
  "env": {
    "MONGO_URI": "@mongo_uri",
    "JWT_SECRET": "@jwt_secret"
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/admin/server.js"
    },
    {
      "source": "/(.*)",
      "destination": "/frontend/$1"
    }
  ]
}
```

---

## Project Structure for Vercel

```
pradeep-portfolio/
├── frontend/              # Static frontend files
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   └── styles/
├── admin/                 # Backend (Node.js/Express)
│   ├── server.js
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── node_modules/
├── vercel.json           # Vercel configuration
└── .env                  # Environment variables
```

---

## Post-Deployment Checklist

After deployment, verify everything works:

1. **Frontend Loads**
   - Visit: `https://your-domain.vercel.app`
   - Check if portfolio page loads correctly

2. **Register Admin**
   - Visit: `https://your-domain.vercel.app/register.html`
   - Create your admin account

3. **Login**
   - Visit: `https://your-domain.vercel.app/login.html`
   - Log in with your credentials

4. **Dashboard Access**
   - Visit: `https://your-domain.vercel.app/dashboard.html`
   - Verify all features work

5. **API Endpoints Test**
   - Try: `https://your-domain.vercel.app/api/services`
   - Should return list of services (or empty array if none added)

---

## Troubleshooting

### Issue: "Cannot find module 'express'"
**Solution:** Ensure `admin/package.json` is properly configured and dependencies are listed.

### Issue: "MongoDB connection failed"
**Solution:** 
1. Check `MONGO_URI` environment variable is correct
2. Whitelist Vercel's IP ranges in MongoDB Atlas:
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (allows all IPs)
   - Or add specific Vercel IPs

### Issue: "Cannot GET /dashboard.html"
**Solution:**
1. Ensure `frontend/dashboard.html` exists
2. Check `vercel.json` rewrites are correct
3. Redeploy with: `git push` (will auto-redeploy)

### Issue: Static files not loading
**Solution:**
1. Ensure CSS/JS files use correct paths
2. Update paths in HTML files to use absolute paths from root

---

## Making Changes After Deployment

### To Update Your Project:

1. Make changes locally in `d:\portfolio`
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```
3. Vercel will automatically detect changes and redeploy
4. Deployment will be complete in 1-2 minutes

---

## Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `yourname.com`)
4. Follow DNS configuration steps provided by Vercel

---

## Monitor Deployments

- Dashboard: https://vercel.com/dashboard
- View logs: Click on deployment → "View Function Logs"
- See errors: Check "Error" tab in dashboard

---

## API Base URLs

### Local Development:
```
https://pradeep-portfolio-liart-xi.vercel.app//api/...
```

### After Vercel Deployment:
```
https://your-domain.vercel.app/api/...
```

Update frontend API calls to use the new URL after deployment!

---

## Important Notes

⚠️ **Security:**
- Never commit `.env` file to GitHub
- Use Vercel's environment variables for sensitive data
- Keep MongoDB credentials secure

✅ **Best Practices:**
- Test locally before pushing
- Use meaningful commit messages
- Monitor Vercel logs for errors
- Keep dependencies updated

---

## Next Steps

1. ✅ Push code to GitHub (already done)
2. ⏭️ Set up Vercel project (following steps above)
3. Configure environment variables in Vercel
4. Deploy and test
5. Update API endpoints in frontend if needed
